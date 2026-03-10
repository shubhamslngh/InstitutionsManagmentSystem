import Link from "next/link";
import { Building2, CreditCard, GraduationCap, PlusCircle } from "lucide-react";
import { Button } from "../ui/button.js";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.js";
import { MetricCard } from "./metric-card.js";
import { StatusBadge } from "./status-badge.js";
import { formatCurrency } from "../../lib/currency.js";

export function OverviewPageClient({ snapshot }) {
  const collectionRate =
    snapshot.totals.collections + snapshot.totals.outstanding > 0
      ? Math.round(
          (snapshot.totals.collections /
            (snapshot.totals.collections + snapshot.totals.outstanding)) *
            100
        )
      : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Building2} label="Institutions" value={snapshot.totals.institutions} />
        <MetricCard icon={GraduationCap} label="Students" value={snapshot.totals.students} tone="success" />
        <MetricCard icon={CreditCard} label="Collections" value={formatCurrency(snapshot.totals.collections)} tone="warning" />
        <MetricCard icon={CreditCard} label="Collection Rate" value={`${collectionRate}%`} />
      </div>

      <div className="dashboard-grid">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Recent Invoices</CardTitle>
              <p className="text-sm text-muted-foreground">Latest fee movement across institutions.</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/fees/invoices">View All</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {snapshot.recentInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invoice records yet.</p>
            ) : (
              snapshot.recentInvoices.map((invoice) => (
                <div className="flex flex-col gap-3 rounded-md border p-4 md:flex-row md:items-center md:justify-between" key={invoice.id}>
                  <div>
                    <p className="font-medium">{invoice.first_name} {invoice.last_name || ""}</p>
                    <p className="text-xs text-muted-foreground">{invoice.institution_name} • {invoice.title}</p>
                  </div>
                  <StatusBadge status={invoice.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Button asChild>
              <Link className="flex items-center gap-2" href="/institutions">
                <PlusCircle className="h-4 w-4" />
                Manage Institutions
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link className="flex items-center gap-2" href="/students">
                <PlusCircle className="h-4 w-4" />
                Open Student Desk
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link className="flex items-center gap-2" href="/fees">
                <PlusCircle className="h-4 w-4" />
                Open Fees Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
