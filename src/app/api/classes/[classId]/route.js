import { ensureSchema } from "../../../../db/ensureSchema.js";
import { deleteClass, getClassById, updateClass } from "../../../../services/classService.js";
import { assertApiInstitutionAccess, requireApiPermission } from "../../../../lib/apiAuth.js";
import { failure, noContent, success } from "../../../../utils/api.js";

export const runtime = "nodejs";

export async function GET(request, context) {
  try {
    await ensureSchema();
    const user = await requireApiPermission(request, "classes.read");
    const academicClass = await getClassById(context.params.classId);
    assertApiInstitutionAccess(user, academicClass.institutionId);
    return success(academicClass);
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(request, context) {
  try {
    await ensureSchema();
    const user = await requireApiPermission(request, "classes.manage");
    const academicClass = await getClassById(context.params.classId);
    assertApiInstitutionAccess(user, academicClass.institutionId);
    const body = await request.json();
    return success(await updateClass(context.params.classId, body));
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request, context) {
  try {
    await ensureSchema();
    const user = await requireApiPermission(request, "classes.manage");
    const academicClass = await getClassById(context.params.classId);
    assertApiInstitutionAccess(user, academicClass.institutionId);
    await deleteClass(context.params.classId);
    return noContent();
  } catch (error) {
    return failure(error);
  }
}
