import { ensureSchema } from "../../../../db/ensureSchema.js";
import { getFeeInvoiceReceiptDetails, listPayments, recordFeePayment } from "../../../../services/feeService.js";
import { assertApiInstitutionAccess, requireApiPermission, resolveScopedInstitutionId } from "../../../../lib/apiAuth.js";
import { created, failure, success } from "../../../../utils/api.js";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    await ensureSchema();
    const user = await requireApiPermission(request, "fees.read");
    const { searchParams } = new URL(request.url);
    return success(
      await listPayments({
        institutionId: resolveScopedInstitutionId(user, searchParams.get("institutionId") || undefined),
        studentId: searchParams.get("studentId") || undefined
      })
    );
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request) {
  try {
    await ensureSchema();
    const user = await requireApiPermission(request, "payments.manage");
    const body = await request.json();
    const invoice = await getFeeInvoiceReceiptDetails(body.feeInvoiceId);
    assertApiInstitutionAccess(user, invoice.institutionId);
    return created("Fee payment recorded successfully.", await recordFeePayment(body));
  } catch (error) {
    return failure(error);
  }
}
