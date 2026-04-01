"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, Eye, Plus, Printer, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button.js";
import { MetricCard } from "./metric-card.js";
import { DataTable } from "../tables/data-table.js";
import { StatusBadge } from "./status-badge.js";
import { formatCurrency } from "../../lib/currency.js";
import { formatDate } from "../../lib/dateFormat.js";
import { InvoiceFormDialog } from "../forms/invoice-form-dialog.js";
import { ConfirmDialog } from "./confirm-dialog.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../ui/dialog.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getStudentName(student) {
  return `${student?.firstName || ""} ${student?.lastName || ""}`.trim() || "NA";
}

function getClassLabel(student) {
  if (!student?.className) {
    return "NA";
  }

  return student.section ? `${student.className} - ${student.section}` : student.className;
}

function getReceiptRows(receipt) {
  return [
    ["Receipt No.", receipt.invoice.receiptNumber || "NA"],
    ["Receipt Title", receipt.invoice.title || "NA"],
    ["Student Name", getStudentName(receipt.student)],
    ["Admission No.", receipt.student.admissionNumber || "NA"],
    ["Father Name", receipt.student.fatherName || "NA"],
    ["Mother Name", receipt.student.motherName || "NA"],
    ["Class", getClassLabel(receipt.student)],
    ["Academic Year", receipt.academicYear || "NA"],
    ["Due Date", formatDate(receipt.invoice.dueDate)],
    ["Status", receipt.invoice.status || "NA"],
    ["Gross Amount", formatCurrency(receipt.invoice.grossAmount)],
    ["Discount", formatCurrency(receipt.invoice.discountAmount)],
    ["Net Amount", formatCurrency(receipt.invoice.netAmount)],
    ["Paid Amount", formatCurrency(receipt.invoice.totalPaid)],
    ["Balance", formatCurrency(receipt.invoice.balance)]
  ].concat(receipt.invoice.notes ? [["Notes", receipt.invoice.notes]] : []);
}

