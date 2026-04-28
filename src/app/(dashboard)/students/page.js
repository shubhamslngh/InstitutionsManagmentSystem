import { ensureSchema } from "../../../db/ensureSchema.js";
import { listClasses } from "../../../services/classService.js";
import { listInstitutions } from "../../../services/institutionService.js";
import { listStudents } from "../../../services/studentService.js";
import { StudentsPageClient } from "../../../components/dashboard/students-page-client.js";
import { getScopedInstitutionId, requireDashboardUser } from "../../../lib/auth.js";

export const dynamic = "force-dynamic";

export default async function StudentsPage({ searchParams }) {
  const user = await requireDashboardUser("students.read");
  let students = [];
  let institutions = [];
  let classes = [];
  let error = null;
  const params = await searchParams;
  const institutionId = getScopedInstitutionId(user, params?.institutionId || undefined);

  try {
    await ensureSchema();
    [students, institutions, classes] = await Promise.all([
      listStudents({ institutionId }),
      listInstitutions({ institutionId: getScopedInstitutionId(user, undefined) }),
      listClasses({ institutionId })
    ]);
  } catch (cause) {
    error = cause.message;
  }

  return (
    <StudentsPageClient
      currentUser={user}
      initialStudents={students}
      institutions={institutions}
      classes={classes}
      initialError={error}
      defaultInstitutionId={institutionId || ""}
    />
  );
}
