"use client";

import { useEffect, useMemo, useState } from "react";
import { Printer } from "lucide-react";
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
const shortMonthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getTodayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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

function getInvoiceDisplayTitle(invoice) {
  const monthNumber = Number(invoice?.monthNumber || 0);
  const ledgerYear = Number(invoice?.ledgerYear || 0);
  const baseTitle = invoice?.title || "Invoice";

  if (monthNumber < 1 || monthNumber > 12) {
    return baseTitle;
  }

  const monthLabel = `${shortMonthLabels[monthNumber - 1]}${ledgerYear ? ` ${ledgerYear}` : ""}`;
  if (baseTitle.includes(monthLabel)) {
    return baseTitle;
  }

  return `${baseTitle} (${monthLabel})`;
}

function getMonthlyLedgerRowSummary(row) {
  const paidMonths = row.months.filter((month) => month.isPaid).length;
  const dueMonths = row.months.length - paidMonths;
  return { paidMonths, dueMonths };
}

function getReceiptMonthLabel(receipt) {
  const sourceDate = receipt.cutoffDate
    ? new Date(receipt.cutoffDate)
    : receipt.generatedOn
      ? new Date(receipt.generatedOn)
      : new Date();
  if (Number.isNaN(sourceDate.getTime())) {
    return "NA";
  }

  const day = String(sourceDate.getDate()).padStart(2, "0");
  return `${day} ${shortMonthLabels[sourceDate.getMonth()]} ${sourceDate.getFullYear()}`;
}

function splitAmountParts(amount) {
  const value = Math.max(Number(amount || 0), 0);
  const [rs, ps] = value.toFixed(2).split(".");
  return { rs, ps };
}

function getReceiptFeeRows(receipt) {
  return (receipt.pendingDueInvoices || []).map((item) => ({
    name: item.label || "Pending Due",
    amount: Number(item.balance || 0)
  }));
}

function getPaidRows(receipt) {
  return (receipt.paidInvoices || []).map((item) => ({
    name: item.label || "Paid Invoice",
    amount: Number(item.paymentAgainst || 0)
  }));
}

function getPaddedFeeRows(rows, minRows = 8) {
  const padded = [...rows];
  while (padded.length < minRows) {
    padded.push({ name: "", amount: null });
  }
  return padded;
}

