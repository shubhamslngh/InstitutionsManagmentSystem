"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, Eye, Printer, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button.js";
import { AnimatedAddButton } from "../ui/animated-add-button.js";
import { MetricCard } from "./metric-card.js";
import { DataTable } from "../tables/data-table.js";
import { StatusBadge } from "./status-badge.js";
import { formatCurrency } from "../../lib/currency.js";
import { formatDate } from "../../lib/dateFormat.js";
import { InvoiceFormDialog } from "../forms/invoice-form-dialog.js";
import { ConfirmDialog } from "./confirm-dialog.js";
import { ReceiptPreview, getPrintableReceiptMarkup } from "./student-fees-dialog.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../ui/dialog.js";
import { can } from "../../lib/permissions.js";

export function InvoicesPageClient({ initialInvoices, students, institutions, currentUser }) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);
  const canManageFees = can(currentUser, "fees.manage");

  useEffect(() => {
    setInvoices(initialInvoices);
    setSelectedInvoiceIds([]);
  }, [initialInvoices]);

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
    if (!canManageFees) {
      return;
    }

    const response = await fetch(`/api/fees/assignments/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      toast.error(result.message || "Failed to delete invoice.");
      return;
    }

    setInvoices((current) => current.filter((item) => item.id !== id));
    setSelectedInvoiceIds((current) => current.filter((item) => item !== id));
    toast.success("Invoice deleted.");
  }

  async function handleBulkDelete() {
    if (!canManageFees) {
      return;
    }

    const deleteResults = await Promise.all(
      selectedInvoiceIds.map(async (id) => {
        const response = await fetch(`/api/fees/assignments/${id}`, { method: "DELETE" });
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result.message || "Failed to delete selected invoices.");
        }

        return id;
      })
    );

    setInvoices((current) => current.filter((item) => !deleteResults.includes(item.id)));
    setSelectedInvoiceIds([]);
    toast.success(`${deleteResults.length} invoice(s) deleted.`);
  }

  function handleSuccess(nextInvoice) {
    setInvoices((current) => {
      const exists = current.some((item) => item.id === nextInvoice.id);
      if (exists) {
        return current.map((item) => (item.id === nextInvoice.id ? nextInvoice : item));
      }

      return [nextInvoice, ...current];
    });
    setSelectedInvoiceIds((current) => current.filter((item) => item !== nextInvoice.id));
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

  async function openReceiptPreview(invoice) {
    setReceiptDialogOpen(true);
    setReceiptLoading(true);
    setReceiptData(null);

    const response = await fetch(`/api/students/${invoice.studentId}/fees`);
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setReceiptLoading(false);
      toast.error(result.message || "Failed to load receipt details.");
      return;
    }

    setReceiptData(result.data?.consolidatedReceipt || null);
    setReceiptLoading(false);
  }

  function toggleInvoiceSelection(invoiceId) {
    setSelectedInvoiceIds((current) =>
      current.includes(invoiceId)
        ? current.filter((item) => item !== invoiceId)
        : [...current, invoiceId]
    );
  }

  function toggleAllInvoicesSelection() {
    setSelectedInvoiceIds((current) =>
      current.length === invoices.length ? [] : invoices.map((invoice) => invoice.id)
    );
  }

  function printReceipt() {
    if (!receiptData) {
      return;
    }

    const markup = getPrintableReceiptMarkup(receiptData);
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");

    iframe.srcdoc = markup;

    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      window.setTimeout(() => {
        iframe.remove();
      }, 1000);
    };

    document.body.appendChild(iframe);
  }

  const columns = [
    {
      id: "select",
      meta: { label: "Select" },
      enableHiding: false,
      header: () => (
        <input
          aria-label="Select all invoices"
          checked={invoices.length > 0 && selectedInvoiceIds.length === invoices.length}
          onChange={toggleAllInvoicesSelection}
          type="checkbox"
        />
      ),
      cell: ({ row }) => (
        <input
          aria-label={`Select invoice ${row.original.title}`}
          checked={selectedInvoiceIds.includes(row.original.id)}
          onChange={() => toggleInvoiceSelection(row.original.id)}
          type="checkbox"
        />
      )
    },
    {
      accessorFn: (row) => `${row.title} ${studentNameMap[row.studentId] || ""}`,
      id: "title",
      meta: { label: "Title" },
      header: ({ column }) => (
        <button
          className="inline-flex items-center gap-2"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          type="button"
        >
          Invoice
          <ArrowUpDown className="h-4 w-4" />
        </button>
      ),
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.title}</p>
          <p className="text-xs text-muted-foreground">
            {row.original.receiptNumber || "NA"} • {formatDate(row.original.dueDate)}
          </p>
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
            onClick={() => openReceiptPreview(row.original)}
            type="button"
          >
            <Eye className="h-4 w-4" />
            Receipt
          </Button>
          {canManageFees ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingInvoice(row.original);
                  setDialogOpen(true);
                }}
                type="button"
              >
                Edit
              </Button>
              <ConfirmDialog
                description={`Delete invoice ${row.original.title}?`}
                onConfirm={() => handleDelete(row.original.id)}
              >
                <Button size="sm" type="button" variant="destructive">
                  Delete
                </Button>
              </ConfirmDialog>
            </>
          ) : null}
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

      {canManageFees ? (
        <div className="flex justify-end">
          <AnimatedAddButton onClick={() => setDialogOpen(true)}>
            Create Invoice
          </AnimatedAddButton>
        </div>
      ) : null}

      <DataTable
        title="Invoice Ledger"
        columns={columns}
        data={invoices}
        compact
        cardClassName="border-slate-200 shadow-sm"
        headerClassName="bg-muted/20"
        contentClassName="bg-white"
        tableWrapperClassName="max-h-[500px] overflow-auto"
        footerClassName="px-4 py-3"
          actions={
          canManageFees && selectedInvoiceIds.length > 0 ? (
            <ConfirmDialog
              description={`Delete ${selectedInvoiceIds.length} selected invoice(s)?`}
              onConfirm={handleBulkDelete}
            >
              <Button type="button" variant="destructive">
                Delete Selected ({selectedInvoiceIds.length})
              </Button>
            </ConfirmDialog>
          ) : null
        }
        searchPlaceholder="Search invoices by title or student"
        emptyTitle="No invoices created"
        emptyDescription="Create a fee invoice to start tracking gross, discount, paid amount, and balance."
      />

      {canManageFees ? (
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
      ) : null}

      <Dialog
        open={receiptDialogOpen}
        onOpenChange={(nextOpen) => {
          setReceiptDialogOpen(nextOpen);
          if (!nextOpen) {
            setReceiptData(null);
            setReceiptLoading(false);
          }
        }}
      >
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>Fee Receipt Preview</DialogTitle>
            <DialogDescription>
              Review the latest combined office and student receipt before printing.
            </DialogDescription>
          </DialogHeader>

          {receiptLoading ? (
            <div className="rounded-md border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
              Loading receipt preview...
            </div>
          ) : receiptData ? (
            <ReceiptPreview receipt={receiptData} />
          ) : (
            <div className="rounded-md border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
              Receipt preview is not available.
            </div>
          )}

          <DialogFooter>
            <Button disabled={!receiptData || receiptLoading} onClick={printReceipt}>
              <Printer className="h-4 w-4" />
              Print Combined Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
