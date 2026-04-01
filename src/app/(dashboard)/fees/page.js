import { ensureSchema } from "../../../db/ensureSchema.js";
import { listClasses } from "../../../services/classService.js";
import { listFeeAssignments, listFeeStructures, listPayments } from "../../../services/feeService.js";
import { listInstitutions } from "../../../services/institutionService.js";
import { FeesDashboardClient } from "../../../components/dashboard/fees-dashboard-client.js";

export const dynamic = "force-dynamic";

export default async function FeesPage({ searchParams }) {
  let invoices = [];
  let payments = [];
  let institutions = [];
  let classes = [];
  let structures = [];
  const params = await searchParams;
  const institutionId = params?.institutionId || undefined;

  try {
    await ensureSchema();
    [invoices, payments, institutions, classes, structures] = await Promise.all([
      listFeeAssignments({ institutionId }),
      listPayments({ institutionId }),
      listInstitutions(),
      listClasses({ institutionId }),
      listFeeStructures({ institutionId })
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
      defaultInstitutionId={institutionId || ""}
    />
  );
}
