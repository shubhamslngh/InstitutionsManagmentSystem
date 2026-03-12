import { ensureSchema } from "../../../../../db/ensureSchema.js";
import {
  assignClassFeesToStudent,
  assignFeesToWholeClass
} from "../../../../../services/feeService.js";
import { created, failure } from "../../../../../utils/api.js";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    await ensureSchema();
    const body = await request.json();
    const data = body.classId
      ? await assignFeesToWholeClass(body)
      : await assignClassFeesToStudent(body);
    return created("Class fees assigned successfully.", data);
  } catch (error) {
    return failure(error);
  }
}
