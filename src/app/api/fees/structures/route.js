import { ensureSchema } from "../../../../db/ensureSchema.js";
import { createFeeStructure, listFeeStructures } from "../../../../services/feeService.js";
import { created, failure, success } from "../../../../utils/api.js";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    await ensureSchema();
    const { searchParams } = new URL(request.url);
    return success(
      await listFeeStructures({
        institutionId: searchParams.get("institutionId") || undefined,
        classId: searchParams.get("classId") || undefined
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
    return created("Fee structure created successfully.", await createFeeStructure(body));
  } catch (error) {
    return failure(error);
  }
}
