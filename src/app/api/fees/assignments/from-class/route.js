import { ensureSchema } from "../../../../../db/ensureSchema.js";
import { assignClassFeesToStudent } from "../../../../../services/feeService.js";
import { created, failure } from "../../../../../utils/api.js";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    await ensureSchema();
    const body = await request.json();
    return created("Class fees assigned successfully.", await assignClassFeesToStudent(body));
  } catch (error) {
    return failure(error);
  }
}
