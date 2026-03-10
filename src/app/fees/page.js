import AppShell from "../../components/AppShell.js";
import { ensureSchema } from "../../db/ensureSchema.js";
import { listClasses } from "../../services/classService.js";
import { listInstitutions } from "../../services/institutionService.js";
import { listStudents } from "../../services/studentService.js";
import { listFeeAssignments, listFeeStructures, listPayments } from "../../services/feeService.js";
import FeeManager from "../../components/FeeManager.js";

export const dynamic = "force-dynamic";

export default async function FeesPage() {
  let structures = [];
  let invoices = [];
  let payments = [];
  let institutions = [];
  let students = [];
  let classes = [];
  let error = null;

  try {
    await ensureSchema();
    [structures, invoices, payments, institutions, students, classes] = await Promise.all([
      listFeeStructures(),
      listFeeAssignments(),
      listPayments(),
      listInstitutions(),
      listStudents(),
      listClasses()
    ]);
  } catch (cause) {
    error = cause.message;
  }

  return (
    <AppShell
      description="Run fee setup, class billing, monthly ledgers, invoices, and collections from one finance workspace."
      eyebrow="Finance Desk"
      title="Structures, invoices, and payments"
    >
      <div>
        <FeeManager
          institutions={institutions}
          classes={classes}
          students={students}
          initialStructures={structures}
          initialInvoices={invoices}
          initialPayments={payments}
          initialError={error}
        />
      </div>
    </AppShell>
  );
}
