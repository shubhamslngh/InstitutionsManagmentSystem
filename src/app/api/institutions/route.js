import { ensureSchema } from "../../../db/ensureSchema.js";
import { createInstitution, listInstitutions } from "../../../services/institutionService.js";
import { requireApiPermission, resolveScopedInstitutionId } from "../../../lib/apiAuth.js";
import { created, failure, success } from "../../../utils/api.js";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    await ensureSchema();
    const user = await requireApiPermission(request, "institutions.read");
    return success(await listInstitutions({ institutionId: resolveScopedInstitutionId(user, undefined) }));
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request) {
  try {
    await ensureSchema();
    await requireApiPermission(request, "institutions.manage");
    const body = await request.json();
    return created("Institution created successfully.", await createInstitution(body));
  } catch (error) {
    return failure(error);
  }
}
