import { ensureSchema } from "../../../db/ensureSchema.js";
import { listClasses } from "../../../services/classService.js";
import { listInstitutions } from "../../../services/institutionService.js";
import { ClassesPageClient } from "../../../components/dashboard/classes-page-client.js";
import { getScopedInstitutionId, requireDashboardUser } from "../../../lib/auth.js";

export const dynamic = "force-dynamic";

export default async function ClassesPage({ searchParams }) {
  const user = await requireDashboardUser("classes.read");
  let classes = [];
  let institutions = [];
  let error = null;
  const params = await searchParams;
  const institutionId = getScopedInstitutionId(user, params?.institutionId || undefined);

  try {
    await ensureSchema();
    [classes, institutions] = await Promise.all([
      listClasses({ institutionId }),
      listInstitutions({ institutionId: getScopedInstitutionId(user, undefined) })
    ]);
  } catch (cause) {
    error = cause.message;
  }

  return (
    <ClassesPageClient
      currentUser={user}
      classes={classes}
      institutions={institutions}
      initialError={error}
      defaultInstitutionId={institutionId || ""}
    />
  );
}
