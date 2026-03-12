"use client";

import { useEffect, useMemo, useState } from "react";
import { CreditCard, IndianRupee, Plus, Receipt, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button.js";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.js";
import { Badge } from "../ui/badge.js";
import { ConfirmDialog } from "./confirm-dialog.js";
import { FeeStructureFormDialog } from "../forms/fee-structure-form-dialog.js";
import { MetricCard } from "./metric-card.js";
import { StatusBadge } from "./status-badge.js";
import { FeesOverviewChart } from "../charts/fees-overview-chart.js";
import { Input } from "../ui/input.js";
import { Select } from "../ui/select.js";
import { Skeleton } from "../ui/skeleton.js";
import { formatCurrency } from "../../lib/currency.js";
import { formatDate } from "../../lib/dateFormat.js";

export function FeesDashboardClient({ invoices, payments, institutions, classes, structures }) {
  const [invoiceRows, setInvoiceRows] = useState(invoices);
  const [paymentRows] = useState(payments);
  const [structureRows, setStructureRows] = useState(structures);
  const [structureDialogOpen, setStructureDialogOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState(null);
  const [ledgerFilters, setLedgerFilters] = useState({
    institutionId: institutions[0]?.id || "",
    classId: "ALL",
    year: String(new Date().getFullYear())
  });
  const [ledgerRows, setLedgerRows] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerUpdatingKey, setLedgerUpdatingKey] = useState(null);
  const [classBillingForm, setClassBillingForm] = useState({
    institutionId: institutions[0]?.id || "",
    classId: "",
    dueDate: "",
    notes: ""
  });
  const [generatingClassFees, setGeneratingClassFees] = useState(false);
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
  ];

  const totals = invoiceRows.reduce(
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
    const institutionInvoices = invoiceRows.filter((invoice) => invoice.institutionId === institution.id);

    return {
      label: institution.name,
      paid: institutionInvoices.reduce((sum, item) => sum + Number(item.totalPaid || 0), 0),
      pending: institutionInvoices.reduce((sum, item) => sum + Number(item.balance || 0), 0)
    };
  });

  const recentPayments = paymentRows.slice(0, 6);
  const recentInvoices = invoiceRows.slice(0, 6);
  const filteredClasses = useMemo(
    () => classes.filter((item) => item.institutionId === ledgerFilters.institutionId),
    [classes, ledgerFilters.institutionId]
  );
  const billingClasses = useMemo(
    () => classes.filter((item) => item.institutionId === classBillingForm.institutionId),
    [classes, classBillingForm.institutionId]
  );
  useEffect(() => {
    setClassBillingForm((current) => {
      const nextClasses = classes.filter((item) => item.institutionId === current.institutionId);
      const hasSelectedClass = nextClasses.some((item) => item.id === current.classId);

      return hasSelectedClass
        ? current
        : {
            ...current,
            classId: ""
          };
    });
  }, [classes, classBillingForm.institutionId]);

  useEffect(() => {
    if (!ledgerFilters.institutionId) {
      setLedgerRows([]);
      return;
    }

    const params = new URLSearchParams({
      institutionId: ledgerFilters.institutionId,
      year: ledgerFilters.year
    });

    if (ledgerFilters.classId !== "ALL") {
      params.set("classId", ledgerFilters.classId);
    }

    setLedgerLoading(true);
    fetch(`/api/fees/monthly-ledger?${params.toString()}`)
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result.message || "Failed to load monthly ledger.");
        }

        setLedgerRows(result.data.rows || []);
      })
      .catch((error) => {
        setLedgerRows([]);
        toast.error(error.message);
      })
      .finally(() => {
        setLedgerLoading(false);
      });
  }, [ledgerFilters]);

  async function toggleLedgerMonth(row, month) {
    const key = `${row.studentId}-${row.feeStructureId}-${month.monthNumber}`;
    setLedgerUpdatingKey(key);

    const response = await fetch("/api/fees/monthly-ledger", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        studentId: row.studentId,
        feeStructureId: row.feeStructureId,
        monthNumber: month.monthNumber,
        year: Number(ledgerFilters.year),
        isPaid: !month.isPaid
      })
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setLedgerUpdatingKey(null);
      toast.error(result.message || "Failed to update monthly ledger.");
      return;
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
                      isPaid: Boolean(result.data?.isPaid),
                      paidOn: result.data?.paidOn || null
                    }
                  : entry
              )
            }
          : item
      )
    );
    setLedgerUpdatingKey(null);
  }

  async function handleDeleteLedger(row) {
    const response = await fetch("/api/fees/monthly-ledger", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        studentId: row.studentId,
        feeStructureId: row.feeStructureId,
        year: Number(ledgerFilters.year)
      })
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(result.message || "Failed to delete fee ledger.");
      return;
    }

    setLedgerRows((current) =>
      current.filter(
        (item) =>
          !(
            item.studentId === row.studentId &&
            item.feeStructureId === row.feeStructureId
          )
      )
    );
    setInvoiceRows((current) =>
      current.filter(
        (item) =>
          !(
            item.studentId === row.studentId &&
            item.feeStructureId === row.feeStructureId &&
            Number(item.ledgerYear) === Number(ledgerFilters.year)
          )
      )
    );
    toast.success("Fee ledger deleted.");
  }

  async function handleGenerateClassFees(event) {
    event.preventDefault();
    if (!classBillingForm.classId) {
      toast.error("Select a class first.");
      return;
    }

    setGeneratingClassFees(true);
    const response = await fetch("/api/fees/assignments/from-class", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        classId: classBillingForm.classId,
        dueDate: classBillingForm.dueDate || null,
        notes: classBillingForm.notes || null
      })
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setGeneratingClassFees(false);
      toast.error(result.message || "Failed to generate class fees.");
      return;
    }

    const nextInvoices = result.data?.invoices || [];
    if (nextInvoices.length > 0) {
      setInvoiceRows((current) => [...nextInvoices, ...current]);
    }

    toast.success(
      result.data?.createdCount > 0
        ? `${result.data.createdCount} fee invoice(s) generated for the class.`
        : "No new invoices were needed for this class."
    );
    setGeneratingClassFees(false);
  }

  function getLedgerSummary(row) {
    const paidMonths = row.months.filter((month) => month.isPaid).length;
    const totalMonthsInScope = row.months.length;
    const dueMonths = Math.max(totalMonthsInScope - paidMonths, 0);
    const totalPayable = Number(row.amount) * totalMonthsInScope;
    const totalPaid = Number(row.amount) * paidMonths;
    const balance = Math.max(totalPayable - totalPaid, 0);

    return {
      paidMonths,
      dueMonths,
      totalMonthsInScope,
      totalPayable,
      totalPaid,
      balance
    };
  }

  async function handleDeleteStructure(id) {
    const response = await fetch(`/api/fees/structures/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      toast.error(result.message || "Failed to delete fee structure.");
      return;
    }

    setStructureRows((current) => current.filter((item) => item.id !== id));
    toast.success("Fee structure deleted.");
  }

  function handleStructureSuccess(nextStructure) {
    setStructureRows((current) => {
      const exists = current.some((item) => item.id === nextStructure.id);
      if (exists) {
        return current.map((item) => (item.id === nextStructure.id ? nextStructure : item));
      }
      return [nextStructure, ...current];
    });
    setEditingStructure(null);
  }

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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Fee Structures</CardTitle>
            <p className="text-sm text-muted-foreground">
              Create tuition structures for a whole institution or bind them to a specific class.
            </p>
          </div>
          <Button onClick={() => setStructureDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Fee Structure
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {structureRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No fee structures created yet.</p>
          ) : (
            structureRows.map((structure) => (
              <div className="flex flex-col gap-3 rounded-md border p-4 md:flex-row md:items-center md:justify-between" key={structure.id}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{structure.name}</p>
                    <Badge variant="secondary">{structure.frequency}</Badge>
                    <Badge variant={structure.classId ? "default" : "outline"}>
                      {structure.classId ? "Class Specific" : "Institution Wide"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {institutions.find((item) => item.id === structure.institutionId)?.name || "NA"}
                    {" • "}
                    {structure.classId
                      ? classes.find((item) => item.id === structure.classId)?.name || "Class"
                      : "All Classes"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(structure.amount)}
                    {structure.dueDayOfMonth ? ` • Due on day ${structure.dueDayOfMonth}` : ""}
                    {structure.sessionStartMonth && structure.sessionEndMonth
                      ? ` • Session ${monthNames[Number(structure.sessionStartMonth) - 1]}-${monthNames[Number(structure.sessionEndMonth) - 1]}`
                      : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingStructure(structure);
                      setStructureDialogOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <ConfirmDialog
                    description={`Delete fee structure ${structure.name}?`}
                    onConfirm={() => handleDeleteStructure(structure.id)}
                  >
                    <Button size="sm" variant="destructive">
                      Delete
                    </Button>
                  </ConfirmDialog>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generate Fees For Whole Class</CardTitle>
          <p className="text-sm text-muted-foreground">
            Apply active class fee structures to every student assigned to a class.
          </p>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-4" onSubmit={handleGenerateClassFees}>
            <Select
              value={classBillingForm.institutionId}
              onChange={(event) =>
                setClassBillingForm((current) => ({
                  ...current,
                  institutionId: event.target.value,
                  classId: ""
                }))
              }
            >
              {institutions.map((institution) => (
                <option key={institution.id} value={institution.id}>
                  {institution.name}
                </option>
              ))}
            </Select>
            <Select
              value={classBillingForm.classId}
              onChange={(event) =>
                setClassBillingForm((current) => ({
                  ...current,
                  classId: event.target.value
                }))
              }
            >
              <option value="">Select Class</option>
              {billingClasses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}{item.section ? ` - ${item.section}` : ""}
                </option>
              ))}
            </Select>
            <Input
              type="date"
              value={classBillingForm.dueDate}
              onChange={(event) =>
                setClassBillingForm((current) => ({
                  ...current,
                  dueDate: event.target.value
                }))
              }
            />
            <Button disabled={generatingClassFees} type="submit">
              {generatingClassFees ? "Generating..." : "Generate Whole Class Fees"}
            </Button>
            <div className="md:col-span-4">
              <Input
                placeholder="Optional note for generated invoices"
                value={classBillingForm.notes}
                onChange={(event) =>
                  setClassBillingForm((current) => ({
                    ...current,
                    notes: event.target.value
                  }))
                }
              />
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Fee Ledger</CardTitle>
          <p className="text-sm text-muted-foreground">
            Manage monthly student fee collection with per-month checkboxes.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Select
              value={ledgerFilters.institutionId}
              onChange={(event) =>
                setLedgerFilters((current) => ({
                  ...current,
                  institutionId: event.target.value,
                  classId: "ALL"
                }))
              }
            >
              {institutions.map((institution) => (
                <option key={institution.id} value={institution.id}>
                  {institution.name}
                </option>
              ))}
            </Select>
            <Select
              value={ledgerFilters.classId}
              onChange={(event) =>
                setLedgerFilters((current) => ({
                  ...current,
                  classId: event.target.value
                }))
              }
            >
              <option value="ALL">All Classes</option>
              {filteredClasses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}{item.section ? ` - ${item.section}` : ""}
                </option>
              ))}
            </Select>
            <Input
              min="2020"
              type="number"
              value={ledgerFilters.year}
              onChange={(event) =>
                setLedgerFilters((current) => ({
                  ...current,
                  year: event.target.value
                }))
              }
            />
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Student</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Class</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Fee</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Monthly</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Paid Months</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Due Months</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Total Payable</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Total Paid</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Balance</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Actions</th>
                  {ledgerRows[0]?.months.map((month) => (
                    <th className="px-3 py-3 text-center font-semibold text-muted-foreground" key={month.monthNumber}>
                      {month.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ledgerLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <tr className="border-b" key={index}>
                      {Array.from({ length: 22 }).map((__, cellIndex) => (
                        <td className="px-4 py-3" key={cellIndex}>
                          <Skeleton className="h-4 w-full min-w-10" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : ledgerRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-12 text-center text-muted-foreground" colSpan={22}>
                      No monthly fee structures found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  ledgerRows.map((row) => {
                    const summary = getLedgerSummary(row);

                    return (
                    <tr className="border-b" key={`${row.studentId}-${row.feeStructureId}`}>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{row.studentName}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{row.className}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{row.feeName}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatCurrency(row.amount)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{summary.paidMonths}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{summary.dueMonths}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatCurrency(summary.totalPayable)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-emerald-600">{formatCurrency(summary.totalPaid)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-red-600">{formatCurrency(summary.balance)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <ConfirmDialog
                          description={`Delete the fee ledger and generated month-wise invoices for ${row.studentName}?`}
                          onConfirm={() => handleDeleteLedger(row)}
                        >
                          <Button size="sm" variant="destructive">
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </ConfirmDialog>
                      </td>
                      {row.months.map((month) => {
                        const checkboxKey = `${row.studentId}-${row.feeStructureId}-${month.monthNumber}`;

                        return (
                          <td className="px-3 py-3 text-center" key={month.monthNumber}>
                            <label className="inline-flex cursor-pointer items-center justify-center">
                              <input
                                checked={month.isPaid}
                                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                disabled={ledgerUpdatingKey === checkboxKey}
                                onChange={() => toggleLedgerMonth(row, month)}
                                type="checkbox"
                              />
                            </label>
                          </td>
                        );
                      })}
                    </tr>
                  );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <FeeStructureFormDialog
        open={structureDialogOpen}
        onOpenChange={(nextOpen) => {
          setStructureDialogOpen(nextOpen);
          if (!nextOpen) {
            setEditingStructure(null);
          }
        }}
        initialValues={editingStructure}
        institutions={institutions}
        classes={classes}
        defaultInstitutionId={institutions[0]?.id || ""}
        onSuccess={handleStructureSuccess}
      />
    </div>
  );
}
