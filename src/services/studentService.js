import { query, withTransaction } from "../db/index.js";
import { newId } from "../db/ids.js";
import { createHttpError } from "../utils/httpError.js";
import { requireFields } from "../utils/validators.js";
import { mapRows, toCamelCaseRow } from "../utils/mappers.js";
import { assignClassFeesToStudent } from "./feeService.js";

const studentCategories = ["GENERAL", "OBC", "SC", "ST", "EWS", "MINORITY"];
const studentGenders = ["MALE", "FEMALE", "OTHER"];
const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getAcademicYearStart(academicYear) {
  const match = String(academicYear || "").match(/^(\d{4})/);
  return match ? Number(match[1]) : null;
}

function canIgnoreClassFeeAssignmentError(error) {
  const message = String(error?.message || "");
  return (
    (error?.status === 404 || error?.statusCode === 404) &&
    message.includes("No active fee structures found for the student's class.")
  );
}

function getNextAcademicYearLabel(academicYear) {
  const value = String(academicYear || "").trim();
  const match = value.match(/^(\d{4})(?:\s*-\s*(\d{2,4}))?$/);

  if (!match) {
    const currentYear = new Date().getFullYear();
    return `${currentYear}-${currentYear + 1}`;
  }

  const startYear = Number(match[1]);
  const endToken = match[2];

  if (!endToken) {
    return `${startYear + 1}`;
  }

  const endYear =
    endToken.length === 2
      ? Number(`${String(startYear).slice(0, 2)}${endToken}`)
      : Number(endToken);
  const nextStartYear = startYear + 1;
  const nextEndYear = endYear + 1;

  return endToken.length === 2
    ? `${nextStartYear}-${String(nextEndYear).slice(-2)}`
    : `${nextStartYear}-${nextEndYear}`;
}

function normalizeValue(value) {
  return typeof value === "string" ? value.trim() : value;
}

