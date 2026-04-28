import { ensureSchema } from "../../../../db/ensureSchema.js";
import { assertApiInstitutionAccess, requireApiPermission } from "../../../../lib/apiAuth.js";
import { getClassById } from "../../../../services/classService.js";
import { promoteStudents } from "../../../../services/studentService.js";
import { failure, success } from "../../../../utils/api.js";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    await ensureSchema();
    const user = await requireApiPermission(request, "students.promote");
    const body = await request.json();
    const targetClass = await getClassById(body.targetClassId);
    assertApiInstitutionAccess(user, targetClass.institutionId);
    return success(await promoteStudents(body));
  } catch (error) {
    return failure(error);
  }
}
