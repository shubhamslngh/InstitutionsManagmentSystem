import { ensureSchema } from "../../../../../db/ensureSchema.js";
import { assignFeeStructureToStudent } from "../../../../../services/feeService.js";
import { created, failure } from "../../../../../utils/api.js";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    await ensureSchema();
    const body = await request.json();
    return created(
      "Fee invoice created from structure successfully.",
      await assignFeeStructureToStudent(body)
    );
  } catch (error) {
    return failure(error);
  }
}
