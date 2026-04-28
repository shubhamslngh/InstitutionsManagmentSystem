import { ensureSchema } from "../../../../db/ensureSchema.js";
import { createFeeStructure, listFeeStructures } from "../../../../services/feeService.js";
import { assertApiInstitutionAccess, requireApiPermission, resolveScopedInstitutionId } from "../../../../lib/apiAuth.js";
import { created, failure, success } from "../../../../utils/api.js";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    await ensureSchema();
    const user = await requireApiPermission(request, "fees.read");
    const { searchParams } = new URL(request.url);
    return success(
      await listFeeStructures({
        institutionId: resolveScopedInstitutionId(user, searchParams.get("institutionId") || undefined),
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
    const user = await requireApiPermission(request, "fees.manage");
    const body = await request.json();
    assertApiInstitutionAccess(user, body.institutionId);
    return created("Fee structure created successfully.", await createFeeStructure(body));
  } catch (error) {
    return failure(error);
  }
}
