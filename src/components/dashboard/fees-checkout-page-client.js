"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, CreditCard, NotebookPen, Receipt, Search, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button.js";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.js";
import { Input } from "../ui/input.js";
import { Select } from "../ui/select.js";
import { Badge } from "../ui/badge.js";
import { StudentFeesDialog } from "./student-fees-dialog.js";
import { formatCurrency } from "../../lib/currency.js";
import { formatDate } from "../../lib/dateFormat.js";
import { can } from "../../lib/permissions.js";

function getStudentDisplayName(student) {
  return `${student?.studentFirstName || ""} ${student?.studentLastName || ""}`.trim() || "NA";
}

function buildFilterUrl(filters) {
  const params = new URLSearchParams();

  if (filters.view && filters.view !== "cards") {
    params.set("view", filters.view);
  }
  if (filters.institutionId) {
    params.set("institutionId", filters.institutionId);
  }
  if (filters.classId && filters.classId !== "ALL") {
    params.set("classId", filters.classId);
  }
  if (filters.academicYear && filters.academicYear !== "ALL") {
    params.set("academicYear", filters.academicYear);
  }
  if (filters.search) {
    params.set("search", filters.search);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

export function FeesCheckoutPageClient({
  invoices,
  institutions,
  classes,
  currentUser,
  defaultFilters = {}
}) {
  const canManageFees = can(currentUser, "fees.manage");
  const [filters, setFilters] = useState({
    view: defaultFilters.view || "table",
    institutionId: defaultFilters.institutionId || "",
    classId: defaultFilters.classId || "ALL",
    academicYear: defaultFilters.academicYear || "ALL",
    search: defaultFilters.search || ""
  });
  const [checkoutStudent, setCheckoutStudent] = useState(null);
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);

  const pendingInvoiceRows = useMemo(
    () => invoices.filter((invoice) => Number(invoice.balance || 0) > 0),
    [invoices]
  );

  const availableClasses = useMemo(
    () =>
      classes.filter((item) =>
        filters.institutionId ? item.institutionId === filters.institutionId : true
      ),
    [classes, filters.institutionId]
  );

  const pendingAcademicYears = useMemo(
    () =>
      Array.from(
        new Set(
          pendingInvoiceRows
            .filter((invoice) => (filters.institutionId ? invoice.institutionId === filters.institutionId : true))
            .map((invoice) => invoice.studentAcademicYear)
            .filter(Boolean)
        )
      ).sort((left, right) => String(right).localeCompare(String(left), undefined, { numeric: true, sensitivity: "base" })),
    [filters.institutionId, pendingInvoiceRows]
  );

  const pendingStudentGroups = useMemo(() => {
    const map = new Map();
    const query = filters.search.trim().toLowerCase();

    for (const invoice of pendingInvoiceRows) {
      if (filters.institutionId && invoice.institutionId !== filters.institutionId) {
        continue;
      }

      if (filters.classId !== "ALL") {
        const studentClassId = invoice.studentClassId || invoice.classId || "";
        if (studentClassId !== filters.classId) {
          continue;
        }
      }

      if (filters.academicYear !== "ALL") {
        const studentAcademicYear = invoice.studentAcademicYear || "";
        if (studentAcademicYear !== filters.academicYear) {
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

    return Array.from(map.values()).sort((left, right) => {
      const balanceCompare = Number(right.totalBalance || 0) - Number(left.totalBalance || 0);
      if (balanceCompare !== 0) {
        return balanceCompare;
      }

      return getStudentDisplayName(left).localeCompare(getStudentDisplayName(right), undefined, {
        numeric: true,
        sensitivity: "base"
      });
    });
  }, [filters, pendingInvoiceRows]);

  const groupedStudents = useMemo(() => {
    const years = new Map();

    for (const student of pendingStudentGroups) {
      const year = student.academicYear || "Unspecified";
      const classLabel = student.className
        ? student.section
          ? `${student.className} - ${student.section}`
          : student.className
        : "Unassigned";
      const yearClasses = years.get(year) || new Map();
      const classStudents = yearClasses.get(classLabel) || [];
      classStudents.push(student);
      yearClasses.set(classLabel, classStudents);
      years.set(year, yearClasses);
    }

    return Array.from(years.entries()).sort(([left], [right]) =>
      String(right).localeCompare(String(left), undefined, { numeric: true, sensitivity: "base" })
    );
  }, [pendingStudentGroups]);

  const totalOutstanding = pendingStudentGroups.reduce((sum, item) => sum + Number(item.totalBalance || 0), 0);
  const overdueStudents = pendingStudentGroups.filter((item) => item.overdueCount > 0).length;
  const totalInvoices = pendingStudentGroups.reduce((sum, item) => sum + Number(item.invoiceCount || 0), 0);

  function updateFilters(nextPartial) {
    setFilters((current) => {
      const nextFilters = {
        ...current,
        ...nextPartial
      };
      const nextQuery = buildFilterUrl(nextFilters);
      window.history.replaceState(null, "", `/fees/checkout${nextQuery}`);
      return nextFilters;
    });
  }

  function openStudentCheckout(studentGroup) {
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

  function downloadCsv() {
    if (pendingStudentGroups.length === 0) {
      toast.error("No pending students to export.");
      return;
    }

    const csvRows = [
      [
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
      ],
      ...pendingStudentGroups.map((row) => [
        getStudentDisplayName(row),
        row.admissionNumber || "NA",
        row.institutionName || "NA",
        row.className ? `${row.className}${row.section ? ` - ${row.section}` : ""}` : "Unassigned",
        row.academicYear || "NA",
        row.invoiceCount,
        Number(row.totalAssigned || 0).toFixed(2),
        Number(row.totalPaid || 0).toFixed(2),
        Number(row.totalBalance || 0).toFixed(2),
        row.overdueCount,
        row.latestDueDate || "NA"
      ])
    ];

    const csv = csvRows
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
    toast.success("CSV export started.");
  }

  function printPdf() {
    if (pendingStudentGroups.length === 0) {
      toast.error("No pending students to export.");
      return;
    }

    const rows = pendingStudentGroups
      .map(
        (row) => `
          <tr>
            <td>${getStudentDisplayName(row)}</td>
            <td>${row.admissionNumber || "NA"}</td>
            <td>${row.institutionName || "NA"}</td>
            <td>${row.className ? `${row.className}${row.section ? ` - ${row.section}` : ""}` : "Unassigned"}</td>
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
          <p>${pendingStudentGroups.length} student(s) with pending fees.</p>
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
            <tbody>${rows}</tbody>
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

  const currentInstitutionName =
    institutions.find((institution) => institution.id === filters.institutionId)?.name || "All Institutions";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Checkout report</p>
          <h1 className="text-2xl font-semibold tracking-tight">Pending Fees Ledger</h1>
          <p className="text-sm text-muted-foreground">
            Saved filters stay in the URL so you can share or return to the same pending-fee view.
          </p>
        </div>
        <Button asChild variant="outline">
          <a href="/fees">
            <ArrowLeft className="h-4 w-4" />
            Back to Fees
          </a>
        </Button>
      </div>

      <Card className="border-slate-200 bg-gradient-to-r from-slate-50 via-white to-sky-50">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap gap-2">
            <div className="rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-600">
              {pendingStudentGroups.length} students
            </div>
            <div className="rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-600">
              {formatCurrency(totalOutstanding)} outstanding
            </div>
            <div className="rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-600">
              {overdueStudents} overdue
            </div>
            <div className="rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-600">
              {totalInvoices} invoices
            </div>
            <div className="rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-600">
              {currentInstitutionName}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Institution</p>
              <Select
                value={filters.institutionId}
                onChange={(event) =>
                  updateFilters({
                    institutionId: event.target.value,
                    classId: "ALL",
                    academicYear: "ALL"
                  })
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
                value={filters.classId}
                onChange={(event) =>
                  updateFilters({
                    classId: event.target.value,
                    academicYear: "ALL"
                  })
                }
              >
                <option value="ALL">All Classes</option>
                {availableClasses.map((item) => (
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
                value={filters.academicYear}
                onChange={(event) =>
                  updateFilters({
                    academicYear: event.target.value
                  })
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
                value={filters.search}
                onChange={(event) =>
                  updateFilters({
                    search: event.target.value
                  })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Students</p>
            <p className="mt-2 text-2xl font-semibold">{pendingStudentGroups.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Outstanding</p>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(totalOutstanding)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Overdue</p>
            <p className="mt-2 text-2xl font-semibold">{overdueStudents}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Invoices</p>
            <p className="mt-2 text-2xl font-semibold">{totalInvoices}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => updateFilters({ view: "cards" })}
            type="button"
            variant={filters.view === "cards" ? "default" : "outline"}
          >
            Cards
          </Button>
          <Button
            onClick={() => updateFilters({ view: "table" })}
            type="button"
            variant={filters.view === "table" ? "default" : "outline"}
          >
            List
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={downloadCsv} type="button" variant="outline">
            Download Excel
          </Button>
          <Button onClick={printPdf} type="button" variant="outline">
            Download PDF
          </Button>
        </div>
      </div>

      {filters.view === "cards" ? (
        <div className="space-y-6">
          {groupedStudents.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                No pending fees match the selected filters.
              </CardContent>
            </Card>
          ) : (
            groupedStudents.map(([academicYear, classMap]) => (
              <Card key={academicYear}>
                <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-border/80">
                  <div>
                    <CardTitle>{academicYear}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {Array.from(classMap.values()).reduce((sum, list) => sum + list.length, 0)} student(s)
                    </p>
                  </div>
                  <Badge variant="outline">Academic Year Group</Badge>
                </CardHeader>
                <CardContent className="space-y-6 p-5">
                  {Array.from(classMap.entries()).map(([classLabel, students]) => (
                    <div key={`${academicYear}-${classLabel}`} className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-base font-semibold">{classLabel}</h3>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          {students.length} student(s)
                        </span>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {students.map((student) => (
                          <button
                            className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
                            key={student.studentId}
                            onClick={() => openStudentCheckout(student)}
                            type="button"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <p className="font-semibold">{getStudentDisplayName(student)}</p>
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
                                {student.className ? `${student.className}${student.section ? ` - ${student.section}` : ""}` : "Unassigned"}
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
        <Card>
          <CardHeader>
            <CardTitle>Pending Students</CardTitle>
            <p className="text-sm text-muted-foreground">List view for reporting, export, and quick lookup.</p>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Student</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Class</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Year</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Invoices</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Assigned</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Paid</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Due</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Overdue</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Latest Due Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingStudentGroups.length === 0 ? (
                  <tr>
                    <td className="px-4 py-12 text-center text-muted-foreground" colSpan={10}>
                      No pending fees match the selected filters.
                    </td>
                  </tr>
                ) : (
                  pendingStudentGroups.map((student) => (
                    <tr className="border-b" key={student.studentId}>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <p className="font-medium">{getStudentDisplayName(student)}</p>
                          <p className="text-xs text-muted-foreground">
                            {student.admissionNumber || "NA"} • {student.institutionName || "Institution"}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {student.className ? `${student.className}${student.section ? ` - ${student.section}` : ""}` : "Unassigned"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{student.academicYear || "NA"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{student.invoiceCount}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatCurrency(student.totalAssigned)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatCurrency(student.totalPaid)}</td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium">{formatCurrency(student.totalBalance)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{student.overdueCount}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {student.latestDueDate ? formatDate(student.latestDueDate) : "NA"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Button size="sm" type="button" variant="outline" onClick={() => openStudentCheckout(student)}>
                          Open
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

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
