import { query, withTransaction } from "../db/index.js";
import { newId } from "../db/ids.js";
import { createHttpError } from "../utils/httpError.js";
import { requireFields } from "../utils/validators.js";
import { mapRows, toCamelCaseRow } from "../utils/mappers.js";
import { assignFeesToWholeClass } from "./feeService.js";

async function assertInstitutionExists(institutionId) {
  const result = await query("SELECT id FROM institutions WHERE id = $1", [institutionId]);
  if (result.rowCount === 0) {
    throw createHttpError(404, "Institution not found.");
  }
}

async function getClassRowById(db, classId) {
  const result = await db.query(
    `
      SELECT c.*, i.name AS institution_name
      FROM academic_classes c
      JOIN institutions i ON i.id = c.institution_id
      WHERE c.id = $1
    `,
    [classId]
  );

  if (result.rowCount === 0) {
    throw createHttpError(404, "Class not found.");
  }

  return toCamelCaseRow(result.rows[0]);
}

function parseAcademicYearStart(academicYear) {
  const match = String(academicYear || "").match(/^(\d{4})/);
  return match ? Number(match[1]) : null;
}

function canIgnoreInvoiceGenerationError(error) {
  const message = String(error?.message || "");
  return (
    (error?.status === 404 || error?.statusCode === 404) &&
    (
      message.includes("No students are assigned to this class.") ||
      message.includes("No active fee structures found for the student's class.")
    )
  );
}

function normalizeClassFeeStructures(classFeeStructures) {
  if (classFeeStructures === undefined || classFeeStructures === null) {
    return [];
  }
  if (!Array.isArray(classFeeStructures)) {
    throw createHttpError(400, "classFeeStructures must be an array.");
  }

  return classFeeStructures
    .map((item) => ({
      feeStructureId: item?.feeStructureId || item?.id || null,
      name: typeof item?.name === "string" ? item.name.trim() : "",
      amount: Number(item?.amount),
      frequency: typeof item?.frequency === "string" ? item.frequency.trim().toUpperCase() : "ONE_TIME",
      dueDayOfMonth:
        item?.dueDayOfMonth === "" || item?.dueDayOfMonth === undefined || item?.dueDayOfMonth === null
          ? null
          : Number(item.dueDayOfMonth),
      sessionStartMonth:
        item?.sessionStartMonth === "" || item?.sessionStartMonth === undefined || item?.sessionStartMonth === null
          ? null
          : Number(item.sessionStartMonth),
      sessionEndMonth:
        item?.sessionEndMonth === "" || item?.sessionEndMonth === undefined || item?.sessionEndMonth === null
          ? null
          : Number(item.sessionEndMonth),
      notes: typeof item?.notes === "string" ? item.notes.trim() : "",
      isActive: item?.isActive === undefined ? true : Boolean(item.isActive)
    }))
    .filter((item) => item.name || item.amount)
    .map((item, index) => {
      if (!item.name) {
        throw createHttpError(400, `classFeeStructures[${index}].name is required.`);
      }
      if (!Number.isFinite(item.amount) || item.amount <= 0) {
        throw createHttpError(400, `classFeeStructures[${index}].amount must be greater than zero.`);
      }
      if (!["ONE_TIME", "MONTHLY"].includes(item.frequency)) {
        throw createHttpError(400, `classFeeStructures[${index}].frequency is invalid.`);
      }
      if (item.dueDayOfMonth !== null && (!Number.isInteger(item.dueDayOfMonth) || item.dueDayOfMonth < 1 || item.dueDayOfMonth > 31)) {
        throw createHttpError(400, `classFeeStructures[${index}].dueDayOfMonth must be 1-31.`);
      }
      if (item.sessionStartMonth !== null && (!Number.isInteger(item.sessionStartMonth) || item.sessionStartMonth < 1 || item.sessionStartMonth > 12)) {
        throw createHttpError(400, `classFeeStructures[${index}].sessionStartMonth must be 1-12.`);
      }
      if (item.sessionEndMonth !== null && (!Number.isInteger(item.sessionEndMonth) || item.sessionEndMonth < 1 || item.sessionEndMonth > 12)) {
        throw createHttpError(400, `classFeeStructures[${index}].sessionEndMonth must be 1-12.`);
      }
      return item;
    });
}

