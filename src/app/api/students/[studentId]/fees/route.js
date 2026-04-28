import { ensureSchema } from "../../../../../db/ensureSchema.js";
import { getStudentFeeSummary, settleStudentDuesTillDate } from "../../../../../services/feeService.js";
import { assertApiInstitutionAccess, requireApiPermission } from "../../../../../lib/apiAuth.js";
import { getStudentById } from "../../../../../services/studentService.js";
import { failure, success } from "../../../../../utils/api.js";

export const runtime = "nodejs";

export async function GET(request, context) {
  try {
    await ensureSchema();
    const user = await requireApiPermission(request, "fees.read");
    const student = await getStudentById(context.params.studentId);
    assertApiInstitutionAccess(user, student.institutionId);
    const { searchParams } = new URL(request.url);
    return success(
      await getStudentFeeSummary(context.params.studentId, {
        cutoffDate: searchParams.get("cutoffDate") || undefined
      })
    );
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request, context) {
  try {
    await ensureSchema();
    const user = await requireApiPermission(request, "payments.manage");
    const student = await getStudentById(context.params.studentId);
    assertApiInstitutionAccess(user, student.institutionId);
    const body = await request.json().catch(() => ({}));
    return success(
      await settleStudentDuesTillDate(context.params.studentId, {
        cutoffDate: body.cutoffDate || undefined,
        paymentMethod: body.paymentMethod || "CASH",
        remarks: body.remarks || ""
      })
    );
  } catch (error) {
    return failure(error);
  }
}
