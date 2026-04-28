import { ensureSchema } from "../../../../db/ensureSchema.js";
import { deleteSession, SESSION_COOKIE_NAME } from "../../../../lib/auth.js";
import { noContent, failure } from "../../../../utils/api.js";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    await ensureSchema();
    await deleteSession(request.cookies.get(SESSION_COOKIE_NAME)?.value);
    const response = noContent();
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(0)
    });
    return response;
  } catch (error) {
    return failure(error);
  }
}
