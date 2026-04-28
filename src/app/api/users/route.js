import { ensureSchema } from "../../../db/ensureSchema.js";
import { requireApiPermission } from "../../../lib/apiAuth.js";
import { createUser, listUsers } from "../../../services/userService.js";
import { created, failure, success } from "../../../utils/api.js";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    await ensureSchema();
    await requireApiPermission(request, "users.manage");
    return success(await listUsers());
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request) {
  try {
    await ensureSchema();
    await requireApiPermission(request, "users.manage");
    const body = await request.json();
    return created("User created successfully.", await createUser(body));
  } catch (error) {
    return failure(error);
  }
}
