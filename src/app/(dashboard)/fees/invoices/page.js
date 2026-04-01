import { ensureSchema } from "../../../../db/ensureSchema.js";
import { listFeeAssignments } from "../../../../services/feeService.js";
import { listInstitutions } from "../../../../services/institutionService.js";
import { listStudents } from "../../../../services/studentService.js";
import { InvoicesPageClient } from "../../../../components/dashboard/invoices-page-client.js";

export const dynamic = "force-dynamic";

export default async function InvoicesPage({ searchParams }) {
  let invoices = [];
  let students = [];
  let institutions = [];
  const params = await searchParams;
  const institutionId = params?.institutionId || undefined;

  try {
    await ensureSchema();
    [invoices, students, institutions] = await Promise.all([
      listFeeAssignments({ institutionId }),
      listStudents({ institutionId }),
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
