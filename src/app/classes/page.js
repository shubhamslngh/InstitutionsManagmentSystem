import AppShell from "../../components/AppShell.js";
import Link from "next/link";
import ClassManager from "../../components/ClassManager.js";
import { ensureSchema } from "../../db/ensureSchema.js";
import { listClasses } from "../../services/classService.js";
import { listInstitutions } from "../../services/institutionService.js";

export const dynamic = "force-dynamic";

export default async function ClassesPage() {
  let classes = [];
  let institutions = [];
  let error = null;

  try {
    await ensureSchema();
    [classes, institutions] = await Promise.all([listClasses(), listInstitutions()]);
  } catch (cause) {
    error = cause.message;
  }

  return (
    <AppShell
      description="Organize each institution into classes and sections that drive admissions and fee plans."
      eyebrow="Class Desk"
      title="Class and section management"
    >
      <div>
        <ClassManager initialClasses={classes} institutions={institutions} initialError={error} />
      </div>
    </AppShell>
  );
}
