"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { formatCurrency } from "../../lib/currency.js";
import { formatDate } from "../../lib/dateFormat.js";
import { Button } from "../ui/button.js";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

export function StudentFeesDialog({ open, onOpenChange, student }) {
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [invoiceForm, setInvoiceForm] = useState(invoiceDefaults);
  const [paymentForm, setPaymentForm] = useState(paymentDefaults);
  const [submittingInvoice, setSubmittingInvoice] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [activeTab, setActiveTab] = useState("info");

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
      </DialogContent>
    </Dialog>
  );
}
