import { ensureSchema } from "../../../db/ensureSchema.js";
import { listClasses } from "../../../services/classService.js";
import { listFeeAssignments, listFeeStructures, listPayments } from "../../../services/feeService.js";
import { listInstitutions } from "../../../services/institutionService.js";
import { FeesDashboardClient } from "../../../components/dashboard/fees-dashboard-client.js";

export const dynamic = "force-dynamic";

export default async function FeesPage() {
  let invoices = [];
  let payments = [];
  let institutions = [];
  let classes = [];
  let structures = [];

  try {
    await ensureSchema();
    [invoices, payments, institutions, classes, structures] = await Promise.all([
      listFeeAssignments(),
      listPayments(),
      listInstitutions(),
      listClasses(),
      listFeeStructures()
    ]);
  } catch {
    invoices = [];
    payments = [];
    institutions = [];
    classes = [];
    structures = [];
  }

  return (
    <FeesDashboardClient
      invoices={invoices}
      payments={payments}
      institutions={institutions}
      classes={classes}
      structures={structures}
    />
  );
}
