import { query } from "../db/index.js";
import { createHttpError } from "../utils/httpError.js";
import { requireFields } from "../utils/validators.js";
import { mapRows, toCamelCaseRow } from "../utils/mappers.js";

async function assertInstitutionExists(institutionId) {
  const result = await query("SELECT id FROM institutions WHERE id = $1", [institutionId]);
  if (result.rowCount === 0) {
    throw createHttpError(404, "Institution not found.");
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
  const result = await query(
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

export async function createClass(payload) {
  requireFields(payload, ["institutionId", "name"]);
  await assertInstitutionExists(payload.institutionId);

  try {
    const result = await query(
      `
        INSERT INTO academic_classes (
          institution_id,
          name,
          section,
          academic_year,
          capacity
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      [
        payload.institutionId,
        payload.name.trim(),
        payload.section?.trim() || null,
        payload.academicYear?.trim() || null,
        payload.capacity || null
      ]
    );

    return toCamelCaseRow(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      throw createHttpError(409, "This class already exists for the institution.");
    }
    throw error;
  }
}

export async function updateClass(classId, payload) {
  const currentClass = await getClassById(classId);
  const institutionId = payload.institutionId ?? currentClass.institutionId;
  await assertInstitutionExists(institutionId);

  try {
    const result = await query(
      `
        UPDATE academic_classes
        SET
          institution_id = $2,
          name = $3,
          section = $4,
          academic_year = $5,
          capacity = $6,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
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

    return toCamelCaseRow(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      throw createHttpError(409, "This class already exists for the institution.");
    }
    throw error;
  }
}

export async function deleteClass(classId) {
  await getClassById(classId);
  await query("DELETE FROM academic_classes WHERE id = $1", [classId]);
}
