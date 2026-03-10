import { ensureSchema } from "../../../db/ensureSchema.js";
import { createInstitution, listInstitutions } from "../../../services/institutionService.js";
import { created, failure, success } from "../../../utils/api.js";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureSchema();
    return success(await listInstitutions());
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request) {
  try {
    await ensureSchema();
    const body = await request.json();
    return created("Institution created successfully.", await createInstitution(body));
  } catch (error) {
    return failure(error);
  }
}
