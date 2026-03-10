"use client";

import { CreditCard, IndianRupee, Receipt, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.js";
import { MetricCard } from "./metric-card.js";
import { StatusBadge } from "./status-badge.js";
import { FeesOverviewChart } from "../charts/fees-overview-chart.js";
import { formatCurrency } from "../../lib/currency.js";
import { formatDate } from "../../lib/dateFormat.js";

export function FeesDashboardClient({ invoices, payments, institutions }) {
  const totals = invoices.reduce(
    (acc, invoice) => {
      acc.totalFees += Number(invoice.grossAmount || 0);
      acc.totalPaid += Number(invoice.totalPaid || 0);
      acc.totalPending += Number(invoice.balance || 0);
      acc.totalDiscount += Number(invoice.discountAmount || 0);
      return acc;
    },
    { totalFees: 0, totalPaid: 0, totalPending: 0, totalDiscount: 0 }
  );

  const chartData = institutions.map((institution) => {
    const institutionInvoices = invoices.filter((invoice) => invoice.institutionId === institution.id);

    return {
      label: institution.name,
      paid: institutionInvoices.reduce((sum, item) => sum + Number(item.totalPaid || 0), 0),
      pending: institutionInvoices.reduce((sum, item) => sum + Number(item.balance || 0), 0)
    };
  });

  const recentPayments = payments.slice(0, 6);
  const recentInvoices = invoices.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Receipt} label="Total Fees" value={formatCurrency(totals.totalFees)} />
        <MetricCard icon={Wallet} label="Total Paid" value={formatCurrency(totals.totalPaid)} tone="success" />
        <MetricCard icon={CreditCard} label="Total Pending" value={formatCurrency(totals.totalPending)} tone="danger" />
        <MetricCard icon={IndianRupee} label="Total Discount" value={formatCurrency(totals.totalDiscount)} tone="warning" />
      </div>

      <div className="dashboard-grid">
        <Card>
          <CardHeader>
            <CardTitle>Collections by Institution</CardTitle>
          </CardHeader>
          <CardContent>
            <FeesOverviewChart data={chartData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
            ) : (
              recentPayments.map((payment) => (
                <div className="flex items-center justify-between rounded-md border p-4" key={payment.id}>
                  <div>
                    <p className="font-medium">{formatCurrency(payment.amount)}</p>
                    <p className="text-xs text-muted-foreground">{payment.paymentMethod} • {formatDate(payment.paymentDate)}</p>
                  </div>
                  <StatusBadge status="PAID" />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recentInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices created yet.</p>
          ) : (
            recentInvoices.map((invoice) => (
              <div className="flex flex-col gap-3 rounded-md border p-4 md:flex-row md:items-center md:justify-between" key={invoice.id}>
                <div>
                  <p className="font-medium">{invoice.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Net {formatCurrency(invoice.netAmount)} • Due {formatDate(invoice.dueDate)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(invoice.balance)}</p>
                    <p className="text-xs text-muted-foreground">Outstanding</p>
                  </div>
                  <StatusBadge status={invoice.status} />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
