import { ensureSchema } from "../../db/ensureSchema.js";
import { getDashboardSnapshot } from "../../services/dashboardService.js";
import { OverviewPageClient } from "../../components/dashboard/overview-page-client.js";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let snapshot = {
    totals: {
      institutions: 0,
      students: 0,
      invoices: 0,
      collections: 0,
      outstanding: 0
    },
    recentInvoices: []
  };

  try {
    await ensureSchema();
    snapshot = await getDashboardSnapshot();
  } catch {
    snapshot = {
      totals: {
        institutions: 0,
        students: 0,
        invoices: 0,
        collections: 0,
        outstanding: 0
      },
      recentInvoices: []
    };
  }

  return <OverviewPageClient snapshot={snapshot} />;
}
