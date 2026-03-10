"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
      <section className="panel">
        <div className="page-head">
          <span className="eyebrow">Fee Setup</span>
          <h2>{editingStructureId ? "Update fee structure" : "Create fee structure"}</h2>
          <p>Maintain reusable tuition, transport, lab, and hostel fee templates per institution.</p>
        </div>
        {institutions.length === 0 ? (
          <div className="notice">Create institutions first so fee structures can be attached to them.</div>
        ) : (
          <form className="form-grid" onSubmit={handleStructureSubmit}>
            <label className="field">
              <span>Institution</span>
              <select
                name="institutionId"
                value={structureForm.institutionId}
                onChange={updateForm(setStructureForm)}
              >
                {institutions.map((institution) => (
                  <option key={institution.id} value={institution.id}>
                    {institution.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Class</span>
              <select name="classId" value={structureForm.classId} onChange={updateForm(setStructureForm)}>
                <option value="">All classes</option>
                {classes
                  .filter((item) => item.institutionId === structureForm.institutionId)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}{item.section ? ` - ${item.section}` : ""}
                    </option>
                  ))}
              </select>
            </label>
            <label className="field">
              <span>Fee Name</span>
              <input name="name" value={structureForm.name} onChange={updateForm(setStructureForm)} required />
            </label>
            <label className="field">
              <span>Amount</span>
              <input name="amount" type="number" min="1" value={structureForm.amount} onChange={updateForm(setStructureForm)} required />
            </label>
            <label className="field">
              <span>Frequency</span>
              <select name="frequency" value={structureForm.frequency} onChange={updateForm(setStructureForm)}>
                <option value="ONE_TIME">One Time</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="SEMESTER">Semester</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </label>
            <label className="field">
              <span>Applicable For</span>
              <input name="applicableFor" value={structureForm.applicableFor} onChange={updateForm(setStructureForm)} />
            </label>
            <label className="field">
              <span>Due Day</span>
              <input name="dueDayOfMonth" type="number" min="1" max="31" value={structureForm.dueDayOfMonth} onChange={updateForm(setStructureForm)} />
            </label>
            <label className="field field-wide">
              <span>Notes</span>
              <textarea name="notes" value={structureForm.notes} onChange={updateForm(setStructureForm)} rows="3" />
            </label>
            <div className="form-actions">
              <button className="button button-primary" disabled={loadingForm === "structure"} type="submit">
                {loadingForm === "structure" ? "Saving..." : editingStructureId ? "Save Changes" : "Create Fee Structure"}
              </button>
              {editingStructureId ? (
                <button
                  className="button button-muted"
                  onClick={() => {
                    setEditingStructureId(null);
                    setStructureForm({ ...structureDefaults, institutionId: institutions[0]?.id || "" });
                  }}
                  type="button"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        )}
      </section>

      <section className="panel">
        <div className="page-head">
          <span className="eyebrow">Class Billing</span>
          <h2>Generate fees from class plan</h2>
          <p>Create invoices from all active fee structures attached to the student's class.</p>
        </div>
        {students.length === 0 ? (
          <div className="notice">Add students and assign them to classes first.</div>
        ) : (
          <form className="form-grid" onSubmit={handleClassBillingSubmit}>
            <label className="field">
              <span>Student</span>
              <select
                name="studentId"
                onChange={updateForm(setClassBillingForm)}
                value={classBillingForm.studentId}
              >
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.firstName} {student.lastName}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Due Date</span>
              <input
                name="dueDate"
                onChange={updateForm(setClassBillingForm)}
                type="date"
                value={classBillingForm.dueDate}
              />
            </label>
            <label className="field field-wide">
              <span>Notes</span>
              <textarea
                name="notes"
                onChange={updateForm(setClassBillingForm)}
                rows="3"
                value={classBillingForm.notes}
              />
            </label>
            <div className="form-actions">
              <button className="button button-primary" disabled={loadingForm === "class-billing"} type="submit">
                {loadingForm === "class-billing" ? "Generating..." : "Generate Class Fees"}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="panel">
        <div className="page-head">
          <span className="eyebrow">Billing</span>
          <h2>{editingInvoiceId ? "Update student invoice" : "Issue student invoices"}</h2>
          <p>Create a fresh invoice or bill a student from an existing fee template.</p>
        </div>
        {students.length === 0 ? (
          <div className="notice">Add students before generating invoices.</div>
        ) : (
          <div className="two-col">
            <form className="form-grid" onSubmit={handleInvoiceSubmit}>
              <h3>Direct invoice</h3>
              <label className="field">
                <span>Student</span>
                <select
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
                </select>
              </label>
              <label className="field">
                <span>Title</span>
                <input name="title" value={invoiceForm.title} onChange={updateForm(setInvoiceForm)} required />
              </label>
              <label className="field">
                <span>Gross Amount</span>
                <input name="grossAmount" type="number" min="1" value={invoiceForm.grossAmount} onChange={updateForm(setInvoiceForm)} required />
              </label>
              <label className="field">
                <span>Discount</span>
                <input name="discountAmount" type="number" min="0" value={invoiceForm.discountAmount} onChange={updateForm(setInvoiceForm)} />
              </label>
              <label className="field">
                <span>Due Date</span>
                <input name="dueDate" type="date" value={invoiceForm.dueDate} onChange={updateForm(setInvoiceForm)} />
              </label>
              <label className="field field-wide">
                <span>Notes</span>
                <textarea name="notes" value={invoiceForm.notes} onChange={updateForm(setInvoiceForm)} rows="3" />
              </label>
              <div className="form-actions">
                <button className="button button-primary" disabled={loadingForm === "invoice"} type="submit">
                  {loadingForm === "invoice" ? "Saving..." : editingInvoiceId ? "Save Changes" : "Create Invoice"}
                </button>
                {editingInvoiceId ? (
                  <button
                    className="button button-muted"
                    onClick={() => {
                      setEditingInvoiceId(null);
                      setInvoiceForm({ ...invoiceDefaults, studentId: students[0]?.id || "" });
                    }}
                    type="button"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>

            <form className="form-grid" onSubmit={handleFromStructureSubmit}>
              <h3>From structure</h3>
              <label className="field">
                <span>Student</span>
                <select
                  name="studentId"
                  value={fromStructureForm.studentId}
                  onChange={updateForm(setFromStructureForm)}
                >
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.firstName} {student.lastName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Fee Structure</span>
                <select
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
                </select>
              </label>
              <label className="field">
                <span>Discount</span>
                <input name="discountAmount" type="number" min="0" value={fromStructureForm.discountAmount} onChange={updateForm(setFromStructureForm)} />
              </label>
              <label className="field">
                <span>Due Date</span>
                <input name="dueDate" type="date" value={fromStructureForm.dueDate} onChange={updateForm(setFromStructureForm)} />
              </label>
              <label className="field field-wide">
                <span>Notes</span>
                <textarea name="notes" value={fromStructureForm.notes} onChange={updateForm(setFromStructureForm)} rows="3" />
              </label>
              <div className="form-actions">
                <button className="button button-primary" disabled={loadingForm === "from-structure"} type="submit">
                  {loadingForm === "from-structure" ? "Saving..." : "Create From Structure"}
                </button>
              </div>
            </form>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="page-head">
          <span className="eyebrow">Collections</span>
          <h2>Capture payment</h2>
          <p>Record incoming payments against open invoices and update balances immediately.</p>
        </div>
        {invoices.length === 0 ? (
          <div className="notice">Create an invoice before recording payments.</div>
        ) : (
          <form className="form-grid" onSubmit={handlePaymentSubmit}>
            <label className="field">
              <span>Invoice</span>
              <select name="feeInvoiceId" value={paymentForm.feeInvoiceId} onChange={updateForm(setPaymentForm)}>
                {invoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.title} - balance {Number(invoice.balance).toLocaleString()}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Amount</span>
              <input name="amount" type="number" min="1" value={paymentForm.amount} onChange={updateForm(setPaymentForm)} required />
            </label>
            <label className="field">
              <span>Method</span>
              <select name="paymentMethod" value={paymentForm.paymentMethod} onChange={updateForm(setPaymentForm)}>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
              </select>
            </label>
            <label className="field">
              <span>Reference No.</span>
              <input name="referenceNumber" value={paymentForm.referenceNumber} onChange={updateForm(setPaymentForm)} />
            </label>
            <label className="field field-wide">
              <span>Remarks</span>
              <textarea name="remarks" value={paymentForm.remarks} onChange={updateForm(setPaymentForm)} rows="3" />
            </label>
            <div className="form-actions">
              <button className="button button-primary" disabled={loadingForm === "payment"} type="submit">
                {loadingForm === "payment" ? "Saving..." : "Record Payment"}
              </button>
            </div>
          </form>
        )}
        {message ? <div className="notice">{message}</div> : null}
      </section>

      <section className="panel">
        <div className="page-head">
          <span className="eyebrow">Monthly Ledger</span>
          <h2>Monthly fee check register</h2>
          <p>Tick each month when the student's monthly class fee is received.</p>
        </div>
        <div className="toolbar toolbar-wide">
          <select
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
          </select>
          <select
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
          </select>
          <input
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
      </section>

      <section className="page-grid">
        <article className="panel">
          <div className="page-head">
            <h2>Fee structure register</h2>
            <p>Reusable fee definitions grouped by campus.</p>
          </div>
          <div className="toolbar toolbar-wide">
            <select
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
            </select>
            <select
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
            </select>
            <span className="stat-pill">{filteredInvoices.length} invoices</span>
          </div>
          {filteredStructures.length === 0 ? (
            <p className="empty">No fee structures created yet.</p>
          ) : (
            <table className="table">
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
                  <td>{structure.frequency}</td>
                  <td>{Number(structure.amount).toLocaleString()}</td>
                  <td>
                    <div className="row-actions">
                      <button className="button button-small" onClick={() => startStructureEdit(structure)} type="button">
                        Edit
                      </button>
                      <button className="button button-small button-danger" onClick={() => handleStructureDelete(structure.id)} type="button">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          )}
        </article>

        <aside className="panel">
          <div className="page-head">
            <h2>Recent collections</h2>
            <p>Latest payments received across students.</p>
          </div>
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
                    <button className="button button-small button-danger" onClick={() => handlePaymentDelete(payment.id)} type="button">
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </section>

      <section className="panel">
        <div className="page-head">
          <h2>Invoice ledger</h2>
          <p>Monitor pending, partial, and fully paid student invoices.</p>
        </div>
        {filteredInvoices.length === 0 ? (
          <p className="empty">No invoices created yet.</p>
        ) : (
          <table className="table">
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
                  <td><span className="badge">{invoice.status}</span></td>
                  <td>
                    <div className="row-actions">
                      <button className="button button-small" onClick={() => startInvoiceEdit(invoice)} type="button">
                        Edit
                      </button>
                      <button className="button button-small button-danger" onClick={() => handleInvoiceDelete(invoice.id)} type="button">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
