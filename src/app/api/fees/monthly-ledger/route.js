import { ensureSchema } from "../../../../db/ensureSchema.js";
import {
  deleteMonthlyFeeLedger,
  getMonthlyFeeLedger,
  toggleMonthlyLedgerMonth
} from "../../../../services/feeService.js";
import { assertApiInstitutionAccess, requireApiPermission, resolveScopedInstitutionId } from "../../../../lib/apiAuth.js";
import { failure, success } from "../../../../utils/api.js";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    await ensureSchema();
    const user = await requireApiPermission(request, "fees.read");
    const { searchParams } = new URL(request.url);
    return success(
      await getMonthlyFeeLedger({
        institutionId: resolveScopedInstitutionId(user, searchParams.get("institutionId") || undefined),
        classId: searchParams.get("classId") || undefined,
        year: searchParams.get("year") || undefined
      })
    );
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request) {
  try {
    await ensureSchema();
    const user = await requireApiPermission(request, "fees.manage");
    const body = await request.json();
    assertApiInstitutionAccess(user, body.institutionId);
    return success(await toggleMonthlyLedgerMonth(body));
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request) {
  try {
    await ensureSchema();
    const user = await requireApiPermission(request, "fees.manage");
    const body = await request.json();
    assertApiInstitutionAccess(user, body.institutionId);
    return success(await deleteMonthlyFeeLedger(body));
  } catch (error) {
    return failure(error);
  }
}