async function syncClassFeeStructures(client, classData, classFeeStructures) {
  const normalized = normalizeClassFeeStructures(classFeeStructures);

  const existingResult = await client.query(
    "SELECT id FROM fee_structures WHERE class_id = $1 AND institution_id = $2",
    [classData.id, classData.institutionId]
  );
  const existingIds = new Set(existingResult.rows.map((row) => row.id));
  const keepIds = new Set(normalized.map((item) => item.feeStructureId).filter(Boolean));

  for (const existingId of existingIds) {
    if (!keepIds.has(existingId)) {
      await client.query("DELETE FROM fee_structures WHERE id = $1", [existingId]);
    }
  }

  for (const item of normalized) {
    const sessionStartMonth =
      item.frequency === "MONTHLY" ? (item.sessionStartMonth || 4) : null;
    const sessionEndMonth =
      item.frequency === "MONTHLY" ? (item.sessionEndMonth || 3) : null;

    if (item.feeStructureId && existingIds.has(item.feeStructureId)) {
      await client.query(
        `
          UPDATE fee_structures
          SET
            institution_id = $2,
            class_id = $3,
            name = $4,
            amount = $5,
            frequency = $6,
            applicable_for = 'ALL',
            due_day_of_month = $7,
            session_start_month = $8,
            session_end_month = $9,
            is_active = $10,
            notes = $11,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [
          item.feeStructureId,
          classData.institutionId,
          classData.id,
          item.name,
          item.amount,
          item.frequency,
          item.frequency === "MONTHLY" ? item.dueDayOfMonth : null,
          sessionStartMonth,
          sessionEndMonth,
          item.isActive,
          item.notes || null
        ]
      );
      continue;
    }

    await client.query(
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
          session_start_month,
          session_end_month,
          is_active,
          notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'ALL', $7, $8, $9, $10, $11)
      `,
      [
        newId(),
        classData.institutionId,
        classData.id,
        item.name,
        item.amount,
        item.frequency,
        item.frequency === "MONTHLY" ? item.dueDayOfMonth : null,
        sessionStartMonth,
        sessionEndMonth,
        item.isActive,
        item.notes || null
      ]
    );
  }
}

export async function listClasses(filters = {}) {
  const clauses = [];
  const params = [];

  if (filters.institutionId) {
    params.push(filters.institutionId);
    clauses.push(`c.institution_id = $${params.length}`);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await query(
    `
      SELECT c.*, i.name AS institution_name
      FROM academic_classes c
      JOIN institutions i ON i.id = c.institution_id
      ${whereClause}
      ORDER BY c.created_at DESC
    `,
    params
  );

  return mapRows(result.rows);
}

export async function getClassById(classId) {
  return getClassRowById({ query }, classId);
}

export async function createClass(payload) {
  requireFields(payload, ["institutionId", "name"]);
  const createdClass = await withTransaction(async (client) => {
    await assertInstitutionExists(payload.institutionId);
    const classId = newId();

    try {
      await client.query(
        `
          INSERT INTO academic_classes (
            id,
            institution_id,
            name,
            section,
            academic_year,
            capacity
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          classId,
          payload.institutionId,
          payload.name.trim(),
          payload.section?.trim() || null,
          payload.academicYear?.trim() || null,
          payload.capacity || null
        ]
      );

      const classRow = await getClassRowById(client, classId);
      if (payload.classFeeStructures !== undefined) {
        await syncClassFeeStructures(client, classRow, payload.classFeeStructures);
      }

      return getClassRowById(client, classId);
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        throw createHttpError(409, "This class already exists for the institution.");
      }
      throw error;
    }
  });

  if (payload.generateStudentInvoices) {
    try {
      await assignFeesToWholeClass({
        classId: createdClass.id,
        dueDate: payload.dueDate || null,
        notes: payload.notes || null,
        sessionYearOverride: parseAcademicYearStart(createdClass.academicYear) || undefined
      });
    } catch (error) {
      if (!canIgnoreInvoiceGenerationError(error)) {
        throw error;
      }
    }
  }

  return createdClass;
}

export async function updateClass(classId, payload) {
  const updatedClass = await withTransaction(async (client) => {
    const currentClass = await getClassRowById(client, classId);
    const institutionId = payload.institutionId ?? currentClass.institutionId;
    await assertInstitutionExists(institutionId);

    try {
      await client.query(
        `
          UPDATE academic_classes
          SET
            institution_id = $2,
            name = $3,
            section = $4,
            academic_year = $5,
            capacity = $6,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [
          classId,
          institutionId,
          payload.name?.trim() ?? currentClass.name,
          payload.section?.trim() ?? currentClass.section,
          payload.academicYear?.trim() ?? currentClass.academicYear,
          payload.capacity !== undefined ? payload.capacity || null : currentClass.capacity
        ]
      );

      const updatedClass = await getClassRowById(client, classId);
      if (payload.classFeeStructures !== undefined) {
        await syncClassFeeStructures(client, updatedClass, payload.classFeeStructures);
      }

      return getClassRowById(client, classId);
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        throw createHttpError(409, "This class already exists for the institution.");
      }
      throw error;
    }
  });

  if (payload.generateStudentInvoices) {
    try {
      await assignFeesToWholeClass({
        classId,
        dueDate: payload.dueDate || null,
        notes: payload.notes || null,
        sessionYearOverride: parseAcademicYearStart(updatedClass.academicYear) || undefined
      });
    } catch (error) {
      if (!canIgnoreInvoiceGenerationError(error)) {
        throw error;
      }
    }
  }

  return updatedClass;
}

export async function deleteClass(classId) {
  await getClassById(classId);
  await query("DELETE FROM academic_classes WHERE id = $1", [classId]);
}
