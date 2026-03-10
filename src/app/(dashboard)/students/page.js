import { ensureSchema } from "../../../db/ensureSchema.js";
import { listClasses } from "../../../services/classService.js";
import { listInstitutions } from "../../../services/institutionService.js";
import { listStudents } from "../../../services/studentService.js";
import { StudentsPageClient } from "../../../components/dashboard/students-page-client.js";

export const dynamic = "force-dynamic";

export default async function StudentsPage({ searchParams }) {
  let students = [];
  let institutions = [];
  let classes = [];
  let error = null;
  const params = await searchParams;

  try {
    await ensureSchema();
    [students, institutions, classes] = await Promise.all([
      listStudents(),
      listInstitutions(),
      listClasses()
    ]);
  } catch (cause) {
    error = cause.message;
  }

  return (
    <StudentsPageClient
      initialStudents={students}
      institutions={institutions}
      classes={classes}
      initialError={error}
      defaultInstitutionId={params?.institutionId || ""}
    />
  );
}
