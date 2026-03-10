import { ensureSchema } from "../../../../../db/ensureSchema.js";
import {
  deleteFeeInvoice,
  updateFeeInvoice
} from "../../../../../services/feeService.js";
import { failure, noContent, success } from "../../../../../utils/api.js";

export const runtime = "nodejs";

export async function PATCH(request, context) {
  try {
    await ensureSchema();
    const body = await request.json();
    return success(await updateFeeInvoice(context.params.feeInvoiceId, body));
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request, context) {
  try {
    await ensureSchema();
    await deleteFeeInvoice(context.params.feeInvoiceId);
    return noContent();
  } catch (error) {
    return failure(error);
  }
}
