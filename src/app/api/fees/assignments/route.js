import { ensureSchema } from "../../../../db/ensureSchema.js";
import { createFeeAssignment, listFeeAssignments } from "../../../../services/feeService.js";
import { assertApiInstitutionAccess, requireApiPermission, resolveScopedInstitutionId } from "../../../../lib/apiAuth.js";
import { getStudentById } from "../../../../services/studentService.js";
import { created, failure, success } from "../../../../utils/api.js";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    await ensureSchema();
    const user = await requireApiPermission(request, "fees.read");
    const { searchParams } = new URL(request.url);
    return success(
      await listFeeAssignments({
        institutionId: resolveScopedInstitutionId(user, searchParams.get("institutionId") || undefined),
        studentId: searchParams.get("studentId") || undefined
      })
    );
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request) {
  try {
    await ensureSchema();
    const user = await requireApiPermission(request, "fees.manage");
    const body = await request.json();
    const student = await getStudentById(body.studentId);
    assertApiInstitutionAccess(user, student.institutionId);
    return created("Fee invoice created successfully.", await createFeeAssignment(body));
  } catch (error) {
    return failure(error);
  }
}
