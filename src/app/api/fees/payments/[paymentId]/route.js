import { ensureSchema } from "../../../../../db/ensureSchema.js";
import { query } from "../../../../../db/index.js";
import { deletePayment } from "../../../../../services/feeService.js";
import { assertApiInstitutionAccess, requireApiPermission } from "../../../../../lib/apiAuth.js";
import { failure, noContent } from "../../../../../utils/api.js";

export const runtime = "nodejs";

export async function DELETE(request, context) {
  try {
    await ensureSchema();
    const user = await requireApiPermission(request, "payments.manage");
    const paymentResult = await query("SELECT institution_id FROM fee_payments WHERE id = $1", [context.params.paymentId]);
    assertApiInstitutionAccess(user, paymentResult.rows[0]?.institution_id || null);
    await deletePayment(context.params.paymentId);
    return noContent();
  } catch (error) {
    return failure(error);
  }
}
