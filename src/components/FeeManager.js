"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "./ui/badge.js";
import { Button } from "./ui/button.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card.js";
import { Input } from "./ui/input.js";
import { Select } from "./ui/select.js";
import { Table } from "./ui/table.js";
import { Textarea } from "./ui/textarea.js";

const structureDefaults = {
  institutionId: "",
  classId: "",
  name: "",
  amount: "",
  frequency: "ONE_TIME",
  applicableFor: "ALL",
  dueDayOfMonth: "",
  notes: ""
};

const invoiceDefaults = {
  studentId: "",
  title: "",
  grossAmount: "",
  discountAmount: "0",
  dueDate: "",
  notes: ""
};

const structureInvoiceDefaults = {
  studentId: "",
  feeStructureId: "",
  discountAmount: "0",
  dueDate: "",
  notes: ""
};

const paymentDefaults = {
  feeInvoiceId: "",
  amount: "",
  paymentMethod: "CASH",
  referenceNumber: "",
  remarks: ""
};

export default function FeeManager({
  institutions = [],
  classes = [],
  students = [],
  initialStructures = [],
  initialInvoices = [],
  initialPayments = [],
  initialError = null
}) {
  const router = useRouter();
  const [structures, setStructures] = useState(initialStructures);
  const [invoices, setInvoices] = useState(initialInvoices);
  const [payments, setPayments] = useState(initialPayments);
  const [message, setMessage] = useState(initialError);
  const [structureForm, setStructureForm] = useState({
    ...structureDefaults,
    institutionId: institutions[0]?.id || ""
  });
  const [invoiceForm, setInvoiceForm] = useState({
    ...invoiceDefaults,
    studentId: students[0]?.id || ""
  });
  const [fromStructureForm, setFromStructureForm] = useState({
    ...structureInvoiceDefaults,
    studentId: students[0]?.id || "",
    feeStructureId: initialStructures[0]?.id || ""
  });
  const [paymentForm, setPaymentForm] = useState({
    ...paymentDefaults,
    feeInvoiceId: initialInvoices[0]?.id || ""
  });
  const [loadingForm, setLoadingForm] = useState(null);
  const [editingStructureId, setEditingStructureId] = useState(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  const [institutionFilter, setInstitutionFilter] = useState("ALL");
  const [studentFilter, setStudentFilter] = useState("ALL");
  const [classBillingForm, setClassBillingForm] = useState({
    studentId: students[0]?.id || "",
    dueDate: "",
    notes: ""
  });
  const [ledgerFilters, setLedgerFilters] = useState({
    institutionId: institutions[0]?.id || "",
    classId: "ALL",
    year: String(new Date().getFullYear())
  });
  const [ledgerRows, setLedgerRows] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const institutionMap = Object.fromEntries(institutions.map((item) => [item.id, item.name]));
  const classMap = Object.fromEntries(
    classes.map((item) => [item.id, `${item.name}${item.section ? ` - ${item.section}` : ""}`])
  );
  const studentMap = Object.fromEntries(
    students.map((item) => [item.id, `${item.firstName} ${item.lastName} (${item.admissionNumber})`])
  );

  async function submitJson(url, method, body) {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Request failed.");
    }

    return result;
  }

  async function handleStructureSubmit(event) {
    event.preventDefault();
    setLoadingForm("structure");
    setMessage(null);

    try {
      const result = await submitJson(
        editingStructureId
          ? `/api/fees/structures/${editingStructureId}`
          : "/api/fees/structures",
        editingStructureId ? "PATCH" : "POST",
        {
          ...structureForm,
          classId: structureForm.classId || null,
          amount: Number(structureForm.amount),
          dueDayOfMonth: structureForm.dueDayOfMonth ? Number(structureForm.dueDayOfMonth) : null
        }
      );
      setStructures((current) =>
        editingStructureId
          ? current.map((item) => (item.id === editingStructureId ? result.data : item))
          : [result.data, ...current]
      );
      setStructureForm({ ...structureDefaults, institutionId: institutions[0]?.id || "" });
      setEditingStructureId(null);
      if (!fromStructureForm.feeStructureId) {
        setFromStructureForm((current) => ({ ...current, feeStructureId: result.data.id }));
      }
      setMessage(editingStructureId ? "Fee structure updated successfully." : "Fee structure created successfully.");
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoadingForm(null);
    }
  }

  async function handleInvoiceSubmit(event) {
    event.preventDefault();
    setLoadingForm("invoice");
    setMessage(null);

    try {
      const result = await submitJson(
        editingInvoiceId ? `/api/fees/assignments/${editingInvoiceId}` : "/api/fees/assignments",
        editingInvoiceId ? "PATCH" : "POST",
        {
        ...invoiceForm,
        grossAmount: Number(invoiceForm.grossAmount),
        discountAmount: Number(invoiceForm.discountAmount || 0)
        }
      );
      setInvoices((current) =>
        editingInvoiceId
          ? current.map((item) => (item.id === editingInvoiceId ? result.data : item))
          : [result.data, ...current]
      );
      setInvoiceForm({ ...invoiceDefaults, studentId: students[0]?.id || "" });
      setEditingInvoiceId(null);
      setPaymentForm((current) => ({
        ...current,
        feeInvoiceId: current.feeInvoiceId || result.data.id
      }));
      setMessage(editingInvoiceId ? "Invoice updated successfully." : "Fee invoice created successfully.");
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoadingForm(null);
    }
  }

  async function handleFromStructureSubmit(event) {
    event.preventDefault();
    setLoadingForm("from-structure");
    setMessage(null);

    try {
      const result = await submitJson("/api/fees/assignments/from-structure", "POST", {
        ...fromStructureForm,
        discountAmount: Number(fromStructureForm.discountAmount || 0)
      });
      setInvoices((current) => [result.data, ...current]);
      setMessage("Invoice created from fee structure.");
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoadingForm(null);
    }
  }

  async function handlePaymentSubmit(event) {
    event.preventDefault();
    setLoadingForm("payment");
    setMessage(null);

    try {
      const result = await submitJson("/api/fees/payments", "POST", {
        ...paymentForm,
        amount: Number(paymentForm.amount)
      });
      setPayments((current) => [result.data.payment, ...current]);
      setInvoices((current) =>
        current.map((invoice) => (invoice.id === result.data.invoice.id ? result.data.invoice : invoice))
      );
      setPaymentForm({ ...paymentDefaults, feeInvoiceId: invoices[0]?.id || "" });
      setMessage("Payment recorded successfully.");
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoadingForm(null);
    }
  }

  async function handleClassBillingSubmit(event) {
    event.preventDefault();
    setLoadingForm("class-billing");
    setMessage(null);

    try {
      const result = await submitJson("/api/fees/assignments/from-class", "POST", classBillingForm);
      setInvoices((current) => [...result.data.invoices, ...current]);
      setMessage(
        result.data.createdCount > 0
          ? `${result.data.createdCount} class fee invoices created.`
          : "No new class fee invoices were needed."
      );
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoadingForm(null);
    }
  }

  function updateForm(setter) {
    return function onChange(event) {
      const { name, value } = event.target;
      setter((current) => ({ ...current, [name]: value }));
    };
  }

  function startStructureEdit(structure) {
    setEditingStructureId(structure.id);
    setStructureForm({
      institutionId: structure.institutionId,
      classId: structure.classId || "",
      name: structure.name || "",
      amount: String(structure.amount ?? ""),
      frequency: structure.frequency || "ONE_TIME",
      applicableFor: structure.applicableFor || "ALL",
      dueDayOfMonth: structure.dueDayOfMonth ? String(structure.dueDayOfMonth) : "",
      notes: structure.notes || ""
    });
    setMessage(null);
  }

  async function handleStructureDelete(structureId) {
    setMessage(null);

    try {
      const response = await fetch(`/api/fees/structures/${structureId}`, { method: "DELETE" });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || "Failed to delete fee structure.");
      }
      setStructures((current) => current.filter((item) => item.id !== structureId));
      if (editingStructureId === structureId) {
        setEditingStructureId(null);
        setStructureForm({ ...structureDefaults, institutionId: institutions[0]?.id || "" });
      }
      setMessage("Fee structure removed.");
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error.message);
    }
  }

  function startInvoiceEdit(invoice) {
    setEditingInvoiceId(invoice.id);
    setInvoiceForm({
      studentId: invoice.studentId,
      title: invoice.title || "",
      grossAmount: String(invoice.grossAmount ?? ""),
      discountAmount: String(invoice.discountAmount ?? 0),
      dueDate: invoice.dueDate ? String(invoice.dueDate).slice(0, 10) : "",
      notes: invoice.notes || ""
    });
    setMessage(null);
  }

  async function handleInvoiceDelete(invoiceId) {
    setMessage(null);

    try {
      const response = await fetch(`/api/fees/assignments/${invoiceId}`, { method: "DELETE" });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || "Failed to delete invoice.");
      }
      setInvoices((current) => current.filter((item) => item.id !== invoiceId));
      if (editingInvoiceId === invoiceId) {
        setEditingInvoiceId(null);
        setInvoiceForm({ ...invoiceDefaults, studentId: students[0]?.id || "" });
      }
      setMessage("Invoice removed.");
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handlePaymentDelete(paymentId) {
    setMessage(null);

    try {
      const response = await fetch(`/api/fees/payments/${paymentId}`, { method: "DELETE" });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || "Failed to delete payment.");
      }
      setPayments((current) => current.filter((item) => item.id !== paymentId));
      setMessage("Payment removed.");
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error.message);
    }
  }

  const filteredStructures = structures.filter((structure) =>
    institutionFilter === "ALL" ? true : structure.institutionId === institutionFilter
  );
  const filteredInvoices = invoices.filter((invoice) => {
    const matchesInstitution =
      institutionFilter === "ALL" || invoice.institutionId === institutionFilter;
    const matchesStudent = studentFilter === "ALL" || invoice.studentId === studentFilter;
    return matchesInstitution && matchesStudent;
  });
  const filteredPayments = payments.filter((payment) => {
    const matchesInstitution =
      institutionFilter === "ALL" || payment.institutionId === institutionFilter;
    const matchesStudent = studentFilter === "ALL" || payment.studentId === studentFilter;
    return matchesInstitution && matchesStudent;
  });
  const totalCollections = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const totalOutstanding = invoices.reduce((sum, invoice) => sum + Number(invoice.balance || 0), 0);

  useEffect(() => {
    if (!ledgerFilters.institutionId) {
      setLedgerRows([]);
      return;
    }

    let active = true;
    setLedgerLoading(true);

    const searchParams = new URLSearchParams({
      institutionId: ledgerFilters.institutionId,
      year: ledgerFilters.year
    });

    if (ledgerFilters.classId !== "ALL") {
      searchParams.set("classId", ledgerFilters.classId);
    }

    fetch(`/api/fees/monthly-ledger?${searchParams.toString()}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || "Failed to load fee ledger.");
        }
        if (active) {
          setLedgerRows(result.data.rows);
        }
      })
      .catch((error) => {
        if (active) {
          setMessage(error.message);
          setLedgerRows([]);
        }
      })
      .finally(() => {
        if (active) {
          setLedgerLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [ledgerFilters]);

  async function toggleLedgerMonth(row, month) {
    try {
      const response = await fetch("/api/fees/monthly-ledger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          studentId: row.studentId,
          feeStructureId: row.feeStructureId,
          year: Number(ledgerFilters.year),
          monthNumber: month.monthNumber,
          isPaid: !month.isPaid
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Failed to update monthly ledger.");
      }

      setLedgerRows((current) =>
        current.map((item) =>
          item.studentId === row.studentId && item.feeStructureId === row.feeStructureId
            ? {
                ...item,
                months: item.months.map((entry) =>
                  entry.monthNumber === month.monthNumber
                    ? {
                        ...entry,
                        isPaid: result.data.isPaid,
                        paidOn: result.data.paidOn
                      }
                    : entry
                )
              }
            : item
        )
      );
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <div className="stack-lg">
      <section className="summary-grid">
        <article className="summary-card">
          <span className="summary-label">Fee Structures</span>
          <strong className="summary-value">{structures.length}</strong>
        </article>
        <article className="summary-card">
          <span className="summary-label">Active Invoices</span>
          <strong className="summary-value">{invoices.length}</strong>
        </article>
        <article className="summary-card">
          <span className="summary-label">Collections</span>
          <strong className="summary-value">{totalCollections.toLocaleString()}</strong>
        </article>
        <article className="summary-card">
          <span className="summary-label">Outstanding</span>
          <strong className="summary-value">{totalOutstanding.toLocaleString()}</strong>
        </article>
      </section>

      <Card className="panel">
        <CardHeader className="page-head">
          <span className="eyebrow">Fee Setup</span>
          <CardTitle>{editingStructureId ? "Update fee structure" : "Create fee structure"}</CardTitle>
          <CardDescription>Maintain reusable tuition, transport, lab, and hostel fee templates per institution.</CardDescription>
        </CardHeader>
        <CardContent>
        {institutions.length === 0 ? (
          <div className="notice">Create institutions first so fee structures can be attached to them.</div>
        ) : (
          <form className="form-grid" onSubmit={handleStructureSubmit}>
            <label className="field">
              <span>Institution</span>
              <Select
                name="institutionId"
                value={structureForm.institutionId}
                onChange={updateForm(setStructureForm)}
              >
                {institutions.map((institution) => (
                  <option key={institution.id} value={institution.id}>
                    {institution.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="field">
              <span>Class</span>
              <Select name="classId" value={structureForm.classId} onChange={updateForm(setStructureForm)}>
                <option value="">All classes</option>
                {classes
                  .filter((item) => item.institutionId === structureForm.institutionId)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}{item.section ? ` - ${item.section}` : ""}
                    </option>
                  ))}
              </Select>
            </label>
            <label className="field">
              <span>Fee Name</span>
              <Input name="name" value={structureForm.name} onChange={updateForm(setStructureForm)} required />
            </label>
            <label className="field">
              <span>Amount</span>
              <Input name="amount" type="number" min="1" value={structureForm.amount} onChange={updateForm(setStructureForm)} required />
            </label>
            <label className="field">
              <span>Frequency</span>
              <Select name="frequency" value={structureForm.frequency} onChange={updateForm(setStructureForm)}>
                <option value="ONE_TIME">One Time</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="SEMESTER">Semester</option>
                <option value="YEARLY">Yearly</option>
              </Select>
            </label>
            <label className="field">
              <span>Applicable For</span>
              <Input name="applicableFor" value={structureForm.applicableFor} onChange={updateForm(setStructureForm)} />
            </label>
            <label className="field">
              <span>Due Day</span>
              <Input name="dueDayOfMonth" type="number" min="1" max="31" value={structureForm.dueDayOfMonth} onChange={updateForm(setStructureForm)} />
            </label>
            <label className="field field-wide">
              <span>Notes</span>
              <Textarea name="notes" value={structureForm.notes} onChange={updateForm(setStructureForm)} rows="3" />
            </label>
            <div className="form-actions">
              <Button disabled={loadingForm === "structure"} type="submit">
                {loadingForm === "structure" ? "Saving..." : editingStructureId ? "Save Changes" : "Create Fee Structure"}
              </Button>
              {editingStructureId ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditingStructureId(null);
                    setStructureForm({ ...structureDefaults, institutionId: institutions[0]?.id || "" });
                  }}
                  type="button"
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        )}
        </CardContent>
      </Card>

      <Card className="panel">
        <CardHeader className="page-head">
          <span className="eyebrow">Class Billing</span>
          <CardTitle>Generate fees from class plan</CardTitle>
          <CardDescription>Create invoices from all active fee structures attached to the student's class.</CardDescription>
        </CardHeader>
        <CardContent>
        {students.length === 0 ? (
          <div className="notice">Add students and assign them to classes first.</div>
        ) : (
          <form className="form-grid" onSubmit={handleClassBillingSubmit}>
            <label className="field">
              <span>Student</span>
              <Select
                name="studentId"
                onChange={updateForm(setClassBillingForm)}
                value={classBillingForm.studentId}
              >
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.firstName} {student.lastName}
                  </option>
                ))}
              </Select>
            </label>
            <label className="field">
              <span>Due Date</span>
              <Input
                name="dueDate"
                onChange={updateForm(setClassBillingForm)}
                type="date"
                value={classBillingForm.dueDate}
              />
            </label>
            <label className="field field-wide">
              <span>Notes</span>
              <Textarea
                name="notes"
                onChange={updateForm(setClassBillingForm)}
                rows="3"
                value={classBillingForm.notes}
              />
            </label>
            <div className="form-actions">
              <Button disabled={loadingForm === "class-billing"} type="submit">
                {loadingForm === "class-billing" ? "Generating..." : "Generate Class Fees"}
              </Button>
            </div>
          </form>
        )}
        </CardContent>
      </Card>

      <Card className="panel">
        <CardHeader className="page-head">
          <span className="eyebrow">Billing</span>
          <CardTitle>{editingInvoiceId ? "Update student invoice" : "Issue student invoices"}</CardTitle>
          <CardDescription>Create a fresh invoice or bill a student from an existing fee template.</CardDescription>
        </CardHeader>
        <CardContent>
        {students.length === 0 ? (
          <div className="notice">Add students before generating invoices.</div>
        ) : (
          <div className="two-col">
            <form className="form-grid" onSubmit={handleInvoiceSubmit}>
              <h3>Direct invoice</h3>
              <label className="field">
                <span>Student</span>
                <Select
                  disabled={Boolean(editingInvoiceId)}
                  name="studentId"
                  value={invoiceForm.studentId}
                  onChange={updateForm(setInvoiceForm)}
                >
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.firstName} {student.lastName}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="field">
                <span>Title</span>
                <Input name="title" value={invoiceForm.title} onChange={updateForm(setInvoiceForm)} required />
              </label>
              <label className="field">
                <span>Gross Amount</span>
                <Input name="grossAmount" type="number" min="1" value={invoiceForm.grossAmount} onChange={updateForm(setInvoiceForm)} required />
              </label>
              <label className="field">
                <span>Discount</span>
                <Input name="discountAmount" type="number" min="0" value={invoiceForm.discountAmount} onChange={updateForm(setInvoiceForm)} />
              </label>
              <label className="field">
                <span>Due Date</span>
                <Input name="dueDate" type="date" value={invoiceForm.dueDate} onChange={updateForm(setInvoiceForm)} />
              </label>
              <label className="field field-wide">
                <span>Notes</span>
                <Textarea name="notes" value={invoiceForm.notes} onChange={updateForm(setInvoiceForm)} rows="3" />
              </label>
              <div className="form-actions">
                <Button disabled={loadingForm === "invoice"} type="submit">
                  {loadingForm === "invoice" ? "Saving..." : editingInvoiceId ? "Save Changes" : "Create Invoice"}
                </Button>
                {editingInvoiceId ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditingInvoiceId(null);
                      setInvoiceForm({ ...invoiceDefaults, studentId: students[0]?.id || "" });
                    }}
                    type="button"
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            </form>

            <form className="form-grid" onSubmit={handleFromStructureSubmit}>
              <h3>From structure</h3>
              <label className="field">
                <span>Student</span>
                <Select
                  name="studentId"
                  value={fromStructureForm.studentId}
                  onChange={updateForm(setFromStructureForm)}
                >
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.firstName} {student.lastName}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="field">
                <span>Fee Structure</span>
                <Select
                  name="feeStructureId"
                  value={fromStructureForm.feeStructureId}
                  onChange={updateForm(setFromStructureForm)}
                >
                  <option value="">Select structure</option>
                  {structures.map((structure) => (
                    <option key={structure.id} value={structure.id}>
                      {structure.name} ({institutionMap[structure.institutionId] || "Institution"})
                    </option>
                  ))}
                </Select>
              </label>
              <label className="field">
                <span>Discount</span>
                <Input name="discountAmount" type="number" min="0" value={fromStructureForm.discountAmount} onChange={updateForm(setFromStructureForm)} />
              </label>
              <label className="field">
                <span>Due Date</span>
                <Input name="dueDate" type="date" value={fromStructureForm.dueDate} onChange={updateForm(setFromStructureForm)} />
              </label>
              <label className="field field-wide">
                <span>Notes</span>
                <Textarea name="notes" value={fromStructureForm.notes} onChange={updateForm(setFromStructureForm)} rows="3" />
              </label>
              <div className="form-actions">
                <Button disabled={loadingForm === "from-structure"} type="submit">
                  {loadingForm === "from-structure" ? "Saving..." : "Create From Structure"}
                </Button>
              </div>
            </form>
          </div>
        )}
        </CardContent>
      </Card>

      <Card className="panel">
        <CardHeader className="page-head">
          <span className="eyebrow">Collections</span>
          <CardTitle>Capture payment</CardTitle>
          <CardDescription>Record incoming payments against open invoices and update balances immediately.</CardDescription>
        </CardHeader>
        <CardContent>
        {invoices.length === 0 ? (
          <div className="notice">Create an invoice before recording payments.</div>
        ) : (
          <form className="form-grid" onSubmit={handlePaymentSubmit}>
            <label className="field">
              <span>Invoice</span>
              <Select name="feeInvoiceId" value={paymentForm.feeInvoiceId} onChange={updateForm(setPaymentForm)}>
                {invoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.title} - balance {Number(invoice.balance).toLocaleString()}
                  </option>
                ))}
              </Select>
            </label>
            <label className="field">
              <span>Amount</span>
              <Input name="amount" type="number" min="1" value={paymentForm.amount} onChange={updateForm(setPaymentForm)} required />
            </label>
            <label className="field">
              <span>Method</span>
              <Select name="paymentMethod" value={paymentForm.paymentMethod} onChange={updateForm(setPaymentForm)}>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
              </Select>
            </label>
            <label className="field">
              <span>Reference No.</span>
              <Input name="referenceNumber" value={paymentForm.referenceNumber} onChange={updateForm(setPaymentForm)} />
            </label>
            <label className="field field-wide">
              <span>Remarks</span>
              <Textarea name="remarks" value={paymentForm.remarks} onChange={updateForm(setPaymentForm)} rows="3" />
            </label>
            <div className="form-actions">
              <Button disabled={loadingForm === "payment"} type="submit">
                {loadingForm === "payment" ? "Saving..." : "Record Payment"}
              </Button>
            </div>
          </form>
        )}
        {message ? <div className="notice">{message}</div> : null}
        </CardContent>
      </Card>

      <Card className="panel">
        <CardHeader className="page-head">
          <span className="eyebrow">Monthly Ledger</span>
          <CardTitle>Monthly fee check register</CardTitle>
          <CardDescription>Tick each month when the student's monthly class fee is received.</CardDescription>
        </CardHeader>
        <CardContent>
        <div className="toolbar toolbar-wide">
          <Select
            className="filter-input"
            onChange={(event) =>
              setLedgerFilters((current) => ({
                ...current,
                institutionId: event.target.value,
                classId: "ALL"
              }))
            }
            value={ledgerFilters.institutionId}
          >
            {institutions.map((institution) => (
              <option key={institution.id} value={institution.id}>
                {institution.name}
              </option>
            ))}
          </Select>
          <Select
            className="filter-input"
            onChange={(event) =>
              setLedgerFilters((current) => ({ ...current, classId: event.target.value }))
            }
            value={ledgerFilters.classId}
          >
            <option value="ALL">All classes</option>
            {classes
              .filter((item) => item.institutionId === ledgerFilters.institutionId)
              .map((item) => (
                <option key={item.id} value={item.id}>
                    {item.name}{item.section ? ` - ${item.section}` : ""}
                  </option>
                ))}
          </Select>
          <Input
            className="filter-input"
            onChange={(event) =>
              setLedgerFilters((current) => ({ ...current, year: event.target.value }))
            }
            type="number"
            value={ledgerFilters.year}
          />
          <span className="stat-pill">{ledgerRows.length} ledger rows</span>
        </div>
        {ledgerLoading ? (
          <p className="empty">Loading ledger...</p>
        ) : ledgerRows.length === 0 ? (
          <p className="empty">No monthly class fee structures found for the selected filter.</p>
        ) : (
          <div className="ledger-wrap">
            <table className="table ledger-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Class</th>
                  <th>Fee</th>
                  <th>Amount</th>
                  {ledgerRows[0].months.map((month) => (
                    <th key={month.monthNumber}>{month.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ledgerRows.map((row) => (
                  <tr key={`${row.studentId}-${row.feeStructureId}`}>
                    <td>{row.studentName}</td>
                    <td>{row.className}</td>
                    <td>{row.feeName}</td>
                    <td>{row.amount.toLocaleString()}</td>
                    {row.months.map((month) => (
                      <td key={month.monthNumber}>
                        <button
                          className={`ledger-check ${month.isPaid ? "ledger-check-paid" : ""}`}
                          onClick={() => toggleLedgerMonth(row, month)}
                          type="button"
                        >
                          {month.isPaid ? "✓" : ""}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </CardContent>
      </Card>

      <section className="page-grid">
        <Card className="panel">
          <CardHeader className="page-head">
            <CardTitle>Fee structure register</CardTitle>
            <CardDescription>Reusable fee definitions grouped by campus.</CardDescription>
          </CardHeader>
          <CardContent>
          <div className="toolbar toolbar-wide">
            <Select
              className="filter-input"
              onChange={(event) => setInstitutionFilter(event.target.value)}
              value={institutionFilter}
            >
              <option value="ALL">All institutions</option>
              {institutions.map((institution) => (
                <option key={institution.id} value={institution.id}>
                {institution.name}
              </option>
            ))}
            </Select>
            <Select
              className="filter-input"
              onChange={(event) => setStudentFilter(event.target.value)}
              value={studentFilter}
            >
              <option value="ALL">All students</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.firstName} {student.lastName}
                </option>
              ))}
            </Select>
            <span className="stat-pill">{filteredInvoices.length} invoices</span>
          </div>
          {filteredStructures.length === 0 ? (
            <p className="empty">No fee structures created yet.</p>
          ) : (
            <Table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Institution</th>
                  <th>Class</th>
                  <th>Frequency</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStructures.map((structure) => (
                <tr key={structure.id}>
                  <td>{structure.name}</td>
                  <td>{institutionMap[structure.institutionId] || "-"}</td>
                  <td>{structure.classId ? classMap[structure.classId] || "-" : "All classes"}</td>
                  <td><Badge variant="secondary">{structure.frequency}</Badge></td>
                  <td>{Number(structure.amount).toLocaleString()}</td>
                  <td>
                    <div className="row-actions">
                      <Button size="sm" variant="outline" onClick={() => startStructureEdit(structure)} type="button">
                        Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleStructureDelete(structure.id)} type="button">
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              </tbody>
            </Table>
          )}
          </CardContent>
        </Card>

        <Card className="panel">
          <CardHeader className="page-head">
            <CardTitle>Recent collections</CardTitle>
            <CardDescription>Latest payments received across students.</CardDescription>
          </CardHeader>
          <CardContent>
          {filteredPayments.length === 0 ? (
            <p className="empty">No payments recorded yet.</p>
          ) : (
            <ul className="list">
              {filteredPayments.slice(0, 8).map((payment) => (
                <li key={payment.id}>
                  <div className="row-between">
                    <span>
                      {studentMap[payment.studentId] || "Student"} paid {Number(payment.amount).toLocaleString()} via {payment.paymentMethod}
                    </span>
                    <Button size="sm" variant="destructive" onClick={() => handlePaymentDelete(payment.id)} type="button">
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          </CardContent>
        </Card>
      </section>

      <Card className="panel">
        <CardHeader className="page-head">
          <CardTitle>Invoice ledger</CardTitle>
          <CardDescription>Monitor pending, partial, and fully paid student invoices.</CardDescription>
        </CardHeader>
        <CardContent>
        {filteredInvoices.length === 0 ? (
          <p className="empty">No invoices created yet.</p>
        ) : (
          <Table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Student</th>
                <th>Class</th>
                <th>Net</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>{invoice.title}</td>
                  <td>{studentMap[invoice.studentId] || "-"}</td>
                  <td>{classMap[students.find((item) => item.id === invoice.studentId)?.classId] || "-"}</td>
                  <td>{Number(invoice.netAmount).toLocaleString()}</td>
                  <td>{Number(invoice.totalPaid).toLocaleString()}</td>
                  <td>{Number(invoice.balance).toLocaleString()}</td>
                  <td><Badge>{invoice.status}</Badge></td>
                  <td>
                    <div className="row-actions">
                      <Button size="sm" variant="outline" onClick={() => startInvoiceEdit(invoice)} type="button">
                        Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleInvoiceDelete(invoice.id)} type="button">
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        </CardContent>
      </Card>
    </div>
  );
}
