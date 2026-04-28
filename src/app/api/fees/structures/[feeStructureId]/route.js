import { ensureSchema } from "../../../../../db/ensureSchema.js";
import {
  deleteFeeStructure,
  getFeeStructureById,
  updateFeeStructure
} from "../../../../../services/feeService.js";
import { assertApiInstitutionAccess, requireApiPermission } from "../../../../../lib/apiAuth.js";
import { failure, noContent, success } from "../../../../../utils/api.js";

export const runtime = "nodejs";

export async function GET(request, context) {
  try {
    await ensureSchema();
    const user = await requireApiPermission(request, "fees.read");
    const structure = await getFeeStructureById(context.params.feeStructureId);
    assertApiInstitutionAccess(user, structure.institutionId);
    return success(structure);
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(request, context) {
  try {
    await ensureSchema();
    const user = await requireApiPermission(request, "fees.manage");
    const structure = await getFeeStructureById(context.params.feeStructureId);
    assertApiInstitutionAccess(user, structure.institutionId);
    const body = await request.json();
    return success(await updateFeeStructure(context.params.feeStructureId, body));
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request, context) {
  try {
    await ensureSchema();
    const user = await requireApiPermission(request, "fees.manage");
    const structure = await getFeeStructureById(context.params.feeStructureId);
    assertApiInstitutionAccess(user, structure.institutionId);
    await deleteFeeStructure(context.params.feeStructureId);
    return noContent();
  } catch (error) {
    return failure(error);
  }
}
