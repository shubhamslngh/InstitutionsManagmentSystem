import { ensureSchema } from "../../../db/ensureSchema.js";
import { createClass, listClasses } from "../../../services/classService.js";
import { created, failure, success } from "../../../utils/api.js";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    await ensureSchema();
    const { searchParams } = new URL(request.url);
    return success(
      await listClasses({
        institutionId: searchParams.get("institutionId") || undefined
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
    return created("Class created successfully.", await createClass(body));
  } catch (error) {
    return failure(error);
  }
}
