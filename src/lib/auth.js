import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { query, withTransaction } from "../db/index.js";
import { newId } from "../db/ids.js";
import { createHttpError } from "../utils/httpError.js";
import { ensureSchema } from "../db/ensureSchema.js";
import { can, getRoleOptions, USER_ROLES } from "./permissions.js";

export const SESSION_COOKIE_NAME = "maurya_session";

const SESSION_TTL_DAYS = 14;

function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

function verifyPassword(password, passwordHash) {
  const [salt, storedHash] = String(passwordHash || "").split(":");
  if (!salt || !storedHash) {
    return false;
  }

  const derivedHash = scryptSync(password, salt, 64).toString("hex");
  if (storedHash.length !== derivedHash.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(storedHash, "hex"), Buffer.from(derivedHash, "hex"));
}

function hashSessionToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function normalizeUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    institutionId: row.institution_id ?? row.institutionId ?? null,
    name: row.name,
    email: row.email,
    role: row.role,
    isActive: Boolean(row.is_active ?? row.isActive)
  };
}

export function assertPermission(user, permission) {
  if (!user) {
    throw createHttpError(401, "Authentication is required.");
  }

  if (!can(user, permission)) {
    throw createHttpError(403, "You do not have permission to perform this action.");
  }
}

export function getScopedInstitutionId(user, requestedInstitutionId) {
  if (!user?.institutionId || user.role === USER_ROLES.SUPER_ADMIN) {
    return requestedInstitutionId || undefined;
  }

  if (requestedInstitutionId && requestedInstitutionId !== user.institutionId) {
    throw createHttpError(403, "You cannot access another institution's data.");
  }

  return user.institutionId;
}

export function assertInstitutionAccess(user, institutionId) {
  if (!institutionId) {
    return;
  }

  if (user?.role === USER_ROLES.SUPER_ADMIN) {
    return;
  }

  if (!user?.institutionId || user.institutionId !== institutionId) {
    throw createHttpError(403, "You cannot access another institution's data.");
  }
}

export async function countUsers() {
  const result = await query("SELECT COUNT(*) AS total FROM users");
  return Number(result.rows[0]?.total || 0);
}

export async function bootstrapSuperAdmin(payload) {
  const name = String(payload?.name || "").trim();
  const email = String(payload?.email || "").trim().toLowerCase();
  const password = String(payload?.password || "");

  if (!name || !email || password.length < 8) {
    throw createHttpError(400, "Name, email, and an 8-character password are required.");
  }

  return withTransaction(async (client) => {
    const existingUsers = await client.query("SELECT COUNT(*) AS total FROM users");
    if (Number(existingUsers.rows[0]?.total || 0) > 0) {
      throw createHttpError(400, "Initial setup is already complete.");
    }

    const userId = newId();
    await client.query(
      `
        INSERT INTO users (id, institution_id, name, email, password_hash, role, is_active)
        VALUES ($1, NULL, $2, $3, $4, $5, TRUE)
      `,
      [userId, name, email, hashPassword(password), USER_ROLES.SUPER_ADMIN]
    );

    return normalizeUser({
      id: userId,
      institution_id: null,
      name,
      email,
      role: USER_ROLES.SUPER_ADMIN,
      is_active: true
    });
  });
}

export async function authenticateUser(email, password) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const result = await query("SELECT * FROM users WHERE email = $1 LIMIT 1", [normalizedEmail]);

  if (result.rowCount === 0) {
    throw createHttpError(401, "Invalid email or password.");
  }

  const userRow = result.rows[0];
  if (!userRow.is_active) {
    throw createHttpError(403, "This account is inactive.");
  }

  if (!verifyPassword(password, userRow.password_hash)) {
    throw createHttpError(401, "Invalid email or password.");
  }

  return normalizeUser(userRow);
}

export async function createSession(userId) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await query(
    `
      INSERT INTO user_sessions (id, user_id, token_hash, expires_at)
      VALUES ($1, $2, $3, $4)
    `,
    [newId(), userId, tokenHash, expiresAt]
  );

  return {
    token,
    expiresAt
  };
}

export async function deleteSession(token) {
  if (!token) {
    return;
  }

  await query("DELETE FROM user_sessions WHERE token_hash = $1", [hashSessionToken(token)]);
}

async function findUserBySessionToken(token) {
  if (!token) {
    return null;
  }

  const result = await query(
    `
      SELECT u.*
      FROM user_sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.expires_at > CURRENT_TIMESTAMP
        AND u.is_active = TRUE
      LIMIT 1
    `,
    [hashSessionToken(token)]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return normalizeUser(result.rows[0]);
}

export async function getCurrentUserFromRequest(request) {
  return findUserBySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  return findUserBySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export async function requireCurrentUser(permission) {
  const user = await getCurrentUser();
  assertPermission(user, permission);
  return user;
}

export async function requireDashboardUser(permission = "dashboard.view") {
  await ensureSchema();
  const totalUsers = await countUsers();
  if (totalUsers === 0) {
    redirect("/setup");
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  assertPermission(user, permission);
  return user;
}

export function createSessionCookie(token, expiresAt) {
  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    options: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: expiresAt
    }
  };
}

export function hashUserPassword(password) {
  return hashPassword(password);
}

export { getRoleOptions, USER_ROLES, can };
