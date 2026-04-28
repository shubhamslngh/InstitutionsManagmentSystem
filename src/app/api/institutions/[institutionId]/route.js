import { ensureSchema } from "../../../../db/ensureSchema.js";
import {
  deleteInstitution,
  getInstitutionById,
  updateInstitution
} from "../../../../services/institutionService.js";
import { assertApiInstitutionAccess, requireApiPermission } from "../../../../lib/apiAuth.js";
import { failure, noContent, success } from "../../../../utils/api.js";

export const runtime = "nodejs";

export async function GET(request, context) {
  try {
    await ensureSchema();
    const user = await requireApiPermission(request, "institutions.read");
    const institution = await getInstitutionById(context.params.institutionId);
    assertApiInstitutionAccess(user, institution.id);
    return success(institution);
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(request, context) {
  try {
    await ensureSchema();
    const user = await requireApiPermission(request, "institutions.manage");
    const institution = await getInstitutionById(context.params.institutionId);
    assertApiInstitutionAccess(user, institution.id);
    const body = await request.json();
    return success(await updateInstitution(context.params.institutionId, body));
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request, context) {
  try {
    await ensureSchema();
    const user = await requireApiPermission(request, "institutions.manage");
    const institution = await getInstitutionById(context.params.institutionId);
    assertApiInstitutionAccess(user, institution.id);
    await deleteInstitution(context.params.institutionId);
    return noContent();
  } catch (error) {
    return failure(error);
  }
}
