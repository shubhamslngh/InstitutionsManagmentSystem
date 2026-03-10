"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, Plus, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button.js";
import { MetricCard } from "./metric-card.js";
import { DataTable } from "../tables/data-table.js";
import { StatusBadge } from "./status-badge.js";
import { formatCurrency } from "../../lib/currency.js";
import { formatDate } from "../../lib/dateFormat.js";
import { InvoiceFormDialog } from "../forms/invoice-form-dialog.js";
import { ConfirmDialog } from "./confirm-dialog.js";

export function InvoicesPageClient({ initialInvoices, students, institutions }) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);

  const totals = useMemo(() => {
    return invoices.reduce(
      (acc, invoice) => {
        acc.gross += Number(invoice.grossAmount || 0);
        acc.net += Number(invoice.netAmount || 0);
        acc.balance += Number(invoice.balance || 0);
        return acc;
      },
      { gross: 0, net: 0, balance: 0 }
    );
  }, [invoices]);

  async function handleDelete(id) {
    const response = await fetch(`/api/fees/assignments/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      toast.error(result.message || "Failed to delete invoice.");
      return;
    }

    setInvoices((current) => current.filter((item) => item.id !== id));
    toast.success("Invoice deleted.");
  }

  function handleSuccess(nextInvoice) {
    setInvoices((current) => {
      const exists = current.some((item) => item.id === nextInvoice.id);
      if (exists) {
        return current.map((item) => (item.id === nextInvoice.id ? nextInvoice : item));
      }

      return [nextInvoice, ...current];
    });
    setEditingInvoice(null);
  }

  const studentNameMap = useMemo(
    () =>
      Object.fromEntries(
        students.map((student) => [
          student.id,
          `${student.firstName} ${student.lastName || ""}`.trim()
        ])
      ),
    [students]
  );

  const columns = [
    {
      accessorFn: (row) => `${row.title} ${studentNameMap[row.studentId] || ""}`,
      id: "title",
      meta: { label: "Title" },
      header: ({ column }) => (
        <button className="inline-flex items-center gap-2" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} type="button">
          Invoice
          <ArrowUpDown className="h-4 w-4" />
        </button>
      ),
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.title}</p>
          <p className="text-xs text-muted-foreground">{formatDate(row.original.dueDate)}</p>
        </div>
      )
    },
    {
      accessorKey: "studentId",
      meta: { label: "Student" },
      header: "Student",
      cell: ({ row }) => {
        const student = students.find((item) => item.id === row.original.studentId);
        const institution = institutions.find((item) => item.id === row.original.institutionId);
        return (
          <div>
            <p className="font-medium">
              {student?.firstName || "Unknown"} {student?.lastName || ""}
            </p>
            <p className="text-xs text-muted-foreground">{institution?.name || "NA"}</p>
          </div>
        );
      }
    },
    {
      accessorKey: "grossAmount",
      meta: { label: "Gross" },
      header: "Gross",
      cell: ({ row }) => formatCurrency(row.original.grossAmount)
    },
    {
      accessorKey: "discountAmount",
      meta: { label: "Discount" },
      header: "Discount",
      cell: ({ row }) => formatCurrency(row.original.discountAmount)
    },
    {
      accessorKey: "netAmount",
      meta: { label: "Net" },
      header: "Net",
      cell: ({ row }) => formatCurrency(row.original.netAmount)
    },
    {
      accessorKey: "totalPaid",
      meta: { label: "Paid" },
      header: "Paid",
      cell: ({ row }) => formatCurrency(row.original.totalPaid)
    },
    {
      accessorKey: "balance",
      meta: { label: "Balance" },
      header: "Balance",
      cell: ({ row }) => formatCurrency(row.original.balance)
    },
    {
      accessorKey: "status",
      meta: { label: "Status" },
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />
    },
    {
      id: "actions",
      meta: { label: "Actions" },
      header: "Actions",
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditingInvoice(row.original);
              setDialogOpen(true);
            }}
          >
            Edit
          </Button>
          <ConfirmDialog
            description={`Delete invoice ${row.original.title}?`}
            onConfirm={() => handleDelete(row.original.id)}
          >
            <Button size="sm" variant="destructive">
              Delete
            </Button>
          </ConfirmDialog>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        <MetricCard icon={ReceiptText} label="Invoice Gross" value={formatCurrency(totals.gross)} />
        <MetricCard icon={ReceiptText} label="Invoice Net" value={formatCurrency(totals.net)} tone="success" />
        <MetricCard icon={ReceiptText} label="Open Balance" value={formatCurrency(totals.balance)} tone="danger" />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      <DataTable
        title="Invoice Ledger"
        columns={columns}
        data={invoices}
        searchPlaceholder="Search invoices by title or student"
        emptyTitle="No invoices created"
        emptyDescription="Create a fee invoice to start tracking gross, discount, paid amount, and balance."
      />

      <InvoiceFormDialog
        open={dialogOpen}
        onOpenChange={(nextOpen) => {
          setDialogOpen(nextOpen);
          if (!nextOpen) {
            setEditingInvoice(null);
          }
        }}
        initialValues={editingInvoice}
        students={students}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
