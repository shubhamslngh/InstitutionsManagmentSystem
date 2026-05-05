"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  FileText,
  IndianRupee,
  LayoutDashboard,
  NotebookPen,
  Plus,
  Receipt,
  School,
  Table2,
  Trash2,
  Wallet
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button.js";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.js";
import { Badge } from "../ui/badge.js";
import { ConfirmDialog } from "./confirm-dialog.js";
import { FeeStructureFormDialog } from "../forms/fee-structure-form-dialog.js";
import { MetricCard } from "./metric-card.js";
import { StatusBadge } from "./status-badge.js";
import { FeesOverviewChart } from "../charts/fees-overview-chart.js";
import { StudentFeesDialog } from "./student-fees-dialog.js";
import { DataTable } from "../tables/data-table.js";
import { Input } from "../ui/input.js";
import { Select } from "../ui/select.js";
import { Skeleton } from "../ui/skeleton.js";
import { formatCurrency } from "../../lib/currency.js";
import { formatDate } from "../../lib/dateFormat.js";
import { can } from "../../lib/permissions.js";

export function FeesDashboardClient({
  invoices,
  payments,
  institutions,
  classes,
  structures,
  defaultInstitutionId = "",
  defaultTab = "checkout",
  currentUser
}) {
  const [invoiceRows, setInvoiceRows] = useState(invoices);
  const [paymentRows] = useState(payments);
  const [structureRows, setStructureRows] = useState(structures);
  const [structureDialogOpen, setStructureDialogOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState(null);
  const [ledgerFilters, setLedgerFilters] = useState({
    institutionId: defaultInstitutionId || institutions[0]?.id || "",
    classId: "ALL",
    year: String(new Date().getFullYear())
  });
  const [ledgerRows, setLedgerRows] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerUpdatingKey, setLedgerUpdatingKey] = useState(null);
  const [checkoutFilters, setCheckoutFilters] = useState({
    institutionId: defaultInstitutionId || institutions[0]?.id || "",
    classId: "ALL",
    academicYear: "ALL",
    search: ""
  });
  const [checkoutStudent, setCheckoutStudent] = useState(null);
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [checkoutView, setCheckoutView] = useState("cards");
  const allowedTabs = new Set(["overview", "invoices", "structures", "checkout", "ledger", "billing"]);
  const initialTab = defaultTab === "billing" ? "checkout" : defaultTab;
  const [activeTab, setActiveTab] = useState(allowedTabs.has(initialTab) ? initialTab : "overview");
  const canManageFees = can(currentUser, "fees.manage");
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
  const ledgerMonthColumns = ledgerRows[0]?.months || [];
  const ledgerColumnCount = 11 + ledgerMonthColumns.length;
  const filteredClasses = useMemo(
    () => classes.filter((item) => item.institutionId === ledgerFilters.institutionId),
    [classes, ledgerFilters.institutionId]
  );
  const checkoutClasses = useMemo(
    () =>
      classes.filter((item) =>
        checkoutFilters.institutionId ? item.institutionId === checkoutFilters.institutionId : true
      ),
    [classes, checkoutFilters.institutionId]
  );
  const pendingInvoiceRows = useMemo(
    () => invoiceRows.filter((invoice) => Number(invoice.balance || 0) > 0),
    [invoiceRows]
  );
  const pendingStudentGroups = useMemo(() => {
    const map = new Map();
    const query = checkoutFilters.search.trim().toLowerCase();

    for (const invoice of pendingInvoiceRows) {
      if (checkoutFilters.institutionId && invoice.institutionId !== checkoutFilters.institutionId) {
        continue;
      }

      if (checkoutFilters.classId !== "ALL") {
        const studentClassId = invoice.studentClassId || invoice.classId || "";
        if (studentClassId !== checkoutFilters.classId) {
          continue;
        }
      }

      if (checkoutFilters.academicYear !== "ALL") {
        const studentAcademicYear = invoice.studentAcademicYear || "";
        if (studentAcademicYear !== checkoutFilters.academicYear) {
          continue;
        }
      }

      const studentName = `${invoice.studentFirstName || ""} ${invoice.studentLastName || ""}`.trim();
      const classLabel = invoice.studentClassName
        ? invoice.studentSection
          ? `${invoice.studentClassName} - ${invoice.studentSection}`
          : invoice.studentClassName
        : "Unassigned";
      const institutionName = invoice.institutionName || "Institution";
      const searchTarget = [
        studentName,
        invoice.studentAdmissionNumber,
        classLabel,
        invoice.studentAcademicYear,
        institutionName,
        invoice.title
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (query && !searchTarget.includes(query)) {
        continue;
      }

      const current = map.get(invoice.studentId) || {
        studentId: invoice.studentId,
        institutionId: invoice.institutionId,
        institutionName,
        studentFirstName: invoice.studentFirstName || "",
        studentLastName: invoice.studentLastName || "",
        admissionNumber: invoice.studentAdmissionNumber || "",
        classId: invoice.studentClassId || invoice.classId || "",
        className: invoice.studentClassName || "",
        section: invoice.studentSection || "",
        academicYear: invoice.studentAcademicYear || "",
        totalAssigned: 0,
        totalPaid: 0,
        totalBalance: 0,
        invoiceCount: 0,
        overdueCount: 0,
        latestDueDate: "",
        invoices: []
      };

      current.totalAssigned += Number(invoice.netAmount || 0);
      current.totalPaid += Number(invoice.totalPaid || 0);
      current.totalBalance += Number(invoice.balance || 0);
      current.invoiceCount += 1;
      current.overdueCount += invoice.dueDate && new Date(invoice.dueDate) < new Date() ? 1 : 0;
      current.latestDueDate =
        !current.latestDueDate || (invoice.dueDate && invoice.dueDate > current.latestDueDate)
          ? invoice.dueDate || current.latestDueDate
          : current.latestDueDate;
      current.invoices.push(invoice);
      map.set(invoice.studentId, current);
    }

    return Array.from(map.values())
      .sort((left, right) => {
        const balanceCompare = Number(right.totalBalance || 0) - Number(left.totalBalance || 0);
        if (balanceCompare !== 0) {
          return balanceCompare;
        }

        return getStudentDisplayName(left).localeCompare(getStudentDisplayName(right), undefined, {
          numeric: true,
          sensitivity: "base"
        });
      })
      .map((item) => ({
        ...item,
        invoices: item.invoices.sort((left, right) => {
          const leftDate = left.dueDate || left.createdAt || "";
          const rightDate = right.dueDate || right.createdAt || "";
          return String(leftDate).localeCompare(String(rightDate), undefined, {
            numeric: true,
            sensitivity: "base"
          });
        })
      }));
  }, [checkoutFilters, pendingInvoiceRows]);
  const pendingOverdueStudents = useMemo(
    () => pendingStudentGroups.filter((student) => student.overdueCount > 0).length,
    [pendingStudentGroups]
  );
  const pendingAcademicYears = useMemo(
    () =>
      Array.from(
        new Set(
          pendingInvoiceRows
            .filter((invoice) =>
              checkoutFilters.institutionId ? invoice.institutionId === checkoutFilters.institutionId : true
            )
            .map((invoice) => invoice.studentAcademicYear)
            .filter(Boolean)
        )
      ).sort((left, right) => String(right).localeCompare(String(left), undefined, { numeric: true, sensitivity: "base" })),
    [checkoutFilters.institutionId, pendingInvoiceRows]
  );
  const checkoutGroupedSections = useMemo(() => {
    const academicYearMap = new Map();

    for (const student of pendingStudentGroups) {
      const academicYear = student.academicYear || "Unspecified";
      const classLabel = student.className
        ? student.section
          ? `${student.className} - ${student.section}`
          : student.className
        : "Unassigned";

      const classesForYear = academicYearMap.get(academicYear) || new Map();
      const classStudents = classesForYear.get(classLabel) || [];
      classStudents.push(student);
      classesForYear.set(classLabel, classStudents);
      academicYearMap.set(academicYear, classesForYear);
    }

    return Array.from(academicYearMap.entries())
      .sort(([left], [right]) => String(right).localeCompare(String(left), undefined, { numeric: true, sensitivity: "base" }))
      .map(([academicYear, classMap]) => ({
        academicYear,
        classes: Array.from(classMap.entries())
          .map(([classLabel, students]) => ({
            classLabel,
            students: students.sort((left, right) =>
              getStudentDisplayName(left).localeCompare(getStudentDisplayName(right), undefined, {
                numeric: true,
                sensitivity: "base"
              })
            )
          }))
          .sort((left, right) => left.classLabel.localeCompare(right.classLabel, undefined, { numeric: true, sensitivity: "base" }))
      }));
  }, [pendingStudentGroups]);

  const checkoutTableRows = useMemo(
    () =>
      pendingStudentGroups.map((student) => ({
        ...student,
        classLabel: student.className
          ? student.section
            ? `${student.className} - ${student.section}`
            : student.className
          : "Unassigned",
        studentName: getStudentDisplayName({
          firstName: student.studentFirstName,
          lastName: student.studentLastName
        })
      })),
    [pendingStudentGroups]
  );
  const tabItems = [
    {
      id: "checkout",
      label: "Checkout",
      icon: NotebookPen,
      description: "Primary fee collection queue",
      count: pendingStudentGroups.length
    },
    {
      id: "overview",
      label: "Overview",
      icon: LayoutDashboard,
      description: "Summary, chart, and recent activity"
    },
    {
      id: "invoices",
      label: "Invoices",
      icon: FileText,
      description: "Recent invoice snapshot"
    },
    {
      id: "structures",
      label: "Structures",
      icon: School,
      description: "Fee structure setup",
      count: structureRows.length
    },
    {
      id: "ledger",
      label: "Ledger",
      icon: Table2,
      description: "Monthly payment tracking"
    }
  ];

  useEffect(() => {
    const nextInstitutionId = defaultInstitutionId || institutions[0]?.id || "";
    setLedgerFilters((current) => ({
      ...current,
      institutionId: nextInstitutionId,
      classId: "ALL"
    }));
    setCheckoutFilters((current) => ({
      ...current,
      institutionId: nextInstitutionId,
      classId: "ALL",
      academicYear: "ALL"
    }));
  }, [defaultInstitutionId, institutions]);
  useEffect(() => {
    setCheckoutFilters((current) => {
      const nextClasses = classes.filter((item) =>
        current.institutionId ? item.institutionId === current.institutionId : true
      );
      const hasSelectedClass =
        current.classId === "ALL" ||
        nextClasses.some((item) => item.id === current.classId);

      return hasSelectedClass
        ? current
        : {
            ...current,
            classId: "ALL"
          };
    });
  }, [classes, checkoutFilters.institutionId]);

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

  async function refreshLedgerRows() {
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

    const response = await fetch(`/api/fees/monthly-ledger?${params.toString()}`);
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.message || "Failed to load monthly ledger.");
    }

    setLedgerRows(result.data.rows || []);
  }

  async function toggleLedgerMonth(row, month) {
    if (!canManageFees) {
      return;
    }

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

    try {
      await refreshLedgerRows();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLedgerUpdatingKey(null);
    }
  }

  async function handleDeleteLedger(row) {
    if (!canManageFees) {
      return;
    }

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

  function getLedgerSummary(row) {
    const paidMonths = row.months.filter((month) => month.isPaid).length;
    const dueMonths = Math.max(row.months.length - paidMonths, 0);
    const totalDiscount = row.months.reduce(
      (sum, month) => sum + Number(month.discountAmount || 0),
      0
    );
    const totalPayable = row.months.reduce(
      (sum, month) => sum + Number(month.netAmount || 0),
      0
    );
    const totalPaid = row.months.reduce(
      (sum, month) => sum + Number(month.totalPaid || 0),
      0
    );
    const balance = row.months.reduce(
      (sum, month) => sum + Number(month.balance || 0),
      0
    );

    return {
      paidMonths,
      dueMonths,
      totalPayable,
      totalPaid,
      balance,
      totalDiscount
    };
  }

  async function handleDeleteStructure(id) {
    if (!canManageFees) {
      return;
    }

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

  function openCheckoutStudent(studentGroup) {
    if (!studentGroup) {
      return;
    }

    setCheckoutStudent({
      id: studentGroup.studentId,
      institutionId: studentGroup.institutionId,
      firstName: studentGroup.studentFirstName,
      lastName: studentGroup.studentLastName,
      admissionNumber: studentGroup.admissionNumber,
      className: studentGroup.className,
      section: studentGroup.section,
      academicYear: studentGroup.academicYear
    });
    setCheckoutDialogOpen(true);
  }

  function downloadCheckoutCsv() {
    if (checkoutTableRows.length === 0) {
      toast.error("No pending students to export.");
      return;
    }

    const headers = [
      "Student",
      "Admission No.",
      "Institution",
      "Class",
      "Academic Year",
      "Invoices",
      "Assigned",
      "Paid",
      "Due",
      "Overdue Count",
      "Latest Due Date"
    ];
    const csvRows = checkoutTableRows.map((row) => [
      row.studentName,
      row.admissionNumber || "NA",
      row.institutionName || "NA",
      row.classLabel || "Unassigned",
      row.academicYear || "NA",
      row.invoiceCount,
      Number(row.totalAssigned || 0).toFixed(2),
      Number(row.totalPaid || 0).toFixed(2),
      Number(row.totalBalance || 0).toFixed(2),
      row.overdueCount,
      row.latestDueDate || "NA"
    ]);

    const csv = [headers, ...csvRows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pending-fees-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success("Excel-compatible CSV download started.");
  }

  function printCheckoutPdf() {
    if (checkoutTableRows.length === 0) {
      toast.error("No pending students to export.");
      return;
    }

    const rowsMarkup = checkoutTableRows
      .map(
        (row) => `
          <tr>
            <td>${row.studentName}</td>
            <td>${row.admissionNumber || "NA"}</td>
            <td>${row.institutionName || "NA"}</td>
            <td>${row.classLabel || "Unassigned"}</td>
            <td>${row.academicYear || "NA"}</td>
            <td>${row.invoiceCount}</td>
            <td>${formatCurrency(row.totalAssigned || 0)}</td>
            <td>${formatCurrency(row.totalPaid || 0)}</td>
            <td>${formatCurrency(row.totalBalance || 0)}</td>
            <td>${row.overdueCount}</td>
            <td>${row.latestDueDate ? formatDate(row.latestDueDate) : "NA"}</td>
          </tr>
        `
      )
      .join("");

    const html = `<!DOCTYPE html>
      <html>
        <head>
          <title>Pending Fee Checkout</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
            h1 { margin: 0 0 8px; font-size: 20px; }
            p { margin: 0 0 16px; color: #555; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
            th { background: #f5f5f5; }
          </style>
        </head>
        <body>
          <h1>Pending Fee Checkout</h1>
          <p>${checkoutTableRows.length} student(s) with pending fees.</p>
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Admission No.</th>
                <th>Institution</th>
                <th>Class</th>
                <th>Academic Year</th>
                <th>Invoices</th>
                <th>Assigned</th>
                <th>Paid</th>
                <th>Due</th>
                <th>Overdue</th>
                <th>Latest Due Date</th>
              </tr>
            </thead>
            <tbody>${rowsMarkup}</tbody>
          </table>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 300);
            };
          </script>
        </body>
      </html>`;

    const popup = window.open("", "_blank", "noopener,noreferrer,width=1200,height=800");
    if (!popup) {
      toast.error("Popup blocked. Allow popups to download PDF.");
      return;
    }

    popup.document.open();
    popup.document.write(html);
    popup.document.close();
  }

  function renderOverviewTab() {
    return (
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
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
                    <p className="text-xs text-muted-foreground">
                      {payment.paymentMethod} • {formatDate(payment.paymentDate)}
                    </p>
                  </div>
                  <StatusBadge status="PAID" />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderInvoicesTab() {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoice Snapshot</CardTitle>
          <p className="text-sm text-muted-foreground">Recent invoices grouped for quick review.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {recentInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices created yet.</p>
          ) : (
            recentInvoices.map((invoice) => (
              <div
                className="flex flex-col gap-3 rounded-md border p-4 md:flex-row md:items-center md:justify-between"
                key={invoice.id}
              >
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
    );
  }

  function renderStructuresTab() {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Fee Structures</CardTitle>
            <p className="text-sm text-muted-foreground">
              Create tuition structures for a whole institution or bind them to a specific class.
            </p>
          </div>
          {canManageFees ? (
            <Button onClick={() => setStructureDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Fee Structure
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {structureRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No fee structures created yet.</p>
          ) : (
            structureRows.map((structure) => (
              <div
                className="flex flex-col gap-3 rounded-md border p-4 md:flex-row md:items-center md:justify-between"
                key={structure.id}
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
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
                {canManageFees ? (
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
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    );
  }

  function renderCheckoutTab() {
    const checkoutColumns = [
      {
        accessorKey: "studentName",
        meta: { label: "Student" },
        header: "Student",
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="font-medium">{row.original.studentName}</p>
            <p className="text-xs text-muted-foreground">
              {row.original.admissionNumber || "NA"} • {row.original.institutionName || "NA"}
            </p>
          </div>
        )
      },
      {
        accessorKey: "classLabel",
        meta: { label: "Class" },
        header: "Class"
      },
      {
        accessorKey: "academicYear",
        meta: { label: "Academic Year" },
        header: "Academic Year"
      },
      {
        accessorKey: "invoiceCount",
        meta: { label: "Invoices" },
        header: "Invoices"
      },
      {
        accessorKey: "totalAssigned",
        meta: { label: "Assigned" },
        header: "Assigned",
        cell: ({ row }) => formatCurrency(row.original.totalAssigned || 0)
      },
      {
        accessorKey: "totalPaid",
        meta: { label: "Paid" },
        header: "Paid",
        cell: ({ row }) => formatCurrency(row.original.totalPaid || 0)
      },
      {
        accessorKey: "totalBalance",
        meta: { label: "Due" },
        header: "Due",
        cell: ({ row }) => formatCurrency(row.original.totalBalance || 0)
      },
      {
        accessorKey: "overdueCount",
        meta: { label: "Overdue" },
        header: "Overdue"
      },
      {
        accessorKey: "latestDueDate",
        meta: { label: "Latest Due Date" },
        header: "Latest Due Date",
        cell: ({ row }) => (row.original.latestDueDate ? formatDate(row.original.latestDueDate) : "NA")
      },
      {
        id: "actions",
        meta: { label: "Actions" },
        header: "Actions",
        cell: ({ row }) => (
          <Button size="sm" type="button" variant="outline" onClick={() => openCheckoutStudent(row.original)}>
            Open
          </Button>
        )
      }
    ];

    return (
      <div className="space-y-6">
        <Card className="border-slate-200 bg-gradient-to-r from-slate-50 via-white to-sky-50">
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <CardTitle>Pending Fee Checkout</CardTitle>
              <p className="text-sm text-muted-foreground">
                Review students with outstanding balances. This list is built from existing invoices only.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-600">
                {pendingStudentGroups.length} students
              </div>
              <div className="rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-600">
                {formatCurrency(pendingStudentGroups.reduce((sum, item) => sum + Number(item.totalBalance || 0), 0))}{" "}
                outstanding
              </div>
              <div className="rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-600">
                {pendingOverdueStudents} overdue
              </div>
              <div className="rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-600">
                {checkoutGroupedSections.length} academic years
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => setCheckoutView("cards")}
                  type="button"
                  variant={checkoutView === "cards" ? "default" : "outline"}
                >
                  Cards
                </Button>
                <Button
                  onClick={() => setCheckoutView("table")}
                  type="button"
                  variant={checkoutView === "table" ? "default" : "outline"}
                >
                  List
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={downloadCheckoutCsv} type="button" variant="outline">
                  Download Excel
                </Button>
                <Button onClick={printCheckoutPdf} type="button" variant="outline">
                  Download PDF
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Institution</p>
                <Select
                  value={checkoutFilters.institutionId}
                  onChange={(event) =>
                    setCheckoutFilters((current) => ({
                      ...current,
                      institutionId: event.target.value,
                      classId: "ALL",
                      academicYear: "ALL"
                    }))
                  }
                >
                  <option value="">All Institutions</option>
                  {institutions.map((institution) => (
                    <option key={institution.id} value={institution.id}>
                      {institution.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Class</p>
                <Select
                  value={checkoutFilters.classId}
                  onChange={(event) =>
                    setCheckoutFilters((current) => ({
                      ...current,
                      classId: event.target.value,
                      academicYear: "ALL"
                    }))
                  }
                >
                  <option value="ALL">All Classes</option>
                  {checkoutClasses.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {item.section ? ` - ${item.section}` : ""}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Academic Year</p>
                <Select
                  value={checkoutFilters.academicYear}
                  onChange={(event) =>
                    setCheckoutFilters((current) => ({
                      ...current,
                      academicYear: event.target.value
                    }))
                  }
                >
                  <option value="ALL">All Years</option>
                  {pendingAcademicYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Search</p>
                <Input
                  placeholder="Name, admission, class, institution"
                  value={checkoutFilters.search}
                  onChange={(event) =>
                    setCheckoutFilters((current) => ({
                      ...current,
                      search: event.target.value
                    }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
          <MetricCard icon={Receipt} label="Pending Students" value={pendingStudentGroups.length} />
          <MetricCard
            icon={CreditCard}
            label="Outstanding"
            value={formatCurrency(pendingStudentGroups.reduce((sum, item) => sum + Number(item.totalBalance || 0), 0))}
            tone="danger"
          />
          <MetricCard icon={Wallet} label="Overdue Students" value={pendingOverdueStudents} tone="warning" />
          <MetricCard
            icon={NotebookPen}
            label="Invoices in View"
            value={pendingStudentGroups.reduce((sum, item) => sum + Number(item.invoiceCount || 0), 0)}
            tone="success"
          />
        </div>

        {checkoutView === "cards" ? (
          <div className="space-y-6">
            {checkoutGroupedSections.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-sm text-muted-foreground">
                  No pending fees match the selected filters.
                </CardContent>
              </Card>
            ) : (
              checkoutGroupedSections.map((yearGroup) => (
                <Card key={yearGroup.academicYear}>
                  <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-border/80">
                    <div>
                      <CardTitle>{yearGroup.academicYear}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {yearGroup.classes.reduce((sum, item) => sum + item.students.length, 0)} student(s)
                      </p>
                    </div>
                    <div className="rounded-full border bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                      Academic Year Group
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6 p-5">
                    {yearGroup.classes.map((classGroup) => (
                      <div key={`${yearGroup.academicYear}-${classGroup.classLabel}`} className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h3 className="text-base font-semibold">{classGroup.classLabel}</h3>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                            {classGroup.students.length} student(s)
                          </span>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          {classGroup.students.map((student) => (
                            <button
                              className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
                              key={student.studentId}
                              onClick={() => openCheckoutStudent(student)}
                              type="button"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                  <p className="font-semibold">{student.studentName}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {student.admissionNumber || "NA"} • {student.institutionName || "Institution"}
                                  </p>
                                </div>
                                <div className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                                  {formatCurrency(student.totalBalance)}
                                </div>
                              </div>

                              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                                <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                                  {student.classLabel}
                                </span>
                                <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                                  {student.academicYear || "Academic year NA"}
                                </span>
                                <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                                  {student.invoiceCount} invoice(s)
                                </span>
                                {student.overdueCount > 0 ? (
                                  <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">
                                    {student.overdueCount} overdue
                                  </span>
                                ) : null}
                              </div>

                              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                                <div className="rounded-xl bg-slate-50 p-3">
                                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Assigned</p>
                                  <p className="mt-1 font-semibold">{formatCurrency(student.totalAssigned)}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-3">
                                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Paid</p>
                                  <p className="mt-1 font-semibold">{formatCurrency(student.totalPaid)}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-3">
                                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Due</p>
                                  <p className="mt-1 font-semibold">{formatCurrency(student.totalBalance)}</p>
                                </div>
                              </div>

                              <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                                <span>Open checkout</span>
                                <span>{student.latestDueDate ? `Due ${formatDate(student.latestDueDate)}` : "No due date"}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : (
          <DataTable
            title="Pending Students"
            columns={checkoutColumns}
            data={checkoutTableRows}
            searchPlaceholder="Search pending fee students"
            emptyTitle="No pending fee students"
            emptyDescription="No pending fee records match the selected filters."
            compact
            actions={
              <div className="flex flex-wrap gap-2">
                <Button onClick={downloadCheckoutCsv} type="button" variant="outline">
                  Download Excel
                </Button>
                <Button onClick={printCheckoutPdf} type="button" variant="outline">
                  Download PDF
                </Button>
              </div>
            }
          />
        )}
      </div>
    );
  }

  function renderLedgerTab() {
    return (
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
                  {item.name}
                  {item.section ? ` - ${item.section}` : ""}
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
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Discount</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Total Payable</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Total Paid</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Balance</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Actions</th>
                  {ledgerMonthColumns.map((month) => (
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
                      {Array.from({ length: ledgerColumnCount }).map((__, cellIndex) => (
                        <td className="px-4 py-3" key={cellIndex}>
                          <Skeleton className="h-4 w-full min-w-10" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : ledgerRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-12 text-center text-muted-foreground" colSpan={ledgerColumnCount}>
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
                        <td className="px-4 py-3 whitespace-nowrap text-amber-600">
                          {formatCurrency(summary.totalDiscount)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatCurrency(summary.totalPayable)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-emerald-600">
                          {formatCurrency(summary.totalPaid)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-red-600">{formatCurrency(summary.balance)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {canManageFees ? (
                            <ConfirmDialog
                              description={`Delete the fee ledger and generated month-wise invoices for ${row.studentName}?`}
                              onConfirm={() => handleDeleteLedger(row)}
                            >
                              <Button size="sm" variant="destructive">
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </Button>
                            </ConfirmDialog>
                          ) : null}
                        </td>
                        {row.months.map((month) => {
                          const checkboxKey = `${row.studentId}-${row.feeStructureId}-${month.monthNumber}`;

                          return (
                            <td className="px-3 py-3 text-center" key={month.monthNumber}>
                              <label className="inline-flex cursor-pointer items-center justify-center">
                                <input
                                  checked={month.isPaid}
                                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                  disabled={!canManageFees || ledgerUpdatingKey === checkboxKey}
                                  onChange={() => {
                                    if (canManageFees) {
                                      toggleLedgerMonth(row, month);
                                    }
                                  }}
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
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Receipt} label="Total Fees" value={formatCurrency(totals.totalFees)} />
        <MetricCard icon={Wallet} label="Total Paid" value={formatCurrency(totals.totalPaid)} tone="success" />
        <MetricCard
          icon={CreditCard}
          label="Total Pending"
          value={formatCurrency(totals.totalPending)}
          tone="danger"
        />
        <MetricCard
          icon={IndianRupee}
          label="Total Discount"
          value={formatCurrency(totals.totalDiscount)}
          tone="warning"
        />
      </div>

      <div className="rounded-xl border bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {tabItems.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <Button
                className="h-auto min-w-0 flex-col items-start gap-1 px-4 py-3 sm:min-w-44"
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
                variant={isActive ? "default" : "outline"}
              >
                <span className="flex w-full items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="font-medium">{tab.label}</span>
                  {typeof tab.count === "number" ? <Badge variant="secondary">{tab.count}</Badge> : null}
                </span>
                <span className="text-left text-xs font-normal opacity-80">{tab.description}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {activeTab === "overview" ? renderOverviewTab() : null}
      {activeTab === "invoices" ? renderInvoicesTab() : null}
      {activeTab === "structures" ? renderStructuresTab() : null}
      {activeTab === "checkout" ? renderCheckoutTab() : null}
      {activeTab === "ledger" ? renderLedgerTab() : null}

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

      <StudentFeesDialog
        open={checkoutDialogOpen}
        onOpenChange={(nextOpen) => {
          setCheckoutDialogOpen(nextOpen);
          if (!nextOpen) {
            setCheckoutStudent(null);
          }
        }}
        student={checkoutStudent}
      />
    </div>
  );
}

function getStudentDisplayName(student) {
  const firstName = student?.firstName ?? student?.studentFirstName ?? "";
  const lastName = student?.lastName ?? student?.studentLastName ?? "";
  return `${firstName} ${lastName}`.trim() || "NA";
}
