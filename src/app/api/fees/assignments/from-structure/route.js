import { ensureSchema } from "../../../../../db/ensureSchema.js";
import { assignFeeStructureToStudent } from "../../../../../services/feeService.js";
import { assertApiInstitutionAccess, requireApiPermission } from "../../../../../lib/apiAuth.js";
import { getFeeStructureById } from "../../../../../services/feeService.js";
import { getStudentById } from "../../../../../services/studentService.js";
import { created, failure } from "../../../../../utils/api.js";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    await ensureSchema();
    const user = await requireApiPermission(request, "fees.manage");
    const body = await request.json();
    const [student, structure] = await Promise.all([
      getStudentById(body.studentId),
      getFeeStructureById(body.feeStructureId)
    ]);
    assertApiInstitutionAccess(user, student.institutionId);
    assertApiInstitutionAccess(user, structure.institutionId);
    return created(
      "Fee invoice created from structure successfully.",
      await assignFeeStructureToStudent(body)
    );
  } catch (error) {
    return failure(error);
  }
}
