import { ensureSchema } from "../../../../../db/ensureSchema.js";
import {
  assignClassFeesToStudent,
  assignFeesToWholeClass
} from "../../../../../services/feeService.js";
import { assertApiInstitutionAccess, requireApiPermission } from "../../../../../lib/apiAuth.js";
import { getClassById } from "../../../../../services/classService.js";
import { getStudentById } from "../../../../../services/studentService.js";
import { created, failure } from "../../../../../utils/api.js";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    await ensureSchema();
    const user = await requireApiPermission(request, "fees.manage");
    const body = await request.json();
    if (body.classId) {
      const academicClass = await getClassById(body.classId);
      assertApiInstitutionAccess(user, academicClass.institutionId);
    } else {
      const student = await getStudentById(body.studentId);
      assertApiInstitutionAccess(user, student.institutionId);
    }
    const data = body.classId
      ? await assignFeesToWholeClass(body)
      : await assignClassFeesToStudent(body);
    return created("Class fees assigned successfully.", data);
  } catch (error) {
    return failure(error);
  }
}
