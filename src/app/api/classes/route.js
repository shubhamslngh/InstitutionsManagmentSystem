import { ensureSchema } from "../../../db/ensureSchema.js";
import { createClass, listClasses } from "../../../services/classService.js";
import { assertApiInstitutionAccess, requireApiPermission, resolveScopedInstitutionId } from "../../../lib/apiAuth.js";
import { created, failure, success } from "../../../utils/api.js";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    await ensureSchema();
    const user = await requireApiPermission(request, "classes.read");
    const { searchParams } = new URL(request.url);
    return success(
      await listClasses({
        institutionId: resolveScopedInstitutionId(user, searchParams.get("institutionId") || undefined)
      })
    );
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request) {
  try {
    await ensureSchema();
    const user = await requireApiPermission(request, "classes.manage");
    const body = await request.json();
    assertApiInstitutionAccess(user, body.institutionId);
    return created("Class created successfully.", await createClass(body));
  } catch (error) {
    return failure(error);
  }
}
