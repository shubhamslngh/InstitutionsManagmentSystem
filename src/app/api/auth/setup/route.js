import { ensureSchema } from "../../../../db/ensureSchema.js";
import { bootstrapSuperAdmin, countUsers, createSession, createSessionCookie } from "../../../../lib/auth.js";
import { failure, success } from "../../../../utils/api.js";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureSchema();
    return success({ setupRequired: (await countUsers()) === 0 });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request) {
  try {
    await ensureSchema();
    const body = await request.json();
    const user = await bootstrapSuperAdmin(body);
    const session = await createSession(user.id);
    const response = success({ user });
    response.cookies.set(createSessionCookie(session.token, session.expiresAt));
    return response;
  } catch (error) {
    return failure(error);
  }
}