function getPrintableCopyMarkup(receipt, copyLabel) {
  const feeRows = getReceiptFeeRows(receipt);
  const printableRows = getPaddedFeeRows(feeRows);
  const paidRows = getPaidRows(receipt);
  const paidRowsMarkup = paidRows.length > 0
    ? paidRows.map((row, index) => {
        const amountParts = splitAmountParts(row.amount);
        return `
          <tr>
            <td class="col-sl">${index + 1}.</td>
            <td class="col-particulars">${escapeHtml(row.name || "")}</td>
            <td class="col-rs">${escapeHtml(amountParts.rs)}</td>
            <td class="col-ps">${escapeHtml(amountParts.ps)}</td>
          </tr>
        `;
      }).join("")
    : `
      <tr>
        <td class="col-sl"></td>
        <td class="col-particulars">No paid invoices yet</td>
        <td class="col-rs"></td>
        <td class="col-ps"></td>
      </tr>
    `;

  const dueAmount = Number(receipt.totals?.pendingDueTillDate || 0);
  const totalAssigned = Number(receipt.totals?.totalAssigned || 0);
  const totalPaid = Number(receipt.totals?.totalPaid || 0);
  const netDue = Number(receipt.totals?.netDue || 0);
  const dueParts = splitAmountParts(dueAmount);
  const assignedParts = splitAmountParts(totalAssigned);
  const paidParts = splitAmountParts(totalPaid);
  const netDueParts = splitAmountParts(netDue);
  const studentName = getStudentName(receipt.student);
  const classLabel = getClassLabel(receipt.student);
  const monthLabel = getReceiptMonthLabel(receipt);
  const contactLine = [receipt.institution.contactPhone, receipt.institution.contactEmail]
    .filter(Boolean)
    .join(" | ");

  return `
    <section class="receipt-copy">
      <div class="receipt-top-title">FEE RECEIPT</div>
      <div class="receipt-school-name">${escapeHtml(receipt.institution.name || "School Name")}</div>
      <div class="receipt-school-meta">${escapeHtml(receipt.institution.address || "")}</div>
      <div class="receipt-school-meta">${escapeHtml(contactLine || "")}</div>
      <div class="copy-chip">${escapeHtml(copyLabel)}</div>

      <div class="meta-row">
        <span class="meta-label">Serial No.</span>
        <span class="meta-value">${escapeHtml(`CONSOLIDATED-${(receipt.student?.admissionNumber || "NA").toString()}`)}</span>
        <span class="meta-label right">As On</span>
        <span class="meta-value">${escapeHtml(monthLabel)}</span>
      </div>
      <div class="meta-row single">
        <span class="meta-label">Admission No.</span>
        <span class="meta-value">${escapeHtml(receipt.student.admissionNumber || "NA")}</span>
      </div>
      <div class="meta-row single">
        <span class="meta-label">Student Name</span>
        <span class="meta-value">${escapeHtml(studentName)}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Class</span>
        <span class="meta-value">${escapeHtml(classLabel)}</span>
        <span class="meta-label right">Section</span>
        <span class="meta-value">${escapeHtml(receipt.student.section || "NA")}</span>
      </div>

      <table class="fee-table">
        <thead>
          <tr>
            <th class="col-sl">Sl.No.</th>
            <th class="col-particulars">Pending Dues Till Date</th>
            <th class="col-rs">Rs.</th>
            <th class="col-ps">P.</th>
          </tr>
        </thead>
        <tbody>
          ${printableRows.map((row, index) => {
            const amountParts = row.amount === null ? { rs: "", ps: "" } : splitAmountParts(row.amount);
            return `
              <tr>
                <td class="col-sl">${row.name ? `${index + 1}.` : ""}</td>
                <td class="col-particulars">${escapeHtml(row.name || "")}</td>
                <td class="col-rs">${escapeHtml(amountParts.rs)}</td>
                <td class="col-ps">${escapeHtml(amountParts.ps)}</td>
              </tr>
            `;
          }).join("")}
          <tr class="total-row">
            <td class="col-sl"></td>
            <td class="col-particulars total-label">TOTAL PENDING</td>
            <td class="col-rs">${escapeHtml(dueParts.rs)}</td>
            <td class="col-ps">${escapeHtml(dueParts.ps)}</td>
          </tr>
        </tbody>
      </table>

      <table class="fee-table" style="margin-top: 8px;">
        <thead>
          <tr>
            <th class="col-sl">Sl.No.</th>
            <th class="col-particulars">Paid Invoices</th>
            <th class="col-rs">Rs.</th>
            <th class="col-ps">P.</th>
          </tr>
        </thead>
        <tbody>
          ${paidRowsMarkup}
          <tr class="total-row">
            <td class="col-sl"></td>
            <td class="col-particulars total-label">TOTAL PAID</td>
            <td class="col-rs">${escapeHtml(paidParts.rs)}</td>
            <td class="col-ps">${escapeHtml(paidParts.ps)}</td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top:8px; font-size:11px; display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap:8px;">
        <div><strong>Total Assigned:</strong> ${escapeHtml(`${assignedParts.rs}.${assignedParts.ps}`)}</div>
        <div><strong>Total Paid:</strong> ${escapeHtml(`${paidParts.rs}.${paidParts.ps}`)}</div>
        <div><strong>Net Due:</strong> ${escapeHtml(`${netDueParts.rs}.${netDueParts.ps}`)}</div>
      </div>

      <div class="receipt-footer">
        <div class="footer-field">
          <span class="line"></span>
          <span class="footer-label">Date</span>
        </div>
        <div class="footer-field align-right">
          <span class="line"></span>
          <span class="footer-label">Signature</span>
        </div>
      </div>
    </section>
  `;
}

