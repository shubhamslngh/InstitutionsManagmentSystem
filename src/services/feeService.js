import { query, withTransaction } from "../db/index.js";
import { newId } from "../db/ids.js";
import { createHttpError } from "../utils/httpError.js";
import { requireFields, requirePositiveAmount } from "../utils/validators.js";
import { mapRows, toCamelCaseRow } from "../utils/mappers.js";

const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

async function findStudent(studentId, client = { query }) {
  const result = await client.query(
    `
      SELECT
        s.*,
        i.name AS institution_name,
        i.type AS institution_type,
        c.name AS academic_class_name,
        c.section AS academic_class_section
      FROM students s
      JOIN institutions i ON i.id = s.institution_id
      LEFT JOIN academic_classes c ON c.id = s.class_id
      WHERE s.id = $1
    `,
    [studentId]
  );

  if (result.rowCount === 0) {
    throw createHttpError(404, "Student not found.");
  }

  return toCamelCaseRow(result.rows[0]);
}

async function getFeeInvoiceById(feeInvoiceId, client = { query }) {
  const result = await client.query(
    `
      SELECT
        fi.*,
        COALESCE(payments.total_paid, 0) AS total_paid,
        fi.net_amount - COALESCE(payments.total_paid, 0) AS balance
      FROM fee_invoices fi
      LEFT JOIN (
        SELECT fee_invoice_id, SUM(amount) AS total_paid
        FROM fee_payments
        GROUP BY fee_invoice_id
      ) payments ON payments.fee_invoice_id = fi.id
      WHERE fi.id = $1
    `,
    [feeInvoiceId]
  );

  if (result.rowCount === 0) {
    throw createHttpError(404, "Fee invoice not found.");
  }

  const invoice = toCamelCaseRow(result.rows[0]);
  return {
    ...invoice,
    status:
      Number(invoice.balance) <= 0
        ? "PAID"
        : Number(invoice.totalPaid) > 0
          ? "PARTIALLY_PAID"
          : invoice.status
  };
}

export async function createFeeStructure(payload) {
  requireFields(payload, ["institutionId", "name", "amount"]);
  requirePositiveAmount(payload.amount, "amount");
  const feeStructureId = newId();

  const institutionResult = await query("SELECT id FROM institutions WHERE id = $1", [
    payload.institutionId
  ]);

  if (institutionResult.rowCount === 0) {
    throw createHttpError(404, "Institution not found.");
  }

  if (payload.classId) {
    const classResult = await query(
      "SELECT id FROM academic_classes WHERE id = $1 AND institution_id = $2",
      [payload.classId, payload.institutionId]
    );

    if (classResult.rowCount === 0) {
      throw createHttpError(404, "Class not found for this institution.");
    }
  }

  await query(
    `
      INSERT INTO fee_structures (
        id,
        institution_id,
        class_id,
        name,
        amount,
        frequency,
        applicable_for,
        due_day_of_month,
        is_active,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `,
    [
      feeStructureId,
      payload.institutionId,
      payload.classId || null,
      payload.name.trim(),
      payload.amount,
      payload.frequency?.trim() || "ONE_TIME",
      payload.applicableFor?.trim() || "ALL",
      payload.dueDayOfMonth || null,
      payload.isActive ?? true,
      payload.notes?.trim() || null
    ]
  );

  return getFeeStructureById(feeStructureId);
}

