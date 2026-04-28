import { ensureSchema } from "../../../db/ensureSchema.js";
import { createStudent, listStudents } from "../../../services/studentService.js";
import { assertApiInstitutionAccess, requireApiPermission, resolveScopedInstitutionId } from "../../../lib/apiAuth.js";
import { created, failure, success } from "../../../utils/api.js";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    await ensureSchema();
    const user = await requireApiPermission(request, "students.read");
    const { searchParams } = new URL(request.url);
    return success(
      await listStudents({
        institutionId: resolveScopedInstitutionId(user, searchParams.get("institutionId") || undefined)
      })
    );
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request) {
  try {
    await ensureSchema();
    const user = await requireApiPermission(request, "students.manage");
    const body = await request.json();
    assertApiInstitutionAccess(user, body.institutionId);
    return created("Student created successfully.", await createStudent(body));
  } catch (error) {
    return failure(error);
  }
}
