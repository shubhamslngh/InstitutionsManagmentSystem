import AppShell from "../../components/AppShell.js";
import Link from "next/link";
import { ensureSchema } from "../../db/ensureSchema.js";
import { listInstitutions } from "../../services/institutionService.js";
import InstitutionManager from "../../components/InstitutionManager.js";

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

  return (
    <AppShell
      description="Control your campuses from a single directory and keep them ready for admissions and billing."
      eyebrow="Institution Desk"
      title="School and college registry"
    >
      <section className="panel">
        <InstitutionManager initialInstitutions={institutions} initialError={error} />
      </section>
    </AppShell>
  );
}
