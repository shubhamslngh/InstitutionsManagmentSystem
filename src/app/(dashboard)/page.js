import { ensureSchema } from "../../db/ensureSchema.js";
import { getDashboardSnapshot } from "../../services/dashboardService.js";
import { OverviewPageClient } from "../../components/dashboard/overview-page-client.js";
import { USER_ROLES } from "../../lib/auth.js";
import { getScopedInstitutionId, requireDashboardUser } from "../../lib/auth.js";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }) {
  const user = await requireDashboardUser("dashboard.view");
  let snapshot = {
    context: {
      institutionId: null,
      institutionName: null
    },
    totals: {
      institutions: 0,
      classes: 0,
      feeStructures: 0,
      students: 0,
      invoices: 0,
      collections: 0,
      outstanding: 0
    },
    recentInvoices: []
  };
  const params = await searchParams;
  const institutionId =
    user.role === USER_ROLES.SUPER_ADMIN
      ? undefined
      : getScopedInstitutionId(user, params?.institutionId || undefined);

  try {
    await ensureSchema();
    snapshot = await getDashboardSnapshot({ institutionId });
  } catch {
    snapshot = {
      context: {
        institutionId: institutionId || null,
        institutionName: null
      },
      totals: {
        institutions: 0,
        classes: 0,
        feeStructures: 0,
        students: 0,
        invoices: 0,
        collections: 0,
        outstanding: 0
      },
      recentInvoices: []
    };
  }

  return <OverviewPageClient snapshot={snapshot} userRole={user.role} />;
}
