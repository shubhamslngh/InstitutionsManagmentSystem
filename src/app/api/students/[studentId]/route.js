import { ensureSchema } from "../../../../db/ensureSchema.js";
import { deleteStudent, getStudentById, updateStudent } from "../../../../services/studentService.js";
import { failure, noContent, success } from "../../../../utils/api.js";

export const runtime = "nodejs";

async function getStudentId(params) {
  const resolvedParams = await params;
  return resolvedParams.studentId;
}

async function handleUpdate(request, params) {
  await ensureSchema();
  const body = await request.json();
  return success(await updateStudent(await getStudentId(params), body));
}

export async function GET(request, { params }) {
  try {
    await ensureSchema();
    return success(await getStudentById(await getStudentId(params)));
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(request, { params }) {
  try {
    return await handleUpdate(request, params);
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request, { params }) {
  try {
    return await handleUpdate(request, params);
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    await ensureSchema();
    await deleteStudent(await getStudentId(params));
    return noContent();
  } catch (error) {
    return failure(error);
  }
}
