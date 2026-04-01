import { ensureSchema } from "../../../db/ensureSchema.js";
import { listClasses } from "../../../services/classService.js";
import { listInstitutions } from "../../../services/institutionService.js";
import { ClassesPageClient } from "../../../components/dashboard/classes-page-client.js";

export const dynamic = "force-dynamic";

export default async function ClassesPage({ searchParams }) {
  let classes = [];
  let institutions = [];
  let error = null;
  const params = await searchParams;
  const institutionId = params?.institutionId || undefined;

  try {
    await ensureSchema();
    [classes, institutions] = await Promise.all([
      listClasses({ institutionId }),
      listInstitutions()
    ]);
  } catch (cause) {
    error = cause.message;
  }

  return (
    <ClassesPageClient
      classes={classes}
      institutions={institutions}
      initialError={error}
      defaultInstitutionId={institutionId || ""}
    />
  );
}
