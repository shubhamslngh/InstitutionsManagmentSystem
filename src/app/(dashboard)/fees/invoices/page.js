import { ensureSchema } from "../../../../db/ensureSchema.js";
import { listFeeAssignments } from "../../../../services/feeService.js";
import { listInstitutions } from "../../../../services/institutionService.js";
import { listStudents } from "../../../../services/studentService.js";
import { InvoicesPageClient } from "../../../../components/dashboard/invoices-page-client.js";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  let invoices = [];
  let students = [];
  let institutions = [];

  try {
    await ensureSchema();
    [invoices, students, institutions] = await Promise.all([
      listFeeAssignments(),
      listStudents(),
      listInstitutions()
    ]);
  } catch {
    invoices = [];
    students = [];
    institutions = [];
  }

  return (
    <InvoicesPageClient
      initialInvoices={invoices}
      students={students}
      institutions={institutions}
    />
  );
}
