import { ensureSchema } from "../../../../db/ensureSchema.js";
import { deleteClass, getClassById, updateClass } from "../../../../services/classService.js";
import { failure, noContent, success } from "../../../../utils/api.js";

export const runtime = "nodejs";

export async function GET(request, context) {
  try {
    await ensureSchema();
    return success(await getClassById(context.params.classId));
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(request, context) {
  try {
    await ensureSchema();
    const body = await request.json();
    return success(await updateClass(context.params.classId, body));
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request, context) {
  try {
    await ensureSchema();
    await deleteClass(context.params.classId);
    return noContent();
  } catch (error) {
    return failure(error);
  }
}
