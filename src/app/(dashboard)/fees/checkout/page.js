import { ensureSchema } from "../../../../db/ensureSchema.js";
import { listClasses } from "../../../../services/classService.js";
import { listFeeAssignments } from "../../../../services/feeService.js";
import { listInstitutions } from "../../../../services/institutionService.js";
import { FeesCheckoutPageClient } from "../../../../components/dashboard/fees-checkout-page-client.js";
import { getScopedInstitutionId, requireDashboardUser } from "../../../../lib/auth.js";

export const dynamic = "force-dynamic";

export default async function FeesCheckoutPage({ searchParams }) {
  const user = await requireDashboardUser("fees.read");
  let invoices = [];
  let institutions = [];
  let classes = [];
  const params = await searchParams;
  const institutionId = getScopedInstitutionId(user, params?.institutionId || undefined);

  try {
    await ensureSchema();
    [invoices, institutions, classes] = await Promise.all([
      listFeeAssignments({ institutionId }),
      listInstitutions({ institutionId: getScopedInstitutionId(user, undefined) }),
      listClasses({ institutionId })
    ]);
  } catch {
    invoices = [];
    institutions = [];
    classes = [];
  }

  return (
    <FeesCheckoutPageClient
      currentUser={user}
      invoices={invoices}
      institutions={institutions}
      classes={classes}
      defaultFilters={{
        view: typeof params?.view === "string" ? params.view : "table",
        institutionId: institutionId || "",
        classId: typeof params?.classId === "string" ? params.classId : "ALL",
        academicYear: typeof params?.academicYear === "string" ? params.academicYear : "ALL",
        search: typeof params?.search === "string" ? params.search : ""
      }}
    />
  );
}
