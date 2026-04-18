import { ensureSchema } from "../../../../../db/ensureSchema.js";
import { getStudentFeeSummary, settleStudentDuesTillDate } from "../../../../../services/feeService.js";
import { failure, success } from "../../../../../utils/api.js";

export const runtime = "nodejs";

export async function GET(request, context) {
  try {
    await ensureSchema();
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