function getMonthsMarkup(receipt) {
  if (!receipt.months?.length) {
    return "";
  }

  return `
    <section class="months-section">
      <div class="section-title">Monthly Fee Status</div>
      <div class="months-grid">
        ${receipt.months.map((month) => `
          <div class="month-card ${month.isCurrentInvoiceMonth ? "current" : ""}">
            <div class="month-label">${escapeHtml(month.label)}</div>
            ${month.isPaid ? '<div class="stamp">PAID</div>' : '<div class="stamp pending">PENDING</div>'}
            <div class="month-note">${escapeHtml(month.paidOn ? `Paid on ${formatDate(month.paidOn)}` : "Not paid")}</div>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function getPrintableReceiptMarkup(receipt, copyType) {
  const rows = getReceiptRows(receipt);
  const copyLabel = copyType === "office" ? "Office Copy" : "Student Copy";

  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(receipt.invoice.title)} - ${escapeHtml(copyLabel)}</title>
      <style>
        :root {
          color-scheme: light;
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          padding: 12px;
          font-family: Arial, Helvetica, sans-serif;
          color: #111827;
          background: #ffffff;
        }

        .copy {
          border: 1.5px solid #111827;
          border-radius: 10px;
          padding: 12px;
          max-width: 210mm;
          margin: 0 auto;
        }

        .header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 10px;
          padding-bottom: 8px;
          border-bottom: 1px solid #d1d5db;
        }

        .title {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
        }

        .subtitle {
          margin: 4px 0 0;
          font-size: 12px;
          color: #4b5563;
        }

        .badge {
          padding: 6px 10px;
          border: 1px solid #111827;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .detail-row {
          display: grid;
          grid-template-columns: 120px minmax(0, 1fr);
          border: 1px solid #d1d5db;
          border-radius: 6px;
          overflow: hidden;
          font-size: 12px;
        }

        .detail-label {
          padding: 7px 8px;
          background: #f3f4f6;
          font-weight: 700;
        }

        .detail-value {
          padding: 7px 8px;
        }

        .months-section {
          margin-top: 12px;
        }

        .section-title {
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 700;
        }

        .months-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
        }

        .month-card {
          position: relative;
          min-height: 64px;
          padding: 8px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: #f9fafb;
          break-inside: avoid;
        }

        .month-card.current {
          border-color: #2563eb;
        }

        .month-label {
          font-size: 12px;
          font-weight: 700;
        }

        .month-note {
          margin-top: 20px;
          font-size: 10px;
          color: #4b5563;
        }

        .stamp {
          position: absolute;
          top: 8px;
          right: 8px;
          padding: 2px 6px;
          border: 1.5px solid #b91c1c;
          color: #b91c1c;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.05em;
          border-radius: 999px;
          transform: rotate(-8deg);
        }

        .stamp.pending {
          border-color: #6b7280;
          color: #6b7280;
        }

        .footer {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 24px;
          margin-top: 16px;
        }

        .signature {
          padding-top: 18px;
          border-top: 1px solid #111827;
          text-align: center;
          font-size: 12px;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }

          body {
            padding: 0;
          }

          .copy {
            border-radius: 0;
          }
        }
      </style>
    </head>
    <body>
      <section class="copy">
        <div class="header">
          <div>
            <h1 class="title">${escapeHtml(receipt.institution.name || "Fee Receipt")}</h1>
          <p class="subtitle">${escapeHtml(receipt.invoice.title || "Fee Receipt")}</p>
          <p class="subtitle">Receipt No. ${escapeHtml(receipt.invoice.receiptNumber || "NA")}</p>
        </div>
          <div class="badge">${escapeHtml(copyLabel)}</div>
        </div>

        <section class="details-grid">
          ${rows.map(([label, value]) => `
            <div class="detail-row">
              <div class="detail-label">${escapeHtml(label)}</div>
              <div class="detail-value">${escapeHtml(value)}</div>
            </div>
          `).join("")}
        </section>

        ${copyType === "student" ? getMonthsMarkup(receipt) : ""}

        <div class="footer">
          <div class="signature">Student / Parent Signature</div>
          <div class="signature">Authorized Signature</div>
        </div>
      </section>
    </body>
  </html>`;
}

function ReceiptPreview({ receipt, copyType }) {
  if (!receipt) {
    return null;
  }

  const rows = getReceiptRows(receipt);

  return (
    <div className="rounded-md border bg-card">
      <div className="flex flex-col gap-3 border-b border-border p-5 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-xl font-semibold">{receipt.institution.name || "Fee Receipt"}</h3>
          <p className="text-sm text-muted-foreground">{receipt.invoice.title || "Fee Receipt"}</p>
        </div>
        <div className="rounded-full border border-foreground px-3 py-1 text-xs font-semibold tracking-wide text-foreground">
          {copyType === "office" ? "Office Copy" : "Student Copy"}
        </div>
      </div>

      <div className="p-5">
        <div className="grid gap-2 lg:grid-cols-2">
          {rows.map(([label, value]) => (
            <div className="grid grid-cols-[120px_minmax(0,1fr)] overflow-hidden rounded-md border" key={label}>
              <div className="bg-muted px-3 py-2 text-sm font-medium">{label}</div>
              <div className="px-3 py-2 text-sm">{value}</div>
            </div>
          ))}
        </div>

        {copyType === "student" && receipt.months?.length > 0 ? (
          <div className="mt-6">
            <div className="mb-3 text-sm font-semibold">Monthly Fee Status</div>
            <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {receipt.months.map((month) => (
                <div
                  className={`relative rounded-md border p-3 ${month.isCurrentInvoiceMonth ? "border-primary" : "border-border"} bg-muted/30`}
                  key={`${month.calendarYear}-${month.monthNumber}`}
                >
                  <div className="text-sm font-semibold">{month.label}</div>
                  <div className={`absolute right-3 top-3 rounded-full border-2 px-2 py-0.5 text-[10px] font-extrabold tracking-[0.18em] rotate-[-8deg] ${month.isPaid ? "border-red-700 text-red-700" : "border-slate-500 text-slate-500"}`}>
                    {month.isPaid ? "PAID" : "PENDING"}
                  </div>
                  <div className="mt-8 text-xs text-muted-foreground">
                    {month.paidOn ? `Paid on ${formatDate(month.paidOn)}` : "Not paid"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div className="border-t border-foreground pt-6 text-center text-sm">Student / Parent Signature</div>
          <div className="border-t border-foreground pt-6 text-center text-sm">Authorized Signature</div>
        </div>
      </div>
    </div>
  );
}

export function InvoicesPageClient({ initialInvoices, students, institutions }) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [receiptTab, setReceiptTab] = useState("student");
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);

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
    setSelectedInvoiceIds((current) => current.filter((item) => item !== id));
    toast.success("Invoice deleted.");
  }

  async function handleBulkDelete() {
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
    setReceiptTab("student");

    const response = await fetch(`/api/fees/assignments/${invoice.id}`);
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setReceiptLoading(false);
      toast.error(result.message || "Failed to load receipt details.");
      return;
    }

    setReceiptData(result.data);
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

  function printReceipt(copyType) {
    if (!receiptData) {
      return;
    }

    const markup = getPrintableReceiptMarkup(receiptData, copyType);
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
        actions={
          selectedInvoiceIds.length > 0 ? (
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

      <Dialog
        open={receiptDialogOpen}
        onOpenChange={(nextOpen) => {
          setReceiptDialogOpen(nextOpen);
          if (!nextOpen) {
            setReceiptData(null);
            setReceiptLoading(false);
            setReceiptTab("student");
          }
        }}
      >
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>Fee Receipt Preview</DialogTitle>
            <DialogDescription>
              Review office and student copies before printing.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2">
            <Button
              className="min-w-36"
              onClick={() => setReceiptTab("student")}
              variant={receiptTab === "student" ? "default" : "outline"}
            >
              Student Copy
            </Button>
            <Button
              className="min-w-36"
              onClick={() => setReceiptTab("office")}
              variant={receiptTab === "office" ? "default" : "outline"}
            >
              Office Copy
            </Button>
          </div>

          {receiptLoading ? (
            <div className="rounded-md border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
              Loading receipt preview...
            </div>
          ) : receiptData ? (
            <ReceiptPreview copyType={receiptTab} receipt={receiptData} />
          ) : (
            <div className="rounded-md border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
              Receipt preview is not available.
            </div>
          )}

          <DialogFooter>
            <Button disabled={!receiptData || receiptLoading} onClick={() => printReceipt(receiptTab)}>
              <Printer className="h-4 w-4" />
              Print {receiptTab === "student" ? "Student Copy" : "Office Copy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