export async function listFeeStructures(filters = {}) {
  const clauses = [];
  const params = [];

  if (filters.institutionId) {
    params.push(filters.institutionId);
    clauses.push(`institution_id = $${params.length}`);
  }

  if (filters.classId) {
    params.push(filters.classId);
    clauses.push(`class_id = $${params.length}`);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await query(
    `SELECT * FROM fee_structures ${whereClause} ORDER BY created_at DESC`,
    params
  );

  return mapRows(result.rows);
}

export async function getFeeStructureById(feeStructureId) {
  const result = await query("SELECT * FROM fee_structures WHERE id = $1", [feeStructureId]);
  if (result.rowCount === 0) {
    throw createHttpError(404, "Fee structure not found.");
  }
  return toCamelCaseRow(result.rows[0]);
}

export async function updateFeeStructure(feeStructureId, payload) {
  const currentStructure = await getFeeStructureById(feeStructureId);
  const amount = payload.amount !== undefined ? Number(payload.amount) : Number(currentStructure.amount);
  requirePositiveAmount(amount, "amount");
  const institutionId = payload.institutionId ?? currentStructure.institutionId;

  const institutionResult = await query("SELECT id FROM institutions WHERE id = $1", [institutionId]);
  if (institutionResult.rowCount === 0) {
    throw createHttpError(404, "Institution not found.");
  }
  const classId = payload.classId !== undefined ? payload.classId || null : currentStructure.classId;
  if (classId) {
    const classResult = await query(
      "SELECT id FROM academic_classes WHERE id = $1 AND institution_id = $2",
      [classId, institutionId]
    );
    if (classResult.rowCount === 0) {
      throw createHttpError(404, "Class not found for this institution.");
    }
  }

  await query(
    `
      UPDATE fee_structures
      SET
        institution_id = $2,
        class_id = $3,
        name = $4,
        amount = $5,
        frequency = $6,
        applicable_for = $7,
        due_day_of_month = $8,
        is_active = $9,
        notes = $10,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
    [
      feeStructureId,
      institutionId,
      classId,
      payload.name?.trim() ?? currentStructure.name,
      amount,
      payload.frequency?.trim() ?? currentStructure.frequency,
      payload.applicableFor?.trim() ?? currentStructure.applicableFor,
      payload.dueDayOfMonth !== undefined
        ? payload.dueDayOfMonth || null
        : currentStructure.dueDayOfMonth,
      payload.isActive ?? currentStructure.isActive,
      payload.notes?.trim() ?? currentStructure.notes
    ]
  );

  return getFeeStructureById(feeStructureId);
}

export async function deleteFeeStructure(feeStructureId) {
  await getFeeStructureById(feeStructureId);
  await query("DELETE FROM fee_structures WHERE id = $1", [feeStructureId]);
}

async function createFeeInvoiceWithClient(payload, client) {
  requireFields(payload, ["studentId", "title", "grossAmount"]);
  requirePositiveAmount(payload.grossAmount, "grossAmount");
  const feeInvoiceId = newId();

  const discountAmount = Number(payload.discountAmount || 0);
  if (discountAmount < 0) {
    throw createHttpError(400, "discountAmount cannot be negative.");
  }

  const student = await findStudent(payload.studentId, client);
  const netAmount = Number(payload.grossAmount) - discountAmount;

  if (netAmount <= 0) {
    throw createHttpError(400, "Net amount must be greater than zero.");
  }

  await client.query(
    `
      INSERT INTO fee_invoices (
        id,
        institution_id,
        student_id,
        fee_structure_id,
        title,
        gross_amount,
        discount_amount,
        net_amount,
        due_date,
        status,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING', $10)
    `,
    [
      feeInvoiceId,
      student.institutionId,
      student.id,
      payload.feeStructureId || null,
      payload.title.trim(),
      payload.grossAmount,
      discountAmount,
      netAmount,
      payload.dueDate || null,
      payload.notes?.trim() || null
    ]
  );

  return getFeeInvoiceById(feeInvoiceId, client);
}

export async function updateFeeInvoice(feeInvoiceId, payload) {
  return withTransaction(async (client) => {
    const currentInvoice = await getFeeInvoiceById(feeInvoiceId, client);
    const grossAmount =
      payload.grossAmount !== undefined ? Number(payload.grossAmount) : Number(currentInvoice.grossAmount);
    const discountAmount =
      payload.discountAmount !== undefined
        ? Number(payload.discountAmount)
        : Number(currentInvoice.discountAmount);

    requirePositiveAmount(grossAmount, "grossAmount");
    if (discountAmount < 0) {
      throw createHttpError(400, "discountAmount cannot be negative.");
    }

    const totalPaid = Number(currentInvoice.totalPaid);
    const netAmount = grossAmount - discountAmount;
    if (netAmount <= 0) {
      throw createHttpError(400, "Net amount must be greater than zero.");
    }
    if (netAmount < totalPaid) {
      throw createHttpError(400, "Net amount cannot be lower than the amount already paid.");
    }

    await client.query(
      `
        UPDATE fee_invoices
        SET
          title = $2,
          gross_amount = $3,
          discount_amount = $4,
          net_amount = $5,
          due_date = $6,
          notes = $7,
          status = $8,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [
        feeInvoiceId,
        payload.title?.trim() ?? currentInvoice.title,
        grossAmount,
        discountAmount,
        netAmount,
        payload.dueDate !== undefined ? payload.dueDate || null : currentInvoice.dueDate,
        payload.notes?.trim() ?? currentInvoice.notes,
        payload.status?.trim() ?? currentInvoice.status
      ]
    );

    return getFeeInvoiceById(feeInvoiceId, client);
  });
}

