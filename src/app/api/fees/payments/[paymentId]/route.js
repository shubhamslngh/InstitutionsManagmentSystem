import { ensureSchema } from "../../../../../db/ensureSchema.js";
import { deletePayment } from "../../../../../services/feeService.js";
import { failure, noContent } from "../../../../../utils/api.js";

export const runtime = "nodejs";

export async function DELETE(request, context) {
  try {
    await ensureSchema();
    await deletePayment(context.params.paymentId);
    return noContent();
  } catch (error) {
    return failure(error);
  }
}
