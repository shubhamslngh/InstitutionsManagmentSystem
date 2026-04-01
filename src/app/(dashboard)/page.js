import { ensureSchema } from "../../db/ensureSchema.js";
import { getDashboardSnapshot } from "../../services/dashboardService.js";
import { OverviewPageClient } from "../../components/dashboard/overview-page-client.js";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }) {
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
  const params = await searchParams;
  const institutionId = params?.institutionId || undefined;

  try {
    await ensureSchema();
    snapshot = await getDashboardSnapshot({ institutionId });
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
