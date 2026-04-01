import { query } from "../db/index.js";
import { newId } from "../db/ids.js";
import { createHttpError } from "../utils/httpError.js";
import { requireFields } from "../utils/validators.js";
import { mapRows, toCamelCaseRow } from "../utils/mappers.js";

const studentCategories = ["GENERAL", "OBC", "SC", "ST", "EWS", "MINORITY"];

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

async function assertInstitutionExists(institutionId) {
  const result = await query("SELECT id FROM institutions WHERE id = $1", [institutionId]);
  if (result.rowCount === 0) {
    throw createHttpError(404, "Institution not found.");
  }
}

async function assertClassBelongsToInstitution(classId, institutionId) {
  if (!classId) {
    return null;
  }

  const result = await query(
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

export async function createStudent(payload) {
  requireFields(payload, ["institutionId", "firstName", "admissionNumber"]);
  validateStudentPayload(payload);
  await assertInstitutionExists(payload.institutionId);
  const academicClass = await assertClassBelongsToInstitution(payload.classId, payload.institutionId);
  const studentId = newId();

  await query(
    `
      INSERT INTO students (
        id,
        institution_id,
        admission_number,
        category,
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
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    `,
    [
      studentId,
      payload.institutionId,
      payload.admissionNumber.trim(),
      payload.category?.trim() || null,
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

  return getStudentById(studentId);
}

export async function updateStudent(studentId, payload) {
  const currentStudent = await getStudentById(studentId);
  validateStudentPayload(payload, currentStudent);
  const nextInstitutionId = payload.institutionId ?? currentStudent.institutionId;
  await assertInstitutionExists(nextInstitutionId);
  const nextClassId = payload.classId !== undefined ? payload.classId || null : currentStudent.classId;
  const academicClass = await assertClassBelongsToInstitution(nextClassId, nextInstitutionId);

  await query(
    `
      UPDATE students
      SET
        institution_id = $2,
        admission_number = $3,
        category = $4,
        first_name = $5,
        last_name = $6,
        mother_name = $7,
        father_name = $8,
        aadhaar_number = $9,
        email = $10,
        phone = $11,
        address = $12,
        dob = $13,
        course = $14,
        class_name = $15,
        class_id = $16,
        section = $17,
        status = $18,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
    [
      studentId,
      nextInstitutionId,
      payload.admissionNumber?.trim() ?? currentStudent.admissionNumber,
      payload.category?.trim() ?? currentStudent.category,
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

  return getStudentById(studentId);
}

export async function deleteStudent(studentId) {
  await getStudentById(studentId);
  await query("DELETE FROM students WHERE id = $1", [studentId]);
}