export async function deleteFeeInvoice(feeInvoiceId) {
  await getFeeInvoiceById(feeInvoiceId);
  await query("DELETE FROM fee_invoices WHERE id = $1", [feeInvoiceId]);
}

export async function createFeeInvoice(payload) {
  return withTransaction(async (client) => createFeeInvoiceWithClient(payload, client));
}

export async function createFeeAssignment(payload) {
  return createFeeInvoice(payload);
}

export async function assignFeeStructureToStudent(payload) {
  requireFields(payload, ["studentId", "feeStructureId"]);

  return withTransaction(async (client) => {
    const student = await findStudent(payload.studentId, client);
    const structureResult = await client.query(
      "SELECT * FROM fee_structures WHERE id = $1 AND institution_id = $2",
      [payload.feeStructureId, student.institutionId]
    );

    if (structureResult.rowCount === 0) {
      throw createHttpError(404, "Fee structure not found for this institution.");
    }

    const structure = toCamelCaseRow(structureResult.rows[0]);
    if (structure.classId && structure.classId !== student.classId) {
      throw createHttpError(400, "Fee structure is not attached to the student's class.");
    }
    return createFeeInvoiceWithClient(
      {
        studentId: student.id,
        feeStructureId: structure.id,
        title: payload.title || structure.name,
        grossAmount: Number(structure.amount),
        discountAmount: Number(payload.discountAmount || 0),
        dueDate: payload.dueDate || null,
        notes: payload.notes || structure.notes
      },
      client
    );
  });
}

export async function assignClassFeesToStudent(payload) {
  requireFields(payload, ["studentId"]);

  return withTransaction(async (client) => {
    const student = await findStudent(payload.studentId, client);

    if (!student.classId) {
      throw createHttpError(400, "Student is not assigned to a class.");
    }

    const structuresResult = await client.query(
      `
        SELECT *
        FROM fee_structures
        WHERE institution_id = $1
          AND class_id = $2
          AND is_active = TRUE
        ORDER BY created_at ASC
      `,
      [student.institutionId, student.classId]
    );

    if (structuresResult.rowCount === 0) {
      throw createHttpError(404, "No fee structures found for the student's class.");
    }

    const createdInvoices = [];

    for (const row of structuresResult.rows) {
      const structure = toCamelCaseRow(row);
      const existingInvoiceResult = await client.query(
        `
          SELECT id
          FROM fee_invoices
          WHERE student_id = $1
            AND fee_structure_id = $2
            AND status IN ('PENDING', 'PARTIALLY_PAID')
        `,
        [student.id, structure.id]
      );

      if (existingInvoiceResult.rowCount > 0) {
        continue;
      }

      const invoice = await createFeeInvoiceWithClient(
        {
          studentId: student.id,
          feeStructureId: structure.id,
          title: structure.name,
          grossAmount: Number(structure.amount),
          discountAmount: 0,
          dueDate: payload.dueDate || null,
          notes: payload.notes || structure.notes
        },
        client
      );

      createdInvoices.push(invoice);
    }

    return {
      student,
      createdCount: createdInvoices.length,
      invoices: createdInvoices
    };
  });
}

