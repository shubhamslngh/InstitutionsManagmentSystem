import { ensureSchema } from "../../../../db/ensureSchema.js";
import {
  deleteMonthlyFeeLedger,
  getMonthlyFeeLedger,
  toggleMonthlyLedgerMonth
} from "../../../../services/feeService.js";
import { failure, success } from "../../../../utils/api.js";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    await ensureSchema();
    const { searchParams } = new URL(request.url);
    return success(
      await getMonthlyFeeLedger({
        institutionId: searchParams.get("institutionId") || undefined,
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
    const body = await request.json();
    return success(await toggleMonthlyLedgerMonth(body));
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request) {
  try {
    await ensureSchema();
    const body = await request.json();
    return success(await deleteMonthlyFeeLedger(body));
  } catch (error) {
    return failure(error);
  }
}
