"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Printer } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "../../lib/currency.js";
import { formatDate } from "../../lib/dateFormat.js";
import { Button } from "../ui/button.js";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../ui/dialog.js";
import { Input } from "../ui/input.js";
import { Select } from "../ui/select.js";
import { Textarea } from "../ui/textarea.js";
import { StatusBadge } from "./status-badge.js";

const invoiceDefaults = {
  title: "",
  grossAmount: "",
  discountAmount: "0",
  dueDate: "",
  notes: ""
};

const paymentDefaults = {
  feeInvoiceId: "",
  amount: "",
  paymentDate: "",
  paymentMethod: "CASH",
  remarks: ""
};

const tabs = [
  { id: "info", label: "Info" },
  { id: "invoices", label: "Invoices" },
  { id: "payments", label: "Payments" },
  { id: "actions", label: "Actions" }
];

function summarizeInvoices(invoices) {
  return invoices.reduce(
    (acc, invoice) => {
      acc.totalAssigned += Number(invoice.netAmount || 0);
      acc.totalPaid += Number(invoice.totalPaid || 0);
      acc.totalBalance += Number(invoice.balance || 0);
      return acc;
    },
    { totalAssigned: 0, totalPaid: 0, totalBalance: 0 }
  );
}

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

export function StudentFeesDialog({ open, onOpenChange, student }) {
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [invoiceForm, setInvoiceForm] = useState(invoiceDefaults);
  const [paymentForm, setPaymentForm] = useState(paymentDefaults);
  const [submittingInvoice, setSubmittingInvoice] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [receiptTab, setReceiptTab] = useState("student");

  async function loadFeeData(studentId) {
    setLoading(true);

    const [invoiceResponse, paymentResponse] = await Promise.all([
      fetch(`/api/fees/assignments?studentId=${studentId}`),
      fetch(`/api/fees/payments?studentId=${studentId}`)
    ]);

    const invoiceResult = await invoiceResponse.json().catch(() => ({}));
    const paymentResult = await paymentResponse.json().catch(() => ({}));

    if (!invoiceResponse.ok) {
      setLoading(false);
      throw new Error(invoiceResult.message || "Failed to load student invoices.");
    }

    if (!paymentResponse.ok) {
      setLoading(false);
      throw new Error(paymentResult.message || "Failed to load student payments.");
    }

    const nextInvoices = invoiceResult.data || [];
    setInvoices(nextInvoices);
    setPayments(paymentResult.data || []);
    setPaymentForm((current) => ({
      ...current,
      feeInvoiceId: current.feeInvoiceId || nextInvoices[0]?.id || ""
    }));
    setLoading(false);
  }

  useEffect(() => {
    if (!open || !student?.id) {
      return;
    }

    loadFeeData(student.id).catch((error) => {
      toast.error(error.message);
    });
  }, [open, student?.id]);

  useEffect(() => {
    if (!open) {
      setInvoices([]);
      setPayments([]);
      setInvoiceForm(invoiceDefaults);
      setPaymentForm(paymentDefaults);
      setLoading(false);
      setSubmittingInvoice(false);
      setSubmittingPayment(false);
      setActiveTab("info");
      setReceiptDialogOpen(false);
      setReceiptLoading(false);
      setReceiptData(null);
      setReceiptTab("student");
    }
  }, [open]);

  const totals = useMemo(() => summarizeInvoices(invoices), [invoices]);

  function updateInvoiceForm(event) {
    const { name, value } = event.target;
    setInvoiceForm((current) => ({ ...current, [name]: value }));
  }

  function updatePaymentForm(event) {
    const { name, value } = event.target;
    setPaymentForm((current) => ({ ...current, [name]: value }));
  }

  async function handleInvoiceSubmit(event) {
    event.preventDefault();
    if (!student?.id) {
      return;
    }

    setSubmittingInvoice(true);
    const response = await fetch("/api/fees/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: student.id,
        title: invoiceForm.title,
        grossAmount: Number(invoiceForm.grossAmount),
        discountAmount: Number(invoiceForm.discountAmount || 0),
        dueDate: invoiceForm.dueDate || null,
        notes: invoiceForm.notes || ""
      })
    });

    const result = await response.json().catch(() => ({}));
    setSubmittingInvoice(false);

    if (!response.ok) {
      toast.error(result.message || "Failed to create invoice.");
      return;
    }

    setInvoices((current) => [result.data, ...current]);
    setInvoiceForm(invoiceDefaults);
    setPaymentForm((current) => ({
      ...current,
      feeInvoiceId: current.feeInvoiceId || result.data.id
    }));
    setActiveTab("invoices");
    toast.success("Student invoice created.");
  }

  async function handlePaymentSubmit(event) {
    event.preventDefault();
    setSubmittingPayment(true);

    const response = await fetch("/api/fees/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        feeInvoiceId: paymentForm.feeInvoiceId,
        amount: Number(paymentForm.amount),
        paymentDate: paymentForm.paymentDate || undefined,
        paymentMethod: paymentForm.paymentMethod,
        remarks: paymentForm.remarks || undefined
      })
    });

    const result = await response.json().catch(() => ({}));
    setSubmittingPayment(false);

    if (!response.ok) {
      toast.error(result.message || "Failed to record payment.");
      return;
    }

    setInvoices((current) =>
      current.map((invoice) => (invoice.id === result.data.invoice.id ? result.data.invoice : invoice))
    );
    setPayments((current) => [result.data.payment, ...current]);
    setPaymentForm((current) => ({
      ...paymentDefaults,
      feeInvoiceId: current.feeInvoiceId
    }));
    setActiveTab("payments");
    toast.success("Payment recorded.");
  }

  async function openReceiptPreview(invoiceId) {
    setReceiptDialogOpen(true);
    setReceiptLoading(true);
    setReceiptData(null);
    setReceiptTab("student");

    const response = await fetch(`/api/fees/assignments/${invoiceId}`);
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setReceiptLoading(false);
      toast.error(result.message || "Failed to load receipt details.");
      return;
    }

    setReceiptData(result.data);
    setReceiptLoading(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-4 sm:p-5">
        <DialogHeader className="pr-8">
          <DialogTitle>Student Fees</DialogTitle>
          <DialogDescription>
            {student ? `${student.firstName} ${student.lastName || ""} • ${student.admissionNumber}` : "Manage student invoices and payments."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2">
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Assigned</p>
              <p className="text-lg font-semibold">{formatCurrency(totals.totalAssigned)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Paid</p>
              <p className="text-lg font-semibold">{formatCurrency(totals.totalPaid)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Balance</p>
              <p className="text-lg font-semibold">{formatCurrency(totals.totalBalance)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Button
              className="min-w-24"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
              variant={activeTab === tab.id ? "default" : "outline"}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <div className="max-h-[60vh] overflow-y-auto rounded-md border p-3">
          {activeTab === "info" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm">Student</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 p-4 pt-0 text-sm">
                  <p><span className="text-muted-foreground">Name:</span> {student ? `${student.firstName} ${student.lastName || ""}` : "NA"}</p>
                  <p><span className="text-muted-foreground">Admission:</span> {student?.admissionNumber || "NA"}</p>
                  <p><span className="text-muted-foreground">Class:</span> {student?.className || "Unassigned"}</p>
                  <p><span className="text-muted-foreground">Category:</span> {student?.category || "NA"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm">Fee Snapshot</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 p-4 pt-0 text-sm">
                  <p><span className="text-muted-foreground">Invoices:</span> {invoices.length}</p>
                  <p><span className="text-muted-foreground">Payments:</span> {payments.length}</p>
                  <p><span className="text-muted-foreground">Latest Invoice:</span> {invoices[0]?.title || "NA"}</p>
                  <p><span className="text-muted-foreground">Latest Payment:</span> {payments[0] ? formatDate(payments[0].paymentDate) : "NA"}</p>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {activeTab === "invoices" ? (
            <div className="space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading invoices...</p>
              ) : invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">No invoices found for this student.</p>
              ) : (
                invoices.map((invoice) => (
                  <div className="rounded-md border p-3" key={invoice.id}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-medium">{invoice.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {invoice.receiptNumber || "NA"} • Due {formatDate(invoice.dueDate)}
                        </p>
                      </div>
                      <StatusBadge status={invoice.status} />
                    </div>
                    <div className="mt-2 grid gap-1 text-sm sm:grid-cols-3">
                      <div>Net: {formatCurrency(invoice.netAmount)}</div>
                      <div>Paid: {formatCurrency(invoice.totalPaid)}</div>
                      <div>Balance: {formatCurrency(invoice.balance)}</div>
                    </div>
                    <div className="mt-3">
                      <Button onClick={() => openReceiptPreview(invoice.id)} size="sm" type="button" variant="outline">
                        <Eye className="h-4 w-4" />
                        Receipt
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : null}

          {activeTab === "payments" ? (
            <div className="space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading payments...</p>
              ) : payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments recorded for this student.</p>
              ) : (
                payments.map((payment) => (
                  <div className="rounded-md border p-3" key={payment.id}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">{formatCurrency(payment.amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {payment.paymentMethod || "CASH"} • {formatDate(payment.paymentDate)}
                        </p>
                        {payment.remarks ? <p className="mt-1 text-xs text-muted-foreground">{payment.remarks}</p> : null}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : null}

          {activeTab === "actions" ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm">Create Invoice</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <form className="space-y-3" onSubmit={handleInvoiceSubmit}>
                    <Input name="title" onChange={updateInvoiceForm} placeholder="Invoice title" required value={invoiceForm.title} />
                    <Input min="1" name="grossAmount" onChange={updateInvoiceForm} placeholder="Gross amount" required type="number" value={invoiceForm.grossAmount} />
                    <Input min="0" name="discountAmount" onChange={updateInvoiceForm} placeholder="Discount" type="number" value={invoiceForm.discountAmount} />
                    <Input name="dueDate" onChange={updateInvoiceForm} type="date" value={invoiceForm.dueDate} />
                    <Textarea name="notes" onChange={updateInvoiceForm} placeholder="Notes" rows="2" value={invoiceForm.notes} />
                    <Button className="w-full" disabled={submittingInvoice || loading} type="submit">
                      {submittingInvoice ? "Saving..." : "Create Invoice"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm">Record Payment</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <form className="space-y-3" onSubmit={handlePaymentSubmit}>
                    <Select name="feeInvoiceId" onChange={updatePaymentForm} required value={paymentForm.feeInvoiceId}>
                      <option value="">Select invoice</option>
                      {invoices.map((invoice) => (
                        <option key={invoice.id} value={invoice.id}>
                          {invoice.title} • {formatCurrency(invoice.balance)}
                        </option>
                      ))}
                    </Select>
                    <Input min="1" name="amount" onChange={updatePaymentForm} placeholder="Payment amount" required type="number" value={paymentForm.amount} />
                    <Input name="paymentDate" onChange={updatePaymentForm} type="date" value={paymentForm.paymentDate} />
                    <Select name="paymentMethod" onChange={updatePaymentForm} value={paymentForm.paymentMethod}>
                      <option value="CASH">Cash</option>
                      <option value="ONLINE">Online</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="CHEQUE">Cheque</option>
                    </Select>
                    <Textarea name="remarks" onChange={updatePaymentForm} placeholder="Remarks" rows="2" value={paymentForm.remarks} />
                    <Button className="w-full" disabled={submittingPayment || loading || invoices.length === 0} type="submit">
                      {submittingPayment ? "Saving..." : "Record Payment"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>

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
      </DialogContent>
    </Dialog>
  );
}
