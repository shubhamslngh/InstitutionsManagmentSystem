import { ensureSchema } from "../../db/ensureSchema.js";
import { listInstitutions } from "../../services/institutionService.js";
import { DashboardShell } from "../../components/dashboard/dashboard-shell.js";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }) {
  let institutions = [];

  try {
    await ensureSchema();
    institutions = await listInstitutions();
  } catch {
    institutions = [];
  }

  return <DashboardShell institutions={institutions}>{children}</DashboardShell>;
}
