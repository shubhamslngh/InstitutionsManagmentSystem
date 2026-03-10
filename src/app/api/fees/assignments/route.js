import { ensureSchema } from "../../../../db/ensureSchema.js";
import { createFeeAssignment, listFeeAssignments } from "../../../../services/feeService.js";
import { created, failure, success } from "../../../../utils/api.js";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    await ensureSchema();
    const { searchParams } = new URL(request.url);
    return success(
      await listFeeAssignments({
        institutionId: searchParams.get("institutionId") || undefined,
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
    const body = await request.json();
    return created("Fee invoice created successfully.", await createFeeAssignment(body));
  } catch (error) {
    return failure(error);
  }
}
