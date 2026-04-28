import { ensureSchema } from "../../db/ensureSchema.js";
import { listInstitutions } from "../../services/institutionService.js";
import { DashboardShell } from "../../components/dashboard/dashboard-shell.js";
import { getScopedInstitutionId, requireDashboardUser } from "../../lib/auth.js";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }) {
  let institutions = [];
  const user = await requireDashboardUser();

  try {
    await ensureSchema();
    const scopedInstitutionId = getScopedInstitutionId(user, undefined);
    institutions = await listInstitutions({ institutionId: scopedInstitutionId });
  } catch {
    institutions = [];
  }

  return <DashboardShell currentUser={user} institutions={institutions}>{children}</DashboardShell>;
}
