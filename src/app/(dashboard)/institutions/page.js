import { ensureSchema } from "../../../db/ensureSchema.js";
import { listInstitutions } from "../../../services/institutionService.js";
import { InstitutionsPageClient } from "../../../components/dashboard/institutions-page-client.js";

export const dynamic = "force-dynamic";

export default async function InstitutionsPage() {
  let institutions = [];
  let error = null;

  try {
    await ensureSchema();
    institutions = await listInstitutions();
  } catch (cause) {
    error = cause.message;
  }

  return <InstitutionsPageClient initialInstitutions={institutions} initialError={error} />;
}
