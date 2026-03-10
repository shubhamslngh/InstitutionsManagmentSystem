import { ensureSchema } from "../../../db/ensureSchema.js";
import { listFeeAssignments, listPayments } from "../../../services/feeService.js";
import { listInstitutions } from "../../../services/institutionService.js";
import { FeesDashboardClient } from "../../../components/dashboard/fees-dashboard-client.js";

export const dynamic = "force-dynamic";

export default async function FeesPage() {
  let invoices = [];
  let payments = [];
  let institutions = [];

  try {
    await ensureSchema();
    [invoices, payments, institutions] = await Promise.all([
      listFeeAssignments(),
      listPayments(),
      listInstitutions()
    ]);
  } catch {
    invoices = [];
    payments = [];
    institutions = [];
  }

  return <FeesDashboardClient invoices={invoices} payments={payments} institutions={institutions} />;
}