export async function listFeeAssignments(filters = {}) {
  const clauses = [];
  const params = [];

  if (filters.studentId) {
    params.push(filters.studentId);
    clauses.push(`fi.student_id = $${params.length}`);
  }

  if (filters.institutionId) {
    params.push(filters.institutionId);
    clauses.push(`fi.institution_id = $${params.length}`);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await query(
    `
      SELECT
        fi.*,
        COALESCE(payments.total_paid, 0) AS total_paid,
        fi.net_amount - COALESCE(payments.total_paid, 0) AS balance
      FROM fee_invoices fi
      LEFT JOIN (
        SELECT fee_invoice_id, SUM(amount) AS total_paid
        FROM fee_payments
        GROUP BY fee_invoice_id
      ) payments ON payments.fee_invoice_id = fi.id
      ${whereClause}
      ORDER BY fi.created_at DESC
    `,
    params
  );

  return mapRows(result.rows).map((invoice) => ({
    ...invoice,
    status:
      Number(invoice.balance) <= 0
        ? "PAID"
        : Number(invoice.totalPaid) > 0
          ? "PARTIALLY_PAID"
          : invoice.status
  }));
}

export async function recordFeePayment(payload) {
  requireFields(payload, ["feeInvoiceId", "amount"]);
  requirePositiveAmount(payload.amount, "amount");

  return withTransaction(async (client) => {
    const invoice = await getFeeInvoiceById(payload.feeInvoiceId, client);
    const paymentId = newId();

    if (Number(payload.amount) > Number(invoice.balance)) {
      throw createHttpError(400, "Payment amount exceeds the remaining balance.");
    }

    await client.query(
      `
        INSERT INTO fee_payments (
          id,
          fee_invoice_id,
          institution_id,
          student_id,
          amount,
          payment_date,
          payment_method,
          reference_number,
          remarks
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        paymentId,
        payload.feeInvoiceId,
        invoice.institutionId,
        invoice.studentId,
        payload.amount,
        payload.paymentDate || new Date().toISOString(),
        payload.paymentMethod?.trim() || "CASH",
        payload.referenceNumber?.trim() || null,
        payload.remarks?.trim() || null
      ]
    );

    const updatedInvoice = await getFeeInvoiceById(payload.feeInvoiceId, client);
    const nextStatus = Number(updatedInvoice.balance) <= 0 ? "PAID" : "PARTIALLY_PAID";

    await client.query("UPDATE fee_invoices SET status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1", [
      payload.feeInvoiceId,
      nextStatus
    ]);

    return {
      payment: await getPaymentById(paymentId),
      invoice: {
        ...updatedInvoice,
        status: nextStatus
      }
    };
  });
}

export async function getStudentFeeSummary(studentId) {
  const student = await findStudent(studentId);
  const assignments = await listFeeAssignments({ studentId });

  const totals = assignments.reduce(
    (acc, item) => {
      acc.totalAssigned += Number(item.netAmount);
      acc.totalPaid += Number(item.totalPaid);
      acc.totalBalance += Number(item.balance);
      return acc;
    },
    { totalAssigned: 0, totalPaid: 0, totalBalance: 0 }
  );

  return {
    student,
    totals,
    assignments
  };
}

export async function listPayments(filters = {}) {
  const clauses = [];
  const params = [];

  if (filters.studentId) {
    params.push(filters.studentId);
    clauses.push(`student_id = $${params.length}`);
  }

  if (filters.institutionId) {
    params.push(filters.institutionId);
    clauses.push(`institution_id = $${params.length}`);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await query(
    `SELECT * FROM fee_payments ${whereClause} ORDER BY payment_date DESC, created_at DESC`,
    params
  );

  return mapRows(result.rows);
}

export async function getPaymentById(paymentId) {
  const result = await query("SELECT * FROM fee_payments WHERE id = $1", [paymentId]);
  if (result.rowCount === 0) {
    throw createHttpError(404, "Payment not found.");
  }
  return toCamelCaseRow(result.rows[0]);
}

export async function deletePayment(paymentId) {
  await getPaymentById(paymentId);
  await query("DELETE FROM fee_payments WHERE id = $1", [paymentId]);
}

export async function getMonthlyFeeLedger(filters = {}) {
  requireFields(filters, ["institutionId", "year"]);

  const year = Number(filters.year);
  if (Number.isNaN(year)) {
    throw createHttpError(400, "year must be a valid number.");
  }

  const studentClauses = ["s.institution_id = $1"];
  const studentParams = [filters.institutionId];

  if (filters.classId) {
    studentParams.push(filters.classId);
    studentClauses.push(`s.class_id = $${studentParams.length}`);
  }

  const studentsResult = await query(
    `
      SELECT
        s.id,
        s.first_name,
        s.admission_number,
        s.class_id,
        s.class_name,
        c.name AS academic_class_name,
        c.section AS academic_class_section
      FROM students s
      LEFT JOIN academic_classes c ON c.id = s.class_id
      WHERE ${studentClauses.join(" AND ")}
      ORDER BY s.first_name ASC
    `,
    studentParams
  );

  const structureClauses = ["institution_id = $1", "frequency = 'MONTHLY'", "is_active = TRUE"];
  const structureParams = [filters.institutionId];

  if (filters.classId) {
    structureParams.push(filters.classId);
    structureClauses.push(`(class_id = $${structureParams.length} OR class_id IS NULL)`);
  }

  const structuresResult = await query(
    `
      SELECT *
      FROM fee_structures
      WHERE ${structureClauses.join(" AND ")}
      ORDER BY name ASC
    `,
    structureParams
  );

  const ledgersResult = await query(
    `
      SELECT *
      FROM monthly_fee_ledgers
      WHERE institution_id = $1
        AND ledger_year = $2
        ${filters.classId ? "AND (class_id = $3 OR class_id IS NULL)" : ""}
    `,
    filters.classId ? [filters.institutionId, year, filters.classId] : [filters.institutionId, year]
  );

  const paidMap = new Map(
    ledgersResult.rows.map((row) => [
      `${row.student_id}:${row.fee_structure_id}:${row.month_number}`,
      toCamelCaseRow(row)
    ])
  );

  const rows = [];
  for (const studentRow of studentsResult.rows) {
    const student = toCamelCaseRow(studentRow);
    for (const structureRow of structuresResult.rows) {
      const structure = toCamelCaseRow(structureRow);

      if (structure.classId && structure.classId !== student.classId) {
        continue;
      }

      rows.push({
        studentId: student.id,
        studentName: student.firstName,
        admissionNumber: student.admissionNumber,
        classId: student.classId,
        className:
          student.academicClassName
            ? `${student.academicClassName}${student.academicClassSection ? ` - ${student.academicClassSection}` : ""}`
            : student.className || "-",
        feeStructureId: structure.id,
        feeName: structure.name,
        amount: Number(structure.amount),
        months: monthLabels.map((label, index) => {
          const monthNumber = index + 1;
          const entry = paidMap.get(`${student.id}:${structure.id}:${monthNumber}`);
          return {
            monthNumber,
            label,
            isPaid: Boolean(entry?.isPaid),
            paidOn: entry?.paidOn || null
          };
        })
      });
    }
  }

  return {
    year,
    rows
  };
}

export async function toggleMonthlyLedgerMonth(payload) {
  requireFields(payload, ["studentId", "feeStructureId", "monthNumber", "year"]);

  const monthNumber = Number(payload.monthNumber);
  const year = Number(payload.year);
  if (Number.isNaN(monthNumber) || monthNumber < 1 || monthNumber > 12) {
    throw createHttpError(400, "monthNumber must be between 1 and 12.");
  }
  if (Number.isNaN(year)) {
    throw createHttpError(400, "year must be a valid number.");
  }

  return withTransaction(async (client) => {
    const student = await findStudent(payload.studentId, client);
    const structureResult = await client.query(
      "SELECT * FROM fee_structures WHERE id = $1 AND institution_id = $2",
      [payload.feeStructureId, student.institutionId]
    );

    if (structureResult.rowCount === 0) {
      throw createHttpError(404, "Fee structure not found.");
    }

    const structure = toCamelCaseRow(structureResult.rows[0]);
    if (structure.frequency !== "MONTHLY") {
      throw createHttpError(400, "Ledger ticking is only available for monthly fee structures.");
    }
    if (structure.classId && structure.classId !== student.classId) {
      throw createHttpError(400, "Fee structure is not attached to the student's class.");
    }

    const nextPaid = Boolean(payload.isPaid);
    const existingResult = await client.query(
      `
        SELECT id
        FROM monthly_fee_ledgers
        WHERE student_id = $1
          AND fee_structure_id = $2
          AND ledger_year = $3
          AND month_number = $4
      `,
      [student.id, structure.id, year, monthNumber]
    );
    const ledgerId = existingResult.rowCount > 0 ? existingResult.rows[0].id : newId();

    if (existingResult.rowCount > 0) {
      await client.query(
        `
          UPDATE monthly_fee_ledgers
          SET
            institution_id = $2,
            class_id = $3,
            is_paid = $4,
            paid_on = $5,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [
          ledgerId,
          student.institutionId,
          student.classId || null,
          nextPaid,
          nextPaid ? new Date().toISOString() : null
        ]
      );
    } else {
      await client.query(
        `
          INSERT INTO monthly_fee_ledgers (
            id,
            institution_id,
            class_id,
            student_id,
            fee_structure_id,
            ledger_year,
            month_number,
            is_paid,
            paid_on
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [
          ledgerId,
          student.institutionId,
          student.classId || null,
          student.id,
          structure.id,
          year,
          monthNumber,
          nextPaid,
          nextPaid ? new Date().toISOString() : null
        ]
      );
    }

    const result = await client.query(
      `
        SELECT *
        FROM monthly_fee_ledgers
        WHERE id = $1
      `,
      [ledgerId]
    );

    return toCamelCaseRow(result.rows[0]);
  });
}
