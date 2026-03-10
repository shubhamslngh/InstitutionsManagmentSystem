import { query } from "../db/index.js";
import { newId } from "../db/ids.js";
import { createHttpError } from "../utils/httpError.js";
import { requireFields } from "../utils/validators.js";
import { mapRows, toCamelCaseRow } from "../utils/mappers.js";

async function assertInstitutionExists(institutionId) {
  const result = await query("SELECT id FROM institutions WHERE id = $1", [institutionId]);
  if (result.rowCount === 0) {
    throw createHttpError(404, "Institution not found.");
  }
}

async function assertClassBelongsToInstitution(classId, institutionId) {
  if (!classId) {
    return;
  }

  const result = await query(
    "SELECT id FROM academic_classes WHERE id = $1 AND institution_id = $2",
    [classId, institutionId]
  );

  if (result.rowCount === 0) {
    throw createHttpError(404, "Class not found for this institution.");
  }
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
    `SELECT * FROM students ${whereClause} ORDER BY created_at DESC`,
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

export async function createStudent(payload) {
  requireFields(payload, ["institutionId", "firstName", "admissionNumber"]);
  await assertInstitutionExists(payload.institutionId);
  await assertClassBelongsToInstitution(payload.classId, payload.institutionId);
  const studentId = newId();

  try {
    await query(
      `
        INSERT INTO students (
          id,
          institution_id,
          admission_number,
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
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      `,
      [
        studentId,
        payload.institutionId,
        payload.admissionNumber.trim(),
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
        payload.className?.trim() || null,
        payload.classId || null,
        payload.section?.trim() || null,
        payload.status?.trim() || "ACTIVE"
      ]
    );

    return getStudentById(studentId);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      throw createHttpError(409, "Admission number already exists for this institution.");
    }
    throw error;
  }
}

export async function updateStudent(studentId, payload) {
  const currentStudent = await getStudentById(studentId);
  const nextInstitutionId = payload.institutionId ?? currentStudent.institutionId;
  await assertInstitutionExists(nextInstitutionId);
  const nextClassId = payload.classId !== undefined ? payload.classId || null : currentStudent.classId;
  await assertClassBelongsToInstitution(nextClassId, nextInstitutionId);

  try {
    await query(
      `
        UPDATE students
        SET
          institution_id = $2,
          admission_number = $3,
          first_name = $4,
          last_name = $5,
          mother_name = $6,
          father_name = $7,
          aadhaar_number = $8,
          email = $9,
          phone = $10,
          address = $11,
          dob = $12,
          course = $13,
          class_name = $14,
          class_id = $15,
          section = $16,
          status = $17,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [
        studentId,
        nextInstitutionId,
        payload.admissionNumber?.trim() ?? currentStudent.admissionNumber,
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
        payload.className?.trim() ?? currentStudent.className,
        nextClassId,
        payload.section?.trim() ?? currentStudent.section,
        payload.status?.trim() ?? currentStudent.status
      ]
    );

    return getStudentById(studentId);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      throw createHttpError(409, "Admission number already exists for this institution.");
    }
    throw error;
  }
}

export async function deleteStudent(studentId) {
  await getStudentById(studentId);
  await query("DELETE FROM students WHERE id = $1", [studentId]);
}
