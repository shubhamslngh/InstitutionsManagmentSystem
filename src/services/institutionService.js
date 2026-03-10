import { query } from "../db/index.js";
import { createHttpError } from "../utils/httpError.js";
import { requireEnum, requireFields } from "../utils/validators.js";
import { mapRows, toCamelCaseRow } from "../utils/mappers.js";

const institutionTypes = ["SCHOOL", "COLLEGE"];

export async function listInstitutions() {
  const result = await query("SELECT * FROM institutions ORDER BY created_at DESC");
  return mapRows(result.rows);
}

export async function getInstitutionById(institutionId) {
  const result = await query("SELECT * FROM institutions WHERE id = $1", [institutionId]);
  if (result.rowCount === 0) {
    throw createHttpError(404, "Institution not found.");
  }
  return toCamelCaseRow(result.rows[0]);
}

export async function createInstitution(payload) {
  requireFields(payload, ["name", "type"]);
  requireEnum(payload.type, institutionTypes, "type");

  const result = await query(
    `
      INSERT INTO institutions (name, type, code, address, contact_email, contact_phone)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
    [
      payload.name.trim(),
      payload.type,
      payload.code?.trim() || null,
      payload.address?.trim() || null,
      payload.contactEmail?.trim() || null,
      payload.contactPhone?.trim() || null
    ]
  );

  return toCamelCaseRow(result.rows[0]);
}

export async function updateInstitution(institutionId, payload) {
  const currentInstitution = await getInstitutionById(institutionId);
  const nextType = payload.type ?? currentInstitution.type;
  requireEnum(nextType, institutionTypes, "type");

  const result = await query(
    `
      UPDATE institutions
      SET
        name = $2,
        type = $3,
        code = $4,
        address = $5,
        contact_email = $6,
        contact_phone = $7
      WHERE id = $1
      RETURNING *
    `,
    [
      institutionId,
      payload.name?.trim() ?? currentInstitution.name,
      nextType,
      payload.code?.trim() ?? currentInstitution.code,
      payload.address?.trim() ?? currentInstitution.address,
      payload.contactEmail?.trim() ?? currentInstitution.contactEmail,
      payload.contactPhone?.trim() ?? currentInstitution.contactPhone
    ]
  );

  return toCamelCaseRow(result.rows[0]);
}

export async function deleteInstitution(institutionId) {
  await getInstitutionById(institutionId);
  await query("DELETE FROM institutions WHERE id = $1", [institutionId]);
}