function validateOptionalName(value, fieldLabel) {
  if (!value) {
    return;
  }

  if (!/^[A-Za-z][A-Za-z\s.'-]{1,}$/.test(value)) {
    throw createHttpError(400, `${fieldLabel} is invalid.`);
  }
}

function validateStudentPayload(payload, currentStudent = null) {
  const admissionNumber = normalizeValue(payload.admissionNumber ?? currentStudent?.admissionNumber ?? "");
  const category = normalizeValue(payload.category ?? currentStudent?.category ?? "");
  const gender = normalizeValue(payload.gender ?? currentStudent?.gender ?? "");
  const academicYear = normalizeValue(payload.academicYear ?? currentStudent?.academicYear ?? "");
  const firstName = normalizeValue(payload.firstName ?? currentStudent?.firstName ?? "");
  const lastName = normalizeValue(payload.lastName ?? currentStudent?.lastName ?? "");
  const motherName = normalizeValue(payload.motherName ?? currentStudent?.motherName ?? "");
  const fatherName = normalizeValue(payload.fatherName ?? currentStudent?.fatherName ?? "");
  const aadhaarNumber = normalizeValue(payload.aadhaarNumber ?? currentStudent?.aadhaarNumber ?? "");
  const email = normalizeValue(payload.email ?? currentStudent?.email ?? "");
  const phone = normalizeValue(payload.phone ?? currentStudent?.phone ?? "");
  const dob = normalizeValue(payload.dob ?? currentStudent?.dob ?? "");

  if (!admissionNumber) {
    throw createHttpError(400, "Admission number is required.");
  }

  if (!firstName || firstName.length < 2) {
    throw createHttpError(400, "Student name is required.");
  }

  validateOptionalName(firstName, "First name");
  validateOptionalName(lastName, "Last name");
  validateOptionalName(motherName, "Mother name");
  validateOptionalName(fatherName, "Father name");

  if (category && !studentCategories.includes(category)) {
    throw createHttpError(400, "Category is invalid.");
  }
  if (gender && !studentGenders.includes(gender)) {
    throw createHttpError(400, "Gender is invalid.");
  }
  if (academicYear && academicYear.length < 4) {
    throw createHttpError(400, "Academic year is invalid.");
  }

  if (aadhaarNumber && !/^\d{12}$/.test(aadhaarNumber)) {
    throw createHttpError(400, "Aadhaar number must be exactly 12 digits.");
  }

  if (phone && !/^\d{10}$/.test(phone)) {
    throw createHttpError(400, "Phone number must be exactly 10 digits.");
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createHttpError(400, "Email address is invalid.");
  }

  if (dob) {
    const parsedDob = new Date(dob);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (Number.isNaN(parsedDob.getTime()) || parsedDob > today) {
      throw createHttpError(400, "Date of birth cannot be in the future.");
    }
  }
}

function validateFeeItems(feeItems) {
  if (feeItems === undefined || feeItems === null) {
    return [];
  }

  if (!Array.isArray(feeItems)) {
    throw createHttpError(400, "feeItems must be an array.");
  }

  return feeItems
    .map((item) => ({
      feeInvoiceId: normalizeValue(item?.feeInvoiceId ?? ""),
      feeStructureId: normalizeValue(item?.feeStructureId ?? ""),
      name: normalizeValue(item?.name ?? ""),
      frequency: normalizeValue(item?.frequency ?? "ONE_TIME"),
      amount: Number(item?.amount),
      dueDate: normalizeValue(item?.dueDate ?? ""),
      monthNumber: Number(item?.monthNumber || 0),
      ledgerYear: Number(item?.ledgerYear || 0),
      notes: normalizeValue(item?.notes ?? "")
    }))
    .filter((item) => item.name || item.amount)
    .map((item, index) => {
      if (!item.name || item.name.length < 2) {
        throw createHttpError(400, `feeItems[${index}] name is required.`);
      }
      if (Number.isNaN(item.amount) || item.amount <= 0) {
        throw createHttpError(400, `feeItems[${index}] amount must be greater than zero.`);
      }
      if (!["ONE_TIME", "MONTHLY"].includes(item.frequency)) {
        throw createHttpError(400, `feeItems[${index}] frequency is invalid.`);
      }
      if (item.frequency === "MONTHLY") {
        if (Number.isNaN(item.monthNumber) || item.monthNumber < 1 || item.monthNumber > 12) {
          throw createHttpError(400, `feeItems[${index}] monthNumber must be between 1 and 12.`);
        }
        if (Number.isNaN(item.ledgerYear) || item.ledgerYear < 2000 || item.ledgerYear > 2100) {
          throw createHttpError(400, `feeItems[${index}] ledgerYear must be a valid year.`);
        }
      }

      if (item.dueDate) {
        const parsed = new Date(item.dueDate);
        if (Number.isNaN(parsed.getTime())) {
          throw createHttpError(400, `feeItems[${index}] dueDate is invalid.`);
        }
      }

      return item;
    });
}

async function assertInstitutionExists(institutionId, client = { query }) {
  const result = await client.query("SELECT id FROM institutions WHERE id = $1", [institutionId]);
  if (result.rowCount === 0) {
    throw createHttpError(404, "Institution not found.");
  }
}

async function assertClassBelongsToInstitution(classId, institutionId, client = { query }) {
  if (!classId) {
    return null;
  }

  const result = await client.query(
    "SELECT id, name, section FROM academic_classes WHERE id = $1 AND institution_id = $2",
    [classId, institutionId]
  );

  if (result.rowCount === 0) {
    throw createHttpError(404, "Class not found for this institution.");
  }

  return toCamelCaseRow(result.rows[0]);
}

export async function listStudents(filters = {}) {
  const clauses = [];
  const params = [];

  if (filters.institutionId) {
    params.push(filters.institutionId);
    clauses.push(`institution_id = $${params.length}`);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await query(
    `SELECT * FROM students ${whereClause} ORDER BY admission_number ASC, created_at ASC`,
    params
  );

  return mapRows(result.rows);
}

export async function getStudentById(studentId) {
  const result = await query("SELECT * FROM students WHERE id = $1", [studentId]);
  if (result.rowCount === 0) {
    throw createHttpError(404, "Student not found.");
  }
  return toCamelCaseRow(result.rows[0]);
}

async function generateReceiptNumber(client) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    const receiptNumber = `REC-${datePart}-${randomPart}`;
    const existingResult = await client.query("SELECT id FROM fee_invoices WHERE receipt_number = $1", [receiptNumber]);

    if (existingResult.rowCount === 0) {
      return receiptNumber;
    }
  }

  throw createHttpError(500, "Unable to generate a unique receipt number.");
}

