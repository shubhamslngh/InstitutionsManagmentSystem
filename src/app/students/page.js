import AppShell from "../../components/AppShell.js";
import { ensureSchema } from "../../db/ensureSchema.js";
import { listClasses } from "../../services/classService.js";
import { listInstitutions } from "../../services/institutionService.js";
import { listStudents } from "../../services/studentService.js";
import StudentManager from "../../components/StudentManager.js";

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  let students = [];
  let institutions = [];
  let classes = [];
  let error = null;

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
    <AppShell
      description="Handle admissions, profile details, and class assignment across institutions."
      eyebrow="Student Desk"
      title="Admissions and records"
    >
      <section className="panel">
        <StudentManager
          initialStudents={students}
          institutions={institutions}
          classes={classes}
          initialError={error}
        />
      </section>
    </AppShell>
  );
}