function getPrintableReceiptMarkup(receipt) {
  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(getStudentName(receipt.student))} - Consolidated Fee Receipt</title>
      <style>
        :root {
          color-scheme: light;
        }
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 0;
          font-family: "Arial", sans-serif;
          color: #111827;
          background: #fff;
        }
        .print-page {
          max-width: 210mm;
          margin: 0 auto;
          padding: 8mm;
        }
        .receipt-copy {
          border: 1px solid #8a8a8a;
          padding: 6mm;
          min-height: calc((297mm - 24mm) / 2 - 3mm);
        }
        .receipt-top-title {
          text-align: center;
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 4px;
          letter-spacing: 0.05em;
        }
        .receipt-school-name {
          text-align: center;
          font-size: 28px;
          font-weight: 800;
          margin-bottom: 2px;
          text-transform: uppercase;
          line-height: 1.05;
        }
        .receipt-school-meta {
          text-align: center;
          font-size: 11px;
          margin-bottom: 2px;
          color: #374151;
        }
        .copy-chip {
          text-align: right;
          font-size: 10px;
          font-weight: 700;
          margin-top: 2px;
          margin-bottom: 5px;
        }
        .meta-row {
          display: grid;
          grid-template-columns: 78px 1fr 58px 1fr;
          align-items: end;
          gap: 8px;
          margin-bottom: 5px;
          font-size: 11px;
        }
        .meta-row.single {
          grid-template-columns: 78px 1fr;
        }
        .meta-label {
          white-space: nowrap;
        }
        .meta-label.right {
          text-align: right;
        }
        .meta-value {
          border-bottom: 1px dotted #7a7a7a;
          min-height: 15px;
          line-height: 15px;
          padding-left: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .fee-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          margin-top: 6px;
        }
        .fee-table th,
        .fee-table td {
          border: 1px solid #8a8a8a;
          height: 24px;
          padding: 3px 6px;
        }
        .fee-table th {
          font-weight: 700;
          text-align: left;
          background: #fafafa;
        }
        .col-sl {
          width: 42px;
          text-align: center;
        }
        .col-particulars {
          width: auto;
        }
        .col-rs {
          width: 72px;
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        .col-ps {
          width: 36px;
          text-align: center;
          font-variant-numeric: tabular-nums;
        }
        .total-row td {
          font-weight: 700;
        }
        .total-label {
          text-align: right;
          letter-spacing: 0.03em;
        }
        .receipt-footer {
          margin-top: 14px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .footer-field {
          width: 42%;
          text-align: center;
        }
        .footer-field.align-right {
          margin-left: auto;
        }
        .footer-field .line {
          display: block;
          border-bottom: 1px dotted #7a7a7a;
          margin-bottom: 3px;
        }
        .footer-label {
          font-size: 11px;
        }
        .tear-line {
          margin: 4mm 0;
          text-align: center;
          font-size: 9px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          border-top: 1px dashed #9ca3af;
          padding-top: 1mm;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      </style>
    </head>
    <body>
      <main class="print-page">
        ${getPrintableCopyMarkup(receipt, "Office Copy")}
        <div class="tear-line">Cut Here</div>
        ${getPrintableCopyMarkup(receipt, "Student Copy")}
      </main>
    </body>
  </html>`;
}

function ReceiptPreview({ receipt }) {
  if (!receipt) {
    return null;
  }

  const feeRows = getPaddedFeeRows(getReceiptFeeRows(receipt));
  const paidRows = getPaidRows(receipt);
  const dueParts = splitAmountParts(receipt.totals?.pendingDueTillDate || 0);
  const paidParts = splitAmountParts(receipt.totals?.totalPaid || 0);
  const assignedParts = splitAmountParts(receipt.totals?.totalAssigned || 0);
  const netDueParts = splitAmountParts(receipt.totals?.netDue || 0);
  const studentName = getStudentName(receipt.student);
  const classLabel = getClassLabel(receipt.student);
  const monthLabel = getReceiptMonthLabel(receipt);

  const renderCopy = (copyLabel) => (
    <section className="rounded-md border border-zinc-400 bg-white p-4 text-zinc-900">
      <div className="mb-1 text-center text-[11px] font-bold tracking-wide">FEE RECEIPT</div>
      <div className="text-center text-3xl font-extrabold uppercase leading-tight">{receipt.institution.name || "School Name"}</div>
      {receipt.institution.address ? <div className="text-center text-xs text-zinc-700">{receipt.institution.address}</div> : null}
      {(receipt.institution.contactPhone || receipt.institution.contactEmail) ? (
        <div className="text-center text-xs text-zinc-700">
          {[receipt.institution.contactPhone, receipt.institution.contactEmail].filter(Boolean).join(" | ")}
        </div>
      ) : null}
      <div className="mb-3 mt-1 text-right text-[10px] font-bold">{copyLabel}</div>

        <div className="space-y-1 text-sm">
          <div className="grid grid-cols-[76px_minmax(0,1fr)_58px_minmax(0,1fr)] items-end gap-2">
            <span>Serial No.</span>
          <span className="border-b border-dotted border-zinc-500 px-1">{`CONSOLIDATED-${receipt.student?.admissionNumber || "NA"}`}</span>
          <span className="text-right">As On</span>
          <span className="border-b border-dotted border-zinc-500 px-1">{monthLabel}</span>
        </div>
        <div className="grid grid-cols-[76px_minmax(0,1fr)] items-end gap-2">
          <span>Admission No.</span>
          <span className="border-b border-dotted border-zinc-500 px-1">{receipt.student.admissionNumber || "NA"}</span>
        </div>
        <div className="grid grid-cols-[76px_minmax(0,1fr)] items-end gap-2">
          <span>Student Name</span>
          <span className="border-b border-dotted border-zinc-500 px-1">{studentName}</span>
        </div>
        <div className="grid grid-cols-[76px_minmax(0,1fr)_58px_minmax(0,1fr)] items-end gap-2">
          <span>Class</span>
          <span className="border-b border-dotted border-zinc-500 px-1">{classLabel}</span>
          <span className="text-right">Section</span>
          <span className="border-b border-dotted border-zinc-500 px-1">{receipt.student.section || "NA"}</span>
        </div>
      </div>

      <div className="mt-2 overflow-hidden rounded-sm border border-zinc-400">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-zinc-50">
              <th className="w-12 border-r border-zinc-400 px-2 py-1 text-left">Sl.No.</th>
              <th className="border-r border-zinc-400 px-2 py-1 text-left">Pending Dues Till Date</th>
              <th className="w-20 border-r border-zinc-400 px-2 py-1 text-right">Rs.</th>
              <th className="w-10 px-2 py-1 text-center">P.</th>
            </tr>
          </thead>
          <tbody>
            {feeRows.map((row, index) => {
              const parts = row.amount === null ? { rs: "", ps: "" } : splitAmountParts(row.amount);
              return (
                <tr className="border-t border-zinc-300" key={`${copyLabel}-${index}-${row.name || "blank"}`}>
                  <td className="border-r border-zinc-300 px-2 py-1 text-center">{row.name ? `${index + 1}.` : ""}</td>
                  <td className="border-r border-zinc-300 px-2 py-1">{row.name}</td>
                  <td className="border-r border-zinc-300 px-2 py-1 text-right">{parts.rs}</td>
                  <td className="px-2 py-1 text-center">{parts.ps}</td>
                </tr>
              );
            })}
            <tr className="border-t border-zinc-400 font-bold">
              <td className="border-r border-zinc-400 px-2 py-1"></td>
              <td className="border-r border-zinc-400 px-2 py-1 text-right">TOTAL PENDING</td>
              <td className="border-r border-zinc-400 px-2 py-1 text-right">{dueParts.rs}</td>
              <td className="px-2 py-1 text-center">{dueParts.ps}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-2 overflow-hidden rounded-sm border border-zinc-400">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-zinc-50">
              <th className="w-12 border-r border-zinc-400 px-2 py-1 text-left">Sl.No.</th>
              <th className="border-r border-zinc-400 px-2 py-1 text-left">Paid Invoices</th>
              <th className="w-20 border-r border-zinc-400 px-2 py-1 text-right">Rs.</th>
              <th className="w-10 px-2 py-1 text-center">P.</th>
            </tr>
          </thead>
          <tbody>
            {paidRows.length === 0 ? (
              <tr className="border-t border-zinc-300">
                <td className="border-r border-zinc-300 px-2 py-1 text-center"></td>
                <td className="border-r border-zinc-300 px-2 py-1">No paid invoices yet</td>
                <td className="border-r border-zinc-300 px-2 py-1 text-right"></td>
                <td className="px-2 py-1 text-center"></td>
              </tr>
            ) : paidRows.map((row, index) => {
              const parts = splitAmountParts(row.amount);
              return (
                <tr className="border-t border-zinc-300" key={`${copyLabel}-paid-${index}-${row.name || "paid"}`}>
                  <td className="border-r border-zinc-300 px-2 py-1 text-center">{index + 1}.</td>
                  <td className="border-r border-zinc-300 px-2 py-1">{row.name}</td>
                  <td className="border-r border-zinc-300 px-2 py-1 text-right">{parts.rs}</td>
                  <td className="px-2 py-1 text-center">{parts.ps}</td>
                </tr>
              );
            })}
            <tr className="border-t border-zinc-400 font-bold">
              <td className="border-r border-zinc-400 px-2 py-1"></td>
              <td className="border-r border-zinc-400 px-2 py-1 text-right">TOTAL PAID</td>
              <td className="border-r border-zinc-400 px-2 py-1 text-right">{paidParts.rs}</td>
              <td className="px-2 py-1 text-center">{paidParts.ps}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-2 grid gap-2 text-xs sm:grid-cols-3">
        <div className="rounded border p-2"><span className="font-semibold">Total Assigned:</span> {assignedParts.rs}.{assignedParts.ps}</div>
        <div className="rounded border p-2"><span className="font-semibold">Total Paid:</span> {paidParts.rs}.{paidParts.ps}</div>
        <div className="rounded border p-2"><span className="font-semibold">Net Due:</span> {netDueParts.rs}.{netDueParts.ps}</div>
      </div>

      <div className="mt-5 flex items-end justify-between gap-8 text-sm">
        <div className="w-40 text-center">
          <div className="border-b border-dotted border-zinc-500"></div>
          <div className="mt-1">Date</div>
        </div>
        <div className="w-40 text-center">
          <div className="border-b border-dotted border-zinc-500"></div>
          <div className="mt-1">Signature</div>
        </div>
      </div>
    </section>
  );

  return (
    <div className="rounded-md border bg-card p-4">
      <div className="space-y-4">
        {renderCopy("Office Copy")}
        <div className="border-t border-dashed border-zinc-400 pt-2 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Tear Here
        </div>
        {renderCopy("Student Copy")}
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
  const [receiptCutoffDate, setReceiptCutoffDate] = useState(getTodayInputValue());
  const [settlingTillDate, setSettlingTillDate] = useState(false);
  const [studentLedgerYear, setStudentLedgerYear] = useState(String(new Date().getFullYear()));
  const [studentLedgerRows, setStudentLedgerRows] = useState([]);
  const [studentLedgerLoading, setStudentLedgerLoading] = useState(false);
  const [studentLedgerUpdatingKey, setStudentLedgerUpdatingKey] = useState("");

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

  async function loadStudentLedger(studentData, year) {
    if (!studentData?.id || !studentData?.institutionId) {
      setStudentLedgerRows([]);
      return;
    }

    setStudentLedgerLoading(true);
    const params = new URLSearchParams({
      institutionId: studentData.institutionId,
      year: String(year)
    });
    if (studentData.classId) {
      params.set("classId", studentData.classId);
    }

    const response = await fetch(`/api/fees/monthly-ledger?${params.toString()}`);
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setStudentLedgerLoading(false);
      throw new Error(result.message || "Failed to load monthly ledger.");
    }

    const rows = (result.data?.rows || []).filter((row) => row.studentId === studentData.id);
    setStudentLedgerRows(rows);
    setStudentLedgerLoading(false);
  }

  async function toggleStudentLedgerMonth(row, month) {
    if (!student?.id) {
      return;
    }

    const checkboxKey = `${row.feeStructureId}-${month.monthNumber}`;
    setStudentLedgerUpdatingKey(checkboxKey);

    const response = await fetch("/api/fees/monthly-ledger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: row.studentId,
        feeStructureId: row.feeStructureId,
        monthNumber: month.monthNumber,
        year: Number(studentLedgerYear),
        isPaid: !month.isPaid
      })
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setStudentLedgerUpdatingKey("");
      toast.error(result.message || "Failed to update monthly ledger.");
      return;
    }

    await Promise.all([
      loadStudentLedger(student, Number(studentLedgerYear)).catch((error) => toast.error(error.message)),
      loadFeeData(student.id).catch((error) => toast.error(error.message))
    ]);
    setStudentLedgerUpdatingKey("");
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
    if (!open || !student?.id || activeTab !== "actions") {
      return;
    }

    loadStudentLedger(student, Number(studentLedgerYear)).catch((error) => {
      toast.error(error.message);
    });
  }, [activeTab, open, student, studentLedgerYear]);

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
      setReceiptCutoffDate(getTodayInputValue());
      setSettlingTillDate(false);
      setStudentLedgerRows([]);
      setStudentLedgerLoading(false);
      setStudentLedgerUpdatingKey("");
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

  async function openReceiptPreview() {
    if (!student?.id) {
      return;
    }

    setReceiptDialogOpen(true);
    setReceiptLoading(true);
    setReceiptData(null);

    const cutoffQuery = receiptCutoffDate ? `?cutoffDate=${encodeURIComponent(receiptCutoffDate)}` : "";
    const response = await fetch(`/api/students/${student.id}/fees${cutoffQuery}`);
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setReceiptLoading(false);
      toast.error(result.message || "Failed to load receipt details.");
      return;
    }

    setReceiptData(result.data?.consolidatedReceipt || null);
    setReceiptLoading(false);
  }

  async function settleTillCutoffDate() {
    if (!student?.id) {
      return;
    }

    setSettlingTillDate(true);
    const response = await fetch(`/api/students/${student.id}/fees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cutoffDate: receiptCutoffDate || undefined,
        paymentMethod: "CASH",
        remarks: `Settled via student modal till ${receiptCutoffDate || getTodayInputValue()}`
      })
    });
    const result = await response.json().catch(() => ({}));
    setSettlingTillDate(false);

    if (!response.ok) {
      toast.error(result.message || "Failed to settle dues.");
      return;
    }

    toast.success(`Settled ${result.data?.settledCount || 0} invoice(s).`);
    await Promise.all([
      loadFeeData(student.id).catch((error) => toast.error(error.message)),
      openReceiptPreview()
    ]);
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
          <Input
            className="w-[170px]"
            onChange={(event) => setReceiptCutoffDate(event.target.value)}
            type="date"
            value={receiptCutoffDate}
          />
          <Button onClick={openReceiptPreview} type="button" variant="outline">
            <Printer className="h-4 w-4" />
            Receipt
          </Button>
          <Button disabled={settlingTillDate} onClick={settleTillCutoffDate} type="button" variant="outline">
            {settlingTillDate ? "Settling..." : "Settle Till Date"}
          </Button>
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
                        <p className="font-medium">{getInvoiceDisplayTitle(invoice)}</p>
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
            <div className="grid gap-4">
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
                          {getInvoiceDisplayTitle(invoice)} • {formatCurrency(invoice.balance)}
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

              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm">Monthly Fee Ledger</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-4 pt-0">
                  <div className="flex items-center gap-2">
                    <Input
                      min="2020"
                      onChange={(event) => setStudentLedgerYear(event.target.value || String(new Date().getFullYear()))}
                      type="number"
                      value={studentLedgerYear}
                    />
                    <Button
                      onClick={() =>
                        loadStudentLedger(student, Number(studentLedgerYear)).catch((error) => toast.error(error.message))
                      }
                      type="button"
                      variant="outline"
                    >
                      Refresh
                    </Button>
                  </div>

                  {studentLedgerLoading ? (
                    <p className="text-sm text-muted-foreground">Loading monthly ledger...</p>
                  ) : studentLedgerRows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No monthly fee structures found for this student.</p>
                  ) : (
                    <div className="space-y-3">
                      {studentLedgerRows.map((row) => {
                        const summary = getMonthlyLedgerRowSummary(row);
                        return (
                          <div className="rounded-md border p-3" key={`${row.studentId}-${row.feeStructureId}`}>
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                              <div className="font-medium">{row.feeName}</div>
                              <div className="text-xs text-muted-foreground">
                                {summary.paidMonths} paid • {summary.dueMonths} due
                              </div>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                              {row.months.map((month) => {
                                const checkboxKey = `${row.feeStructureId}-${month.monthNumber}`;
                                return (
                                  <label
                                    className={`flex cursor-pointer items-center justify-between rounded-md border px-2 py-1 text-xs ${month.isPaid ? "border-emerald-600 bg-emerald-50" : "border-border"}`}
                                    key={`${row.feeStructureId}-${month.monthNumber}`}
                                  >
                                    <span>{month.label}</span>
                                    <input
                                      checked={month.isPaid}
                                      disabled={studentLedgerUpdatingKey === checkboxKey}
                                      onChange={() => toggleStudentLedgerMonth(row, month)}
                                      type="checkbox"
                                    />
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
            }
          }}
        >
          <DialogContent className="max-w-6xl">
            <DialogHeader>
              <DialogTitle>Fee Receipt Preview</DialogTitle>
              <DialogDescription>
                Office and student copies are arranged on one page with a center tear line. Cutoff date: {receiptCutoffDate || "Today"}.
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
              <Button disabled={!receiptData || receiptLoading || settlingTillDate} onClick={settleTillCutoffDate} variant="outline">
                {settlingTillDate ? "Settling..." : "Settle Till Date"}
              </Button>
              <Button disabled={!receiptData || receiptLoading} onClick={printReceipt}>
                <Printer className="h-4 w-4" />
                Print Combined Receipt
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
