import { ensureSchema } from "../../../db/ensureSchema.js";
import { createStudent, listStudents } from "../../../services/studentService.js";
import { created, failure, success } from "../../../utils/api.js";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    await ensureSchema();
    const { searchParams } = new URL(request.url);
    return success(
      await listStudents({
        institutionId: searchParams.get("institutionId") || undefined
      })
    );
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request) {
  try {
    await ensureSchema();
    const body = await request.json();
    return created("Student created successfully.", await createStudent(body));
  } catch (error) {
    return failure(error);
  }
}
