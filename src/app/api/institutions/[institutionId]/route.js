import { ensureSchema } from "../../../../db/ensureSchema.js";
import {
  deleteInstitution,
  getInstitutionById,
  updateInstitution
} from "../../../../services/institutionService.js";
import { failure, noContent, success } from "../../../../utils/api.js";

export const runtime = "nodejs";

export async function GET(request, context) {
  try {
    await ensureSchema();
    return success(await getInstitutionById(context.params.institutionId));
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(request, context) {
  try {
    await ensureSchema();
    const body = await request.json();
    return success(await updateInstitution(context.params.institutionId, body));
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request, context) {
  try {
    await ensureSchema();
    await deleteInstitution(context.params.institutionId);
    return noContent();
  } catch (error) {
    return failure(error);
  }
}
