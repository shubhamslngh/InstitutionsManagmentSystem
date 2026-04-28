import { ensureSchema } from "../../../../../db/ensureSchema.js";
import {
  deleteFeeInvoice,
  getFeeInvoiceReceiptDetails,
  updateFeeInvoice
} from "../../../../../services/feeService.js";
import { assertApiInstitutionAccess, requireApiPermission } from "../../../../../lib/apiAuth.js";
import { failure, noContent, success } from "../../../../../utils/api.js";

export const runtime = "nodejs";

export async function GET(request, context) {
  try {
    await ensureSchema();
    const user = await requireApiPermission(request, "fees.read");
    const invoice = await getFeeInvoiceReceiptDetails(context.params.feeInvoiceId);
    assertApiInstitutionAccess(user, invoice.institutionId);
    return success(invoice);
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(request, context) {
  try {
    await ensureSchema();
    const user = await requireApiPermission(request, "fees.manage");
    const invoice = await getFeeInvoiceReceiptDetails(context.params.feeInvoiceId);
    assertApiInstitutionAccess(user, invoice.institutionId);
    const body = await request.json();
    return success(await updateFeeInvoice(context.params.feeInvoiceId, body));
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request, context) {
  try {
    await ensureSchema();
    const user = await requireApiPermission(request, "fees.manage");
    const invoice = await getFeeInvoiceReceiptDetails(context.params.feeInvoiceId);
    assertApiInstitutionAccess(user, invoice.institutionId);
    await deleteFeeInvoice(context.params.feeInvoiceId);
    return noContent();
  } catch (error) {
    return failure(error);
  }
}
