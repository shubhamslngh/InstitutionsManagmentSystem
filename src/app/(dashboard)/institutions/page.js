import { ensureSchema } from "../../../db/ensureSchema.js";
import { listInstitutions } from "../../../services/institutionService.js";
import { InstitutionsPageClient } from "../../../components/dashboard/institutions-page-client.js";
import { getScopedInstitutionId, requireDashboardUser } from "../../../lib/auth.js";

export const dynamic = "force-dynamic";

export default async function InstitutionsPage() {
  const user = await requireDashboardUser("institutions.read");
  let institutions = [];
  let error = null;

  try {
    await ensureSchema();
    institutions = await listInstitutions({ institutionId: getScopedInstitutionId(user, undefined) });
  } catch (cause) {
    error = cause.message;
  }

  return <InstitutionsPageClient currentUser={user} initialInstitutions={institutions} initialError={error} />;
}
