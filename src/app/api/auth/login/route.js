import { NextResponse } from "next/server";
import { ensureSchema } from "../../../../db/ensureSchema.js";
import { authenticateUser, createSession, createSessionCookie } from "../../../../lib/auth.js";
import { failure, success } from "../../../../utils/api.js";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    await ensureSchema();
    const body = await request.json();
    const user = await authenticateUser(body.email, body.password);
    const session = await createSession(user.id);
    const response = success({ user });
    response.cookies.set(createSessionCookie(session.token, session.expiresAt));
    return response;
  } catch (error) {
    return failure(error);
  }
}