function getMonthlyPeriodsTillDate(startYear, startMonth, referenceDate = new Date()) {
  const validYear = Number(startYear);
  const validMonth = Number(startMonth);
  if (Number.isNaN(validYear) || Number.isNaN(validMonth) || validMonth < 1 || validMonth > 12) {
    return [];
  }

  const periods = [];
  const start = new Date(validYear, validMonth - 1, 1);
  const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);

  if (start > end) {
    return [{ ledgerYear: validYear, monthNumber: validMonth }];
  }

  let cursorYear = validYear;
  let cursorMonth = validMonth;
  while (cursorYear < end.getFullYear() || (cursorYear === end.getFullYear() && cursorMonth <= end.getMonth() + 1)) {
    periods.push({
      ledgerYear: cursorYear,
      monthNumber: cursorMonth
    });

    if (cursorMonth === 12) {
      cursorMonth = 1;
      cursorYear += 1;
    } else {
      cursorMonth += 1;
    }
  }

  return periods;
}

async function createInitialFeeInvoices(student, feeItems, client) {
  for (const item of feeItems) {
    const periods =
      item.frequency === "MONTHLY"
        ? getMonthlyPeriodsTillDate(item.ledgerYear, item.monthNumber)
        : [{ ledgerYear: null, monthNumber: null }];

    for (const period of periods) {
      if (item.frequency === "MONTHLY") {
        const existingResult = await client.query(
          `
            SELECT id
            FROM fee_invoices
            WHERE student_id = $1
              AND (
                (fee_structure_id = $2)
                OR (fee_structure_id IS NULL AND $2 IS NULL AND title = $3)
              )
              AND ledger_year = $4
              AND month_number = $5
            LIMIT 1
          `,
          [
            student.id,
            item.feeStructureId || null,
            `${item.name} - ${monthLabels[period.monthNumber - 1]} ${period.ledgerYear}`,
            period.ledgerYear,
            period.monthNumber
          ]
        );

        if (existingResult.rowCount > 0) {
          continue;
        }
      }

      const invoiceId = newId();
      const receiptNumber = await generateReceiptNumber(client);
      const title =
        item.frequency === "MONTHLY"
          ? `${item.name} - ${monthLabels[period.monthNumber - 1]} ${period.ledgerYear}`
          : item.name;

      await client.query(
        `
          INSERT INTO fee_invoices (
            id,
            receipt_number,
            institution_id,
            student_id,
            fee_structure_id,
            ledger_year,
            month_number,
            title,
            gross_amount,
            discount_amount,
            net_amount,
            due_date,
            status,
            notes
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, $9, $10, 'PENDING', $11)
        `,
        [
          invoiceId,
          receiptNumber,
          student.institutionId,
          student.id,
          item.feeStructureId || null,
          item.frequency === "MONTHLY" ? period.ledgerYear : null,
          item.frequency === "MONTHLY" ? period.monthNumber : null,
          title,
          item.amount,
          item.dueDate || null,
          item.notes || null
        ]
      );
    }
  }
}

