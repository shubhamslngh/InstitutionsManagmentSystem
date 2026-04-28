import { ensureSchema } from "../../../../db/ensureSchema.js";
import { getCurrentUserFromRequest } from "../../../../lib/auth.js";
import { requireApiPermission } from "../../../../lib/apiAuth.js";
import { deleteUser, getUserById, updateUser } from "../../../../services/userService.js";
import { failure, noContent, success } from "../../../../utils/api.js";

export const runtime = "nodejs";

async function getResolvedUserId(params) {
  const resolvedParams = await params;
  return resolvedParams.userId;
}

export async function GET(request, { params }) {
  try {
    await ensureSchema();
    await requireApiPermission(request, "users.manage");
    return success(await getUserById(await getResolvedUserId(params)));
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(request, { params }) {
  try {
    await ensureSchema();
    await requireApiPermission(request, "users.manage");
    const actor = await getCurrentUserFromRequest(request);
    const body = await request.json();
    return success(await updateUser(await getResolvedUserId(params), body, actor?.id || null));
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    await ensureSchema();
    await requireApiPermission(request, "users.manage");
    const actor = await getCurrentUserFromRequest(request);
    await deleteUser(await getResolvedUserId(params), actor?.id || null);
    return noContent();
  } catch (error) {
    return failure(error);
  }
}
