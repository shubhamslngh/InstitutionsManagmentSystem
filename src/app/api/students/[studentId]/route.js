import { ensureSchema } from "../../../../db/ensureSchema.js";
import { deleteStudent, getStudentById, updateStudent } from "../../../../services/studentService.js";
import { failure, noContent, success } from "../../../../utils/api.js";

export const runtime = "nodejs";

export async function GET(request, context) {
  try {
    await ensureSchema();
    return success(await getStudentById(context.params.studentId));
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(request, context) {
  try {
    await ensureSchema();
    const body = await request.json();
    return success(await updateStudent(context.params.studentId, body));
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request, context) {
  try {
    await ensureSchema();
    await deleteStudent(context.params.studentId);
    return noContent();
  } catch (error) {
    return failure(error);
  }
}