async function upsertStudentFeeInvoices(student, feeItems, client) {
  const retainedInvoiceIds = new Set(
    feeItems.map((item) => item.feeInvoiceId).filter(Boolean)
  );

  const editableInvoicesResult = await client.query(
    `
      SELECT
        fi.id,
        fi.status,
        COALESCE(payments.total_paid, 0) AS total_paid
      FROM fee_invoices fi
      LEFT JOIN (
        SELECT fee_invoice_id, SUM(amount) AS total_paid
        FROM fee_payments
        GROUP BY fee_invoice_id
      ) payments ON payments.fee_invoice_id = fi.id
      WHERE fi.student_id = $1
        AND fi.status IN ('PENDING', 'PARTIALLY_PAID')
    `,
    [student.id]
  );

  for (const row of editableInvoicesResult.rows) {
    const invoice = toCamelCaseRow(row);
    if (retainedInvoiceIds.has(invoice.id)) {
      continue;
    }

    if (Number(invoice.totalPaid) > 0) {
      continue;
    }

    await client.query("DELETE FROM fee_invoices WHERE id = $1", [invoice.id]);
  }

  for (const item of feeItems) {
    const title =
      item.frequency === "MONTHLY"
        ? `${item.name} - ${monthLabels[item.monthNumber - 1]} ${item.ledgerYear}`
        : item.name;

    if (item.feeInvoiceId) {
      const invoiceResult = await client.query(
        `
          SELECT id, status
          FROM fee_invoices
          WHERE id = $1
            AND student_id = $2
        `,
        [item.feeInvoiceId, student.id]
      );

      if (invoiceResult.rowCount === 0) {
        continue;
      }

      const currentInvoice = toCamelCaseRow(invoiceResult.rows[0]);
      if (!["PENDING", "PARTIALLY_PAID"].includes(currentInvoice.status || "")) {
        continue;
      }

      await client.query(
        `
          UPDATE fee_invoices
          SET
            title = $2,
            gross_amount = $3,
            discount_amount = 0,
            net_amount = $3,
            ledger_year = $4,
            month_number = $5,
            due_date = $6,
            notes = $7,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [
          item.feeInvoiceId,
          title,
          item.amount,
          item.frequency === "MONTHLY" ? item.ledgerYear : null,
          item.frequency === "MONTHLY" ? item.monthNumber : null,
          item.dueDate || null,
          item.notes || null
        ]
      );

      continue;
    }

    const periods =
      item.frequency === "MONTHLY"
        ? getMonthlyPeriodsTillDate(item.ledgerYear, item.monthNumber)
        : [{ ledgerYear: null, monthNumber: null }];

    for (const period of periods) {
      const periodTitle =
        item.frequency === "MONTHLY"
          ? `${item.name} - ${monthLabels[period.monthNumber - 1]} ${period.ledgerYear}`
          : title;

      const existingMonthlyInvoiceResult = await client.query(
        `
          SELECT id
          FROM fee_invoices
          WHERE student_id = $1
            AND (
              (fee_structure_id = $2)
              OR (fee_structure_id IS NULL AND $2 IS NULL AND title = $3)
            )
            AND (
              ($4 IS NULL AND ledger_year IS NULL)
              OR ledger_year = $4
            )
            AND (
              ($5 IS NULL AND month_number IS NULL)
              OR month_number = $5
            )
          LIMIT 1
        `,
        [
          student.id,
          item.feeStructureId || null,
          periodTitle,
          item.frequency === "MONTHLY" ? period.ledgerYear : null,
          item.frequency === "MONTHLY" ? period.monthNumber : null
        ]
      );

      if (existingMonthlyInvoiceResult.rowCount > 0) {
        const existingId = existingMonthlyInvoiceResult.rows[0].id;
        await client.query(
          `
            UPDATE fee_invoices
            SET
              title = $2,
              gross_amount = $3,
              discount_amount = 0,
              net_amount = $3,
              due_date = $4,
              notes = $5,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `,
          [existingId, periodTitle, item.amount, item.dueDate || null, item.notes || null]
        );
        continue;
      }

      const invoiceId = newId();
      const receiptNumber = await generateReceiptNumber(client);

      await client.query(
        `
          INSERT INTO fee_invoices (
            id,
            receipt_number,
            institution_id,
            student_id,
            fee_structure_id,
            ledger_year,
            month_number,
            title,
            gross_amount,
            discount_amount,
            net_amount,
            due_date,
            status,
            notes
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, $9, $10, 'PENDING', $11)
        `,
        [
          invoiceId,
          receiptNumber,
          student.institutionId,
          student.id,
          item.feeStructureId || null,
          item.frequency === "MONTHLY" ? period.ledgerYear : null,
          item.frequency === "MONTHLY" ? period.monthNumber : null,
          periodTitle,
          item.amount,
          item.dueDate || null,
          item.notes || null
        ]
      );
    }
  }
}

export async function createStudent(payload) {
  requireFields(payload, ["institutionId", "firstName", "admissionNumber"]);
  validateStudentPayload(payload);
  const feeItems = validateFeeItems(payload.feeItems);

  return withTransaction(async (client) => {
    await assertInstitutionExists(payload.institutionId, client);
    const academicClass = await assertClassBelongsToInstitution(
      payload.classId,
      payload.institutionId,
      client
    );
    const studentId = newId();

    await client.query(
      `
        INSERT INTO students (
          id,
          institution_id,
          admission_number,
          category,
          gender,
          academic_year,
          first_name,
          last_name,
          mother_name,
          father_name,
          aadhaar_number,
          email,
          phone,
          address,
          dob,
          course,
          class_name,
          class_id,
          section,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      `,
      [
        studentId,
        payload.institutionId,
        payload.admissionNumber.trim(),
        payload.category?.trim() || null,
        payload.gender?.trim() || null,
        payload.academicYear?.trim() || null,
        payload.firstName.trim(),
        payload.lastName?.trim() || "",
        payload.motherName?.trim() || null,
        payload.fatherName?.trim() || null,
        payload.aadhaarNumber?.trim() || null,
        payload.email?.trim() || null,
        payload.phone?.trim() || null,
        payload.address?.trim() || null,
        payload.dob || null,
        payload.course?.trim() || null,
        academicClass?.name || null,
        payload.classId || null,
        academicClass?.section || null,
        payload.status?.trim() || "ACTIVE"
      ]
    );

    if (feeItems.length > 0) {
      await createInitialFeeInvoices(
        {
          id: studentId,
          institutionId: payload.institutionId
        },
        feeItems,
        client
      );
    }

    if (payload.classId) {
      try {
        await assignClassFeesToStudent(
          {
            studentId,
            sessionYearOverride: getAcademicYearStart(payload.academicYear)
          },
          client
        );
      } catch (error) {
        if (!canIgnoreClassFeeAssignmentError(error)) {
          throw error;
        }
      }
    }

    const studentResult = await client.query("SELECT * FROM students WHERE id = $1", [studentId]);
    return toCamelCaseRow(studentResult.rows[0]);
  });
}

export async function updateStudent(studentId, payload) {
  const feeItems = validateFeeItems(payload.feeItems);

  return withTransaction(async (client) => {
    const currentStudentResult = await client.query("SELECT * FROM students WHERE id = $1", [studentId]);
    if (currentStudentResult.rowCount === 0) {
      throw createHttpError(404, "Student not found.");
    }

    const currentStudent = toCamelCaseRow(currentStudentResult.rows[0]);
    validateStudentPayload(payload, currentStudent);
    const nextInstitutionId = payload.institutionId ?? currentStudent.institutionId;
    await assertInstitutionExists(nextInstitutionId, client);
    const nextClassId = payload.classId !== undefined ? payload.classId || null : currentStudent.classId;
    const academicClass = await assertClassBelongsToInstitution(nextClassId, nextInstitutionId, client);

    await client.query(
      `
        UPDATE students
        SET
          institution_id = $2,
          admission_number = $3,
          category = $4,
          gender = $5,
          academic_year = $6,
          first_name = $7,
          last_name = $8,
          mother_name = $9,
          father_name = $10,
          aadhaar_number = $11,
          email = $12,
          phone = $13,
          address = $14,
          dob = $15,
          course = $16,
          class_name = $17,
          class_id = $18,
          section = $19,
          status = $20,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [
        studentId,
        nextInstitutionId,
        payload.admissionNumber?.trim() ?? currentStudent.admissionNumber,
        payload.category?.trim() ?? currentStudent.category,
        payload.gender?.trim() ?? currentStudent.gender,
        payload.academicYear?.trim() ?? currentStudent.academicYear,
        payload.firstName?.trim() ?? currentStudent.firstName,
        payload.lastName?.trim() ?? currentStudent.lastName ?? "",
        payload.motherName?.trim() ?? currentStudent.motherName,
        payload.fatherName?.trim() ?? currentStudent.fatherName,
        payload.aadhaarNumber?.trim() ?? currentStudent.aadhaarNumber,
        payload.email?.trim() ?? currentStudent.email,
        payload.phone?.trim() ?? currentStudent.phone,
        payload.address?.trim() ?? currentStudent.address,
        payload.dob !== undefined ? payload.dob || null : currentStudent.dob,
        payload.course?.trim() ?? currentStudent.course,
        nextClassId ? academicClass?.name || null : null,
        nextClassId,
        nextClassId ? academicClass?.section || null : null,
        payload.status?.trim() ?? currentStudent.status
      ]
    );

    if (feeItems.length > 0) {
      await upsertStudentFeeInvoices(
        {
          id: studentId,
          institutionId: nextInstitutionId
        },
        feeItems,
        client
      );
    }

    if (nextClassId) {
      try {
        await assignClassFeesToStudent(
          {
            studentId,
            sessionYearOverride: getAcademicYearStart(
              payload.academicYear?.trim() ?? currentStudent.academicYear
            )
          },
          client
        );
      } catch (error) {
        if (!canIgnoreClassFeeAssignmentError(error)) {
          throw error;
        }
      }
    }

    const updatedStudentResult = await client.query("SELECT * FROM students WHERE id = $1", [studentId]);
    return toCamelCaseRow(updatedStudentResult.rows[0]);
  });
}

export async function deleteStudent(studentId) {
  await getStudentById(studentId);
  await query("DELETE FROM students WHERE id = $1", [studentId]);
}

export async function promoteStudents(payload) {
  const studentIds = Array.isArray(payload?.studentIds)
    ? payload.studentIds.map((studentId) => normalizeValue(studentId)).filter(Boolean)
    : [];
  const targetClassId = normalizeValue(payload?.targetClassId ?? "");
  const academicYear = normalizeValue(payload?.academicYear ?? "");
  const assignClassFees = payload?.assignClassFees !== false;

  if (studentIds.length === 0) {
    throw createHttpError(400, "Select at least one student to promote.");
  }

  if (!targetClassId) {
    throw createHttpError(400, "Target class is required.");
  }

  const uniqueStudentIds = Array.from(new Set(studentIds));

  return withTransaction(async (client) => {
    const targetClassResult = await client.query(
      `
        SELECT id, institution_id, name, section, academic_year
        FROM academic_classes
        WHERE id = $1
      `,
      [targetClassId]
    );

    if (targetClassResult.rowCount === 0) {
      throw createHttpError(404, "Target class not found.");
    }

    const targetClass = toCamelCaseRow(targetClassResult.rows[0]);
    const studentIdPlaceholders = uniqueStudentIds.map((_, index) => `$${index + 1}`).join(", ");
    const studentsResult = await client.query(
      `
        SELECT *
        FROM students
        WHERE id IN (${studentIdPlaceholders})
        ORDER BY admission_number ASC, created_at ASC
      `,
      uniqueStudentIds
    );

    if (studentsResult.rowCount !== uniqueStudentIds.length) {
      throw createHttpError(404, "One or more selected students were not found.");
    }

    const students = mapRows(studentsResult.rows);
    const institutionIds = new Set(students.map((student) => student.institutionId));

    if (institutionIds.size !== 1 || !institutionIds.has(targetClass.institutionId)) {
      throw createHttpError(400, "Students can only be promoted to a class in the same institution.");
    }

    const promotedStudents = [];
    let feeInvoicesCreated = 0;

    for (const student of students) {
      const nextAcademicYear = academicYear || targetClass.academicYear || getNextAcademicYearLabel(student.academicYear);

      await client.query(
        `
          UPDATE students
          SET
            academic_year = $2,
            class_name = $3,
            class_id = $4,
            section = $5,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [
          student.id,
          nextAcademicYear,
          targetClass.name,
          targetClass.id,
          targetClass.section || null
        ]
      );

      if (assignClassFees) {
        try {
          const feeAssignment = await assignClassFeesToStudent(
            {
              studentId: student.id,
              sessionYearOverride: getAcademicYearStart(nextAcademicYear)
            },
            client
          );
          feeInvoicesCreated += feeAssignment.createdCount;
        } catch (error) {
          if (!canIgnoreClassFeeAssignmentError(error)) {
            throw error;
          }
        }
      }

      const updatedStudentResult = await client.query("SELECT * FROM students WHERE id = $1", [student.id]);
      promotedStudents.push(toCamelCaseRow(updatedStudentResult.rows[0]));
    }

    return {
      promotedCount: promotedStudents.length,
      feeInvoicesCreated,
      students: promotedStudents,
      targetClass
    };
  });
}
