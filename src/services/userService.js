import { query, withTransaction } from "../db/index.js";
import { newId } from "../db/ids.js";
import { createHttpError } from "../utils/httpError.js";
import { mapRows, toCamelCaseRow } from "../utils/mappers.js";
import { requireEnum, requireFields } from "../utils/validators.js";
import { USER_ROLES, hashUserPassword } from "../lib/auth.js";

const editableRoles = [
  USER_ROLES.SUPER_ADMIN,
  USER_ROLES.INSTITUTION_ADMIN,
  USER_ROLES.ACCOUNTANT,
  USER_ROLES.DATA_ENTRY,
  USER_ROLES.VIEWER
];

function normalizeValue(value) {
  return typeof value === "string" ? value.trim() : value;
}

async function assertInstitutionExists(institutionId, client = { query }) {
  if (!institutionId) {
    return;
  }

  const result = await client.query("SELECT id FROM institutions WHERE id = $1", [institutionId]);
  if (result.rowCount === 0) {
    throw createHttpError(404, "Institution not found.");
  }
}

function validateUserPayload(payload, currentUser = null) {
  const name = normalizeValue(payload.name ?? currentUser?.name ?? "");
  const email = normalizeValue(payload.email ?? currentUser?.email ?? "").toLowerCase();
  const role = normalizeValue(payload.role ?? currentUser?.role ?? "");
  const password = payload.password ?? "";
  const institutionId =
    payload.institutionId !== undefined
      ? normalizeValue(payload.institutionId)
      : currentUser?.institutionId ?? null;

  if (!name || name.length < 2) {
    throw createHttpError(400, "Name is required.");
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createHttpError(400, "Email address is invalid.");
  }

  requireEnum(role, editableRoles, "role");

  if (!currentUser && String(password || "").length < 8) {
    throw createHttpError(400, "Password must be at least 8 characters.");
  }

  if (password && String(password).length < 8) {
    throw createHttpError(400, "Password must be at least 8 characters.");
  }

  if (role === USER_ROLES.SUPER_ADMIN && institutionId) {
    throw createHttpError(400, "Super admin cannot be restricted to an institution.");
  }

  if (role !== USER_ROLES.SUPER_ADMIN && !institutionId) {
    throw createHttpError(400, "Institution is required for this role.");
  }
}

async function ensureUniqueEmail(email, userId = null, client = { query }) {
  const result = await client.query(
    userId
      ? "SELECT id FROM users WHERE email = $1 AND id <> $2 LIMIT 1"
      : "SELECT id FROM users WHERE email = $1 LIMIT 1",
    userId ? [email, userId] : [email]
  );

  if (result.rowCount > 0) {
    throw createHttpError(400, "A user with this email already exists.");
  }
}

export async function listUsers() {
  const result = await query(
    `
      SELECT
        u.id,
        u.institution_id,
        u.name,
        u.email,
        u.role,
        u.is_active,
        u.created_at,
        u.updated_at,
        i.name AS institution_name
      FROM users u
      LEFT JOIN institutions i ON i.id = u.institution_id
      ORDER BY u.created_at DESC
    `
  );

  return mapRows(result.rows);
}

export async function getUserById(userId) {
  return getPublicUserById(userId);
}

async function getPublicUserById(userId, client = { query }) {
  const result = await client.query(
    `
      SELECT
        u.id,
        u.institution_id,
        u.name,
        u.email,
        u.role,
        u.is_active,
        u.created_at,
        u.updated_at,
        i.name AS institution_name
      FROM users u
      LEFT JOIN institutions i ON i.id = u.institution_id
      WHERE u.id = $1
    `,
    [userId]
  );

  if (result.rowCount === 0) {
    throw createHttpError(404, "User not found.");
  }

  return toCamelCaseRow(result.rows[0]);
}

async function getUserRecordById(userId, client = { query }) {
  const result = await client.query(
    `
      SELECT
        *
      FROM users u
      WHERE u.id = $1
    `,
    [userId]
  );

  if (result.rowCount === 0) {
    throw createHttpError(404, "User not found.");
  }

  return toCamelCaseRow(result.rows[0]);
}

export async function createUser(payload) {
  requireFields(payload, ["name", "email", "password", "role"]);
  validateUserPayload(payload);

  return withTransaction(async (client) => {
    const email = normalizeValue(payload.email).toLowerCase();
    const institutionId = normalizeValue(payload.institutionId) || null;
    await assertInstitutionExists(institutionId, client);
    await ensureUniqueEmail(email, null, client);

    const userId = newId();
    await client.query(
      `
        INSERT INTO users (id, institution_id, name, email, password_hash, role, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        userId,
        institutionId,
        normalizeValue(payload.name),
        email,
        hashUserPassword(payload.password),
        payload.role,
        payload.isActive === undefined ? true : Boolean(payload.isActive)
      ]
    );

    return getPublicUserById(userId, client);
  });
}

export async function updateUser(userId, payload, actorUserId = null) {
  const currentUser = await getUserRecordById(userId);
  validateUserPayload(payload, currentUser);

  return withTransaction(async (client) => {
    const nextEmail = normalizeValue(payload.email ?? currentUser.email).toLowerCase();
    const nextRole = normalizeValue(payload.role ?? currentUser.role);
    const nextInstitutionId =
      payload.institutionId !== undefined
        ? normalizeValue(payload.institutionId) || null
        : currentUser.institutionId || null;
    const nextIsActive =
      payload.isActive === undefined ? Boolean(currentUser.isActive) : Boolean(payload.isActive);

    if (actorUserId && actorUserId === userId && nextIsActive === false) {
      throw createHttpError(400, "You cannot deactivate your own account.");
    }

    await assertInstitutionExists(nextInstitutionId, client);
    await ensureUniqueEmail(nextEmail, userId, client);

    await client.query(
      `
        UPDATE users
        SET
          institution_id = $2,
          name = $3,
          email = $4,
          role = $5,
          is_active = $6,
          password_hash = $7,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [
        userId,
        nextRole === USER_ROLES.SUPER_ADMIN ? null : nextInstitutionId,
        normalizeValue(payload.name ?? currentUser.name),
        nextEmail,
        nextRole,
        nextIsActive,
        payload.password ? hashUserPassword(payload.password) : currentUser.passwordHash
      ]
    );

    return getPublicUserById(userId, client);
  });
}

export async function deleteUser(userId, actorUserId = null) {
  const currentUser = await getUserRecordById(userId);

  if (actorUserId && actorUserId === userId) {
    throw createHttpError(400, "You cannot delete your own account.");
  }

  if (currentUser.role === USER_ROLES.SUPER_ADMIN) {
    const superAdminCountResult = await query(
      "SELECT COUNT(*) AS total FROM users WHERE role = $1 AND is_active = TRUE",
      [USER_ROLES.SUPER_ADMIN]
    );

    if (Number(superAdminCountResult.rows[0]?.total || 0) <= 1) {
      throw createHttpError(400, "At least one active super admin must remain.");
    }
  }

  await query("DELETE FROM users WHERE id = $1", [userId]);
}

export function getEditableRoles() {
  return editableRoles;
}
