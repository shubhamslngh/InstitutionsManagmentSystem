import { ensureSchema } from "../../../../db/ensureSchema.js";
import { getCurrentUserFromRequest } from "../../../../lib/auth.js";
import { failure, success } from "../../../../utils/api.js";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    await ensureSchema();
    return success(await getCurrentUserFromRequest(request));
  } catch (error) {
    return failure(error);
  }
}
