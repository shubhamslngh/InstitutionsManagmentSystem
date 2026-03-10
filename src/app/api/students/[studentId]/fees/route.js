import { ensureSchema } from "../../../../../db/ensureSchema.js";
import { getStudentFeeSummary } from "../../../../../services/feeService.js";
import { failure, success } from "../../../../../utils/api.js";

export const runtime = "nodejs";

export async function GET(request, context) {
  try {
    await ensureSchema();
    return success(await getStudentFeeSummary(context.params.studentId));
  } catch (error) {
    return failure(error);
  }
}
