import { ensureSchema } from "../../../../db/ensureSchema.js";
import { listFeeAssignments } from "../../../../services/feeService.js";
import { listInstitutions } from "../../../../services/institutionService.js";
import { listStudents } from "../../../../services/studentService.js";
import { InvoicesPageClient } from "../../../../components/dashboard/invoices-page-client.js";
import { getScopedInstitutionId, requireDashboardUser } from "../../../../lib/auth.js";

export const dynamic = "force-dynamic";

export default async function InvoicesPage({ searchParams }) {
  const user = await requireDashboardUser("fees.read");
  let invoices = [];
  let students = [];
  let institutions = [];
  const params = await searchParams;
  const institutionId = getScopedInstitutionId(user, params?.institutionId || undefined);

  try {
    await ensureSchema();
    [invoices, students, institutions] = await Promise.all([
      listFeeAssignments({ institutionId }),
      listStudents({ institutionId }),
      listInstitutions({ institutionId: getScopedInstitutionId(user, undefined) })
    ]);
  } catch {
    invoices = [];
    students = [];
    institutions = [];
  }

  return (
    <InvoicesPageClient
      currentUser={user}
      initialInvoices={invoices}
      students={students}
      institutions={institutions}
    />
  );
}
