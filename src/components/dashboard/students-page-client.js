"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpDown,
  Building2,
  CalendarDays,
  ChevronRight,
  IndianRupee,
  School,
  Users
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button.js";
import { AnimatedAddButton } from "../ui/animated-add-button.js";
import { MetricCard } from "./metric-card.js";
import { Select } from "../ui/select.js";
import { StatusBadge } from "./status-badge.js";
import { DataTable } from "../tables/data-table.js";
import { StudentFormDialog } from "../forms/student-form-dialog.js";
import { ConfirmDialog } from "./confirm-dialog.js";
import { formatDate } from "../../lib/dateFormat.js";
import { StudentFeesDialog } from "./student-fees-dialog.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../ui/dialog.js";
import { Input } from "../ui/input.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card.js";
import { can } from "../../lib/permissions.js";

function getNextAcademicYearLabel(academicYear) {
  const value = String(academicYear || "").trim();
  const match = value.match(/^(\d{4})(?:\s*-\s*(\d{2,4}))?$/);

  if (!match) {
    const currentYear = new Date().getFullYear();
    return `${currentYear}-${currentYear + 1}`;
  }

  const startYear = Number(match[1]);
  const endToken = match[2];

  if (!endToken) {
    return `${startYear + 1}`;
  }

  const endYear =
    endToken.length === 2
      ? Number(`${String(startYear).slice(0, 2)}${endToken}`)
      : Number(endToken);
  const nextStartYear = startYear + 1;
  const nextEndYear = endYear + 1;

  return endToken.length === 2
    ? `${nextStartYear}-${String(nextEndYear).slice(-2)}`
    : `${nextStartYear}-${nextEndYear}`;
}

function getClassLabel(academicClass) {
  if (!academicClass) {
    return "Unassigned";
  }

  return academicClass.section ? `${academicClass.name} - ${academicClass.section}` : academicClass.name;
}

function getStudentClassLabel(student) {
  if (!student?.classId) {
    return "Unassigned";
  }

  return student.section ? `${student.className || "Class"} - ${student.section}` : student.className || "Class";
}

function getAcademicYearStart(academicYear) {
  const match = String(academicYear || "").trim().match(/^(\d{4})/);
  return match ? Number(match[1]) : 0;
}

function compareAcademicYears(left, right) {
  const leftStart = getAcademicYearStart(left);
  const rightStart = getAcademicYearStart(right);

  if (leftStart !== rightStart) {
    return rightStart - leftStart;
  }

  return String(right || "").localeCompare(String(left || ""), undefined, {
    numeric: true,
    sensitivity: "base"
  });
}

export function StudentsPageClient({
  initialStudents,
  institutions,
  classes,
  initialError,
  defaultInstitutionId = "",
  defaultClassId = "",
  currentUser
}) {
  const [students, setStudents] = useState(initialStudents);
  const [institutionFilter, setInstitutionFilter] = useState(defaultInstitutionId);
  const [classFilter, setClassFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [feesDialogOpen, setFeesDialogOpen] = useState(false);
  const [feesStudent, setFeesStudent] = useState(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [promotionDialogOpen, setPromotionDialogOpen] = useState(false);
  const [promotionClassId, setPromotionClassId] = useState("");
  const [promotionAcademicYear, setPromotionAcademicYear] = useState("");
  const [promotionSubmitting, setPromotionSubmitting] = useState(false);
  const [showClassDetail, setShowClassDetail] = useState(false);
  const [studentsTableLoading, setStudentsTableLoading] = useState(false);
  const canManageStudents = can(currentUser, "students.manage");
  const canPromoteStudents = can(currentUser, "students.promote");
  const canReadFees = can(currentUser, "fees.read");
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";

  const institutionById = useMemo(
    () => new Map(institutions.map((institution) => [institution.id, institution])),
    [institutions]
  );

  const selectedStudents = useMemo(
    () => students.filter((student) => selectedStudentIds.includes(student.id)),
    [selectedStudentIds, students]
  );

  const selectedInstitutionIds = useMemo(
    () => Array.from(new Set(selectedStudents.map((student) => student.institutionId).filter(Boolean))),
    [selectedStudents]
  );

  const selectedInstitutionId = selectedInstitutionIds.length === 1 ? selectedInstitutionIds[0] : "";

  const promotionClassOptions = useMemo(
    () =>
      classes.filter((academicClass) =>
        selectedInstitutionId ? academicClass.institutionId === selectedInstitutionId : false
      ),
    [classes, selectedInstitutionId]
  );

  const selectedStudentPromotionSummary = useMemo(() => {
    const groups = new Map();

    for (const student of selectedStudents) {
      const classLabel = student.classId ? getStudentClassLabel(student) : "Unassigned";
      const academicYear = student.academicYear || "Academic year not set";
      const key = `${classLabel}::${academicYear}`;
      groups.set(key, {
        classLabel,
        academicYear,
        count: (groups.get(key)?.count || 0) + 1
      });
    }

    return Array.from(groups.values()).sort((left, right) => {
      const yearCompare = compareAcademicYears(left.academicYear, right.academicYear);
      if (yearCompare !== 0) {
        return yearCompare;
      }

      return left.classLabel.localeCompare(right.classLabel, undefined, {
        numeric: true,
        sensitivity: "base"
      });
    });
  }, [selectedStudents]);

  const selectedPromotionTargetClass = useMemo(
    () => promotionClassOptions.find((academicClass) => academicClass.id === promotionClassId) || null,
    [promotionClassId, promotionClassOptions]
  );

  const selectedPromotionTargetAcademicYear = selectedPromotionTargetClass?.academicYear || "";
  const selectedPromotionTargetMissingYear = Boolean(selectedPromotionTargetClass && !selectedPromotionTargetAcademicYear);

  useEffect(() => {
    setStudents(initialStudents);
    setSelectedStudentIds([]);
  }, [initialStudents]);

  useEffect(() => {
    setInstitutionFilter(defaultInstitutionId);
  }, [defaultInstitutionId]);

  useEffect(() => {
    if (!defaultClassId) {
      return;
    }

    setClassFilter(defaultClassId);
    setShowClassDetail(true);
  }, [defaultClassId]);

  useEffect(() => {
    setSelectedStudentIds([]);
  }, [institutionFilter]);

  useEffect(() => {
    if (selectedStudents.length === 0) {
      setPromotionAcademicYear("");
      return;
    }

    const firstStudentWithYear = selectedStudents.find((student) => student.academicYear);
    setPromotionAcademicYear(
      getNextAcademicYearLabel(firstStudentWithYear?.academicYear)
    );
  }, [selectedStudents]);

  useEffect(() => {
    if (!promotionClassId) {
      return;
    }

    if (selectedPromotionTargetAcademicYear) {
      setPromotionAcademicYear(selectedPromotionTargetAcademicYear);
    }
  }, [promotionClassId, selectedPromotionTargetAcademicYear]);

  const institutionClasses = useMemo(
    () =>
      classes
        .filter((academicClass) => (institutionFilter ? academicClass.institutionId === institutionFilter : true))
        .sort((left, right) =>
          getAcademicYearStart(right.academicYear) - getAcademicYearStart(left.academicYear) ||
          String(right.academicYear || "").localeCompare(String(left.academicYear || ""), undefined, {
            numeric: true,
            sensitivity: "base"
          }) ||
          getClassLabel(left).localeCompare(getClassLabel(right), undefined, {
            numeric: true,
            sensitivity: "base"
          })
        ),
    [classes, institutionFilter]
  );

  const academicYearGroups = useMemo(() => {
    const grouped = new Map();

    for (const academicClass of institutionClasses) {
      const yearKey = academicClass.academicYear || "Unspecified";
      const current = grouped.get(yearKey) || [];
      current.push(academicClass);
      grouped.set(yearKey, current);
    }

    return Array.from(grouped.entries())
      .sort(([left], [right]) => compareAcademicYears(left, right))
      .map(([academicYear, yearClasses]) => ({
        academicYear,
        classes: yearClasses.sort((left, right) => {
          const leftInstitution = left.institutionName || institutionById.get(left.institutionId)?.name || "";
          const rightInstitution = right.institutionName || institutionById.get(right.institutionId)?.name || "";
          return (
            leftInstitution.localeCompare(rightInstitution, undefined, {
              numeric: true,
              sensitivity: "base"
            }) ||
            getClassLabel(left).localeCompare(getClassLabel(right), undefined, {
              numeric: true,
              sensitivity: "base"
            })
          );
        })
      }));
  }, [institutionById, institutionClasses]);

  const visibleInstitutionName = useMemo(() => {
    if (!institutionFilter) {
      return "All Institutions";
    }

    return institutionById.get(institutionFilter)?.name || "Selected Institution";
  }, [institutionById, institutionFilter]);

  const unassignedStudents = useMemo(
    () =>
      students.filter(
        (student) => !student.classId && (institutionFilter ? student.institutionId === institutionFilter : true)
      ),
    [institutionFilter, students]
  );

  useEffect(() => {
    if (!classFilter) {
      return;
    }

    if (classFilter === "__unassigned__") {
      return;
    }

    const classStillVisible = institutionClasses.some((academicClass) => academicClass.id === classFilter);
    if (!classStillVisible) {
      setClassFilter("");
      setShowClassDetail(false);
      setSelectedStudentIds([]);
    }
  }, [classFilter, institutionClasses]);

  useEffect(() => {
    if (!classFilter) {
      setSelectedStudentIds([]);
    }
  }, [classFilter]);

  const selectedClassRecord = useMemo(
    () => classes.find((academicClass) => academicClass.id === classFilter) || null,
    [classFilter, classes]
  );

  const selectedClassInstitutionName = selectedClassRecord
    ? selectedClassRecord.institutionName || institutionById.get(selectedClassRecord.institutionId)?.name || "Institution"
    : "";

  const filteredStudents = useMemo(() => {
    return students.filter((item) => {
      const matchesInstitution = institutionFilter
        ? item.institutionId === institutionFilter
        : true;
      const matchesClass = classFilter
        ? classFilter === "__unassigned__"
          ? !item.classId
          : item.classId === classFilter
        : true;
      return matchesInstitution && matchesClass;
    });
  }, [classFilter, institutionFilter, students]);

  const classWiseStudents = useMemo(
    () =>
      [...filteredStudents].sort((left, right) => {
        const leftClass = left.className || "Unassigned";
        const rightClass = right.className || "Unassigned";
        const classCompare = leftClass.localeCompare(rightClass, undefined, {
          numeric: true,
          sensitivity: "base"
        });

        if (classCompare !== 0) {
          return classCompare;
        }

        const admissionCompare = String(left.admissionNumber || "").localeCompare(
          String(right.admissionNumber || ""),
          undefined,
          { numeric: true, sensitivity: "base" }
        );

        if (admissionCompare !== 0) {
          return admissionCompare;
        }

        return `${left.firstName} ${left.lastName || ""}`.localeCompare(
          `${right.firstName} ${right.lastName || ""}`,
          undefined,
          { sensitivity: "base" }
        );
      }),
    [filteredStudents]
  );

  useEffect(() => {
    if (!showClassDetail) {
      setStudentsTableLoading(false);
      return undefined;
    }

    setStudentsTableLoading(true);
    const timer = window.setTimeout(() => {
      setStudentsTableLoading(false);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [classFilter, classWiseStudents.length, showClassDetail]);

  const selectedClassStudents = useMemo(
    () =>
      students
        .filter((student) =>
          classFilter === "__unassigned__"
            ? !student.classId && (institutionFilter ? student.institutionId === institutionFilter : true)
            : classFilter
              ? student.classId === classFilter
              : false
        )
        .sort((left, right) =>
          String(left.admissionNumber || "").localeCompare(String(right.admissionNumber || ""), undefined, {
            numeric: true,
            sensitivity: "base"
          })
        ),
    [classFilter, institutionFilter, students]
  );

  const visibleStudentIds = useMemo(
    () => new Set(classWiseStudents.map((student) => student.id)),
    [classWiseStudents]
  );

  useEffect(() => {
    setSelectedStudentIds((current) => current.filter((id) => visibleStudentIds.has(id)));
  }, [visibleStudentIds]);

  const selectedClassActiveCount = useMemo(
    () => selectedClassStudents.filter((student) => (student.status || "ACTIVE") === "ACTIVE").length,
    [selectedClassStudents]
  );

  async function handleDelete(id) {
    if (!canManageStudents) {
      return;
    }

    const response = await fetch(`/api/students/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      toast.error(result.message || "Failed to delete student.");
      return;
    }

    setStudents((current) => current.filter((item) => item.id !== id));
    setSelectedStudentIds((current) => current.filter((item) => item !== id));
    toast.success("Student deleted.");
  }

  async function handleBulkDelete() {
    if (!canManageStudents) {
      return;
    }

    const deletedIds = await Promise.all(
      selectedStudentIds.map(async (id) => {
        const response = await fetch(`/api/students/${id}`, { method: "DELETE" });
        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(result.message || "Failed to delete selected students.");
        }

        return id;
      })
    );

    setStudents((current) => current.filter((item) => !deletedIds.includes(item.id)));
    setSelectedStudentIds([]);
    toast.success(`${deletedIds.length} student(s) deleted.`);
  }

  function openPromotionDialog() {
    if (selectedStudentIds.length === 0) {
      toast.error("Select at least one student to promote.");
      return;
    }

    if (selectedInstitutionIds.length !== 1) {
      toast.error("Select students from the same institution for promotion.");
      return;
    }

    const currentClassIds = Array.from(new Set(selectedStudents.map((student) => student.classId).filter(Boolean)));
    setPromotionClassId(currentClassIds.length === 1 ? currentClassIds[0] : "");
    setPromotionDialogOpen(true);
  }

  function handleSelectCurrentClassStudents() {
    if (!classFilter) {
      toast.error("Select a class first.");
      return;
    }

    setSelectedStudentIds(selectedClassStudents.map((student) => student.id));
  }

  function openCreateStudentForClass() {
    if (!institutionFilter) {
      toast.error("Select an institution first.");
      return;
    }

    setEditingStudent({
      institutionId: institutionFilter,
      classId: classFilter === "__unassigned__" ? "" : classFilter,
      academicYear: selectedClassRecord?.academicYear || ""
    });
    setDialogOpen(true);
  }

  function openClassDetail(nextClassId) {
    setClassFilter(nextClassId);
    setShowClassDetail(true);
  }

  async function handlePromoteStudents() {
    if (!canPromoteStudents) {
      return;
    }

    if (!promotionClassId) {
      toast.error("Choose the target class.");
      return;
    }

    if (!promotionAcademicYear.trim()) {
      toast.error("Enter the academic year for promoted students.");
      return;
    }

    setPromotionSubmitting(true);

    try {
      const response = await fetch("/api/students/promote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          studentIds: selectedStudentIds,
          targetClassId: promotionClassId,
          academicYear: promotionAcademicYear.trim(),
          assignClassFees: true
        })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.message || "Failed to promote students.");
      }

      const promotedStudents = result.data?.students || [];
      const promotedMap = new Map(promotedStudents.map((student) => [student.id, student]));

      setStudents((current) =>
        current.map((student) => promotedMap.get(student.id) || student)
      );
      setSelectedStudentIds([]);
      setPromotionDialogOpen(false);
      setPromotionClassId("");
      toast.success(
        `${result.data?.promotedCount || promotedStudents.length} student(s) promoted to ${result.data?.targetClass?.name || "the next class"}.`
      );
    } catch (error) {
      toast.error(error.message || "Failed to promote students.");
    } finally {
      setPromotionSubmitting(false);
    }
  }

  function handleSuccess(nextStudent) {
    setStudents((current) => {
      const exists = current.some((item) => item.id === nextStudent.id);
      if (exists) {
        return current.map((item) => (item.id === nextStudent.id ? nextStudent : item));
      }

      return [nextStudent, ...current];
    });
    setSelectedStudentIds((current) => current.filter((item) => item !== nextStudent.id));
    setEditingStudent(null);
  }

  function toggleStudentSelection(studentId) {
    setSelectedStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((item) => item !== studentId)
        : [...current, studentId]
    );
  }

  function toggleAllStudentSelection() {
    setSelectedStudentIds((current) =>
      current.length === classWiseStudents.length ? [] : classWiseStudents.map((student) => student.id)
    );
  }

  const columns = [
    {
      id: "select",
      meta: { label: "Select" },
      enableHiding: false,
      header: () => (
        <input
          aria-label="Select all students"
          checked={classWiseStudents.length > 0 && selectedStudentIds.length === classWiseStudents.length}
          onChange={toggleAllStudentSelection}
          type="checkbox"
        />
      ),
      cell: ({ row }) => (
        <input
          aria-label={`Select student ${row.original.firstName} ${row.original.lastName || ""}`}
          checked={selectedStudentIds.includes(row.original.id)}
          onChange={() => toggleStudentSelection(row.original.id)}
          type="checkbox"
        />
      )
    },
    {
      accessorKey: "admissionNumber",
      meta: { label: "Admission" },
      header: ({ column }) => (
        <button className="inline-flex items-center gap-2" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} type="button">
          Admission
          <ArrowUpDown className="h-4 w-4" />
        </button>
      )
    },
    {
      accessorKey: "firstName",
      meta: { label: "Student" },
      header: "Student",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.firstName} {row.original.lastName || ""}</p>
          <p className="text-xs text-muted-foreground">{row.original.email || row.original.phone || "No contact info"}</p>
        </div>
      )
    },
    {
      accessorKey: "institutionId",
      meta: { label: "Institution" },
      header: "Institution",
      cell: ({ row }) => institutions.find((item) => item.id === row.original.institutionId)?.name || "NA"
    },
    {
      accessorKey: "className",
      meta: { label: "Class" },
      header: "Class",
      cell: ({ row }) => row.original.className || "Unassigned"
    },
    {
      accessorKey: "section",
      meta: { label: "Section" },
      header: "Section",
      cell: ({ row }) => row.original.section || "NA"
    },
    {
      accessorKey: "category",
      meta: { label: "Category" },
      header: "Category",
      cell: ({ row }) => row.original.category || "NA"
    },
    {
      accessorKey: "dob",
      meta: { label: "DOB" },
      header: "DOB",
      cell: ({ row }) => formatDate(row.original.dob)
    },
    {
      accessorKey: "status",
      meta: { label: "Status" },
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status || "ACTIVE"} />
    },
    {
      id: "actions",
      meta: { label: "Actions" },
      header: "Actions",
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex gap-2">
          {canReadFees ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setFeesStudent(row.original);
                setFeesDialogOpen(true);
              }}
              type="button"
            >
              <IndianRupee className="h-4 w-4" />
              Fees
            </Button>
          ) : null}
          {canManageStudents ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingStudent(row.original);
                  setDialogOpen(true);
                }}
                type="button"
              >
                Edit
              </Button>
              <ConfirmDialog
                description={`Delete ${row.original.firstName} ${row.original.lastName || ""} from the student registry?`}
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
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50 p-[1px]">
          <MetricCard icon={Users} label="Total Students" value={students.length} />
        </div>
       
        <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 p-[1px]">
          <MetricCard
            icon={Building2}
            label={isSuperAdmin ? "Institutions" : "Institution"}
            value={isSuperAdmin ? institutions.length : visibleInstitutionName}
            tone="default"
          />
        </div>
      </div>

      {!showClassDetail ? (
        <div className="space-y-5">
          <Card className="border-slate-200 bg-gradient-to-r from-slate-50 via-white to-sky-50">
            <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  Student navigation
                </p>
                <h2 className="text-xl font-semibold tracking-tight">Browse classes by academic year</h2>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Open a class card to manage its roster, add students, or promote the entire batch.
                  {isSuperAdmin ? " Institution names are shown on each class card." : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="rounded-full border bg-white px-3 py-2 text-xs font-medium text-slate-600">
                  {visibleInstitutionName}
                </div>
                <div className="rounded-full border bg-white px-3 py-2 text-xs font-medium text-slate-600">
                  {institutionClasses.length} classes
                </div>
                <div className="rounded-full border bg-white px-3 py-2 text-xs font-medium text-slate-600">
                  {unassignedStudents.length} unassigned
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="w-full max-w-sm">
              <Select value={institutionFilter} onChange={(event) => setInstitutionFilter(event.target.value)}>
                <option value="">All Institutions</option>
                {institutions.map((institution) => (
                  <option key={institution.id} value={institution.id}>
                    {institution.name}
                  </option>
                ))}
              </Select>
            </div>
            {canManageStudents ? (
              <AnimatedAddButton
                className="shadow-sm"
                variant="Addbtn"
                onClick={() => {
                  setEditingStudent(null);
                  setDialogOpen(true);
                }}
              >
                Add Student
              </AnimatedAddButton>
            ) : null}
          </div>

          {academicYearGroups.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {academicYearGroups.map((group) => (
                <a
                  className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-primary hover:text-primary"
                  href={`#year-${String(group.academicYear).replace(/[^a-zA-Z0-9]+/g, "-")}`}
                  key={group.academicYear}
                >
                  {group.academicYear}
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                    {group.classes.length}
                  </span>
                </a>
              ))}
            </div>
          ) : null}

          {academicYearGroups.length > 0 ? (
            academicYearGroups.map((group) => (
              <section className="space-y-4" id={`year-${String(group.academicYear).replace(/[^a-zA-Z0-9]+/g, "-")}`} key={group.academicYear}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Academic Year
                    </p>
                    <h3 className="text-lg font-semibold tracking-tight">{group.academicYear}</h3>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-600">
                    <CalendarDays className="h-4 w-4" />
                    {group.classes.length} classes
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {group.classes.map((academicClass) => {
                    const roster = students.filter((student) => student.classId === academicClass.id);
                    const activeCount = roster.filter((student) => (student.status || "ACTIVE") === "ACTIVE").length;
                    const classInstitutionName =
                      academicClass.institutionName || institutionById.get(academicClass.institutionId)?.name || "Institution";

                    return (
                      <Card className="overflow-hidden border-slate-200 bg-white/90 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg" key={academicClass.id}>
                        <CardContent className="space-y-4 p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                {/* <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                  {academicClass.section || "Main"}
                                </span> */}
                                
                              </div>
                              <div className="space-y-1">
                                <p className="text-base font-semibold tracking-tight">{getClassLabel(academicClass)}</p>
                                {isSuperAdmin ? (
                                  <p className="text-sm text-muted-foreground">{classInstitutionName}</p>
                                ) : null}
                              </div>
                            </div>
                            <div className="rounded-xl bg-slate-50 p-2 text-slate-400 hover:text-green-600 hover:scale-110 hover:transition-transform duration-75">
                              <ChevronRight  onClick={() => openClassDetail(academicClass.id)}  className="h-5 w-5 hover:text-green-600 hover:scale-130 duration-500 hover:transition-transform " />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3 text-sm">
                            <div className="rounded-xl bg-slate-50 p-3">
                              <p className="text-xs uppercase tracking-wide text-slate-500">Active</p>
                              <p className="mt-1 text-lg font-semibold">{activeCount}</p>
                            </div>
                            <div className="rounded-xl bg-slate-50 p-3">
                              <p className="text-xs uppercase tracking-wide text-slate-500">Capacity</p>
                              <p className="mt-1 text-lg font-semibold">{academicClass.capacity || "NA"}</p>
                            </div>
                            <div className="rounded-xl bg-slate-50 p-3">
                              <p className="text-xs uppercase tracking-wide text-slate-500">Promotions</p>
                              <p className="mt-1 text-lg font-semibold">{roster.length}</p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button className="flex-1" onClick={() => openClassDetail(academicClass.id)} type="button" variant="outline">
                              Open Roster
                            </Button>
                            {canManageStudents ? (
                              <AnimatedAddButton
                                className="flex-1"
                                onClick={() => {
                                  setInstitutionFilter(academicClass.institutionId);
                                  setClassFilter(academicClass.id);
                                  setShowClassDetail(true);
                                  setEditingStudent({
                                    institutionId: academicClass.institutionId,
                                    classId: academicClass.id,
                                    academicYear: academicClass.academicYear || ""
                                  });
                                  setDialogOpen(true);
                                }}
                              >
                                Add Student
                              </AnimatedAddButton>
                            ) : null}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            ))
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <School className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-4 text-lg font-semibold">No classes found</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add classes first, then students will appear grouped by academic year.
                </p>
              </CardContent>
            </Card>
          )}

          <button
            className="w-full rounded-2xl border border-dashed border-lime-200 bg-gradient-to-br from-lime-50 via-emerald-50 to-cyan-50 p-5 text-left transition-colors hover:border-emerald-300 hover:from-lime-100 hover:via-emerald-100 hover:to-cyan-100"
            onClick={() => openClassDetail("__unassigned__")}
            type="button"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold">Unassigned Students</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Students not linked to any class yet
                </p>
              </div>
              <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-700">
                {unassignedStudents.length}
              </span>
            </div>
          </button>
        </div>
      ) : null}

      {showClassDetail ? (
        <Card>
          <CardHeader className="flex flex-col gap-4 border-b border-border/80 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <Button
                className="w-fit"
                onClick={() => {
                  setShowClassDetail(false);
                  setClassFilter("");
                }}
                type="button"
                variant="outline"
              >
                <ArrowLeft className="h-4 w-4" />
                Back To Classes
              </Button>
              <div className="space-y-1">
                <CardTitle>
                  {classFilter === "__unassigned__" ? "Unassigned Students" : getClassLabel(selectedClassRecord)}
                </CardTitle>
                <CardDescription>
                  {classFilter === "__unassigned__"
                    ? "Students waiting to be assigned to a class."
                    : `${selectedClassRecord?.academicYear || "Academic year not set"}${
                        isSuperAdmin && selectedClassInstitutionName ? ` • ${selectedClassInstitutionName}` : ""
                      }`}
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {canManageStudents ? (
                <Button disabled={!classFilter} onClick={handleSelectCurrentClassStudents} type="button" variant="outline">
                  Select Class Students
                </Button>
              ) : null}
              {canManageStudents ? (
                <AnimatedAddButton disabled={!institutionFilter} onClick={openCreateStudentForClass}>
                  Add To This Class
                </AnimatedAddButton>
              ) : null}
              {canPromoteStudents ? (
                <Button disabled={!selectedStudentIds.length} onClick={openPromotionDialog} type="button">
                  Promote Selected
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
              <p className="text-xs uppercase tracking-wide text-sky-700">Institution</p>
              <p className="mt-2 font-medium">{visibleInstitutionName}</p>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-xs uppercase tracking-wide text-rose-700">Roster size</p>
              <p className="mt-2 text-2xl font-semibold">{selectedClassStudents.length}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs uppercase tracking-wide text-emerald-700">Active students</p>
              <p className="mt-2 text-2xl font-semibold">{selectedClassActiveCount}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs uppercase tracking-wide text-amber-700">Selected for action</p>
              <p className="mt-2 text-2xl font-semibold">{selectedStudentIds.length}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {showClassDetail ? (
        <DataTable
          title={`Class : ${classFilter === "__unassigned__" ? "Unassigned Students" : getClassLabel(selectedClassRecord)}`}
          columns={columns}
          data={classWiseStudents}
          cardClassName="overflow-hidden border-rose-200 bg-gradient-to-br from-rose-50 via-amber-50 to-sky-50"
          headerClassName="border-rose-200/80 bg-white/55 backdrop-blur"
          contentClassName="bg-white/35"
          tableWrapperClassName="max-h-[560px] overflow-auto bg-white/45"
          footerClassName="border-rose-200/80 bg-white/60"
          actions={
            selectedStudentIds.length > 0 ? (
              <>
              {canPromoteStudents ? (
                <Button className="border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100" onClick={openPromotionDialog} type="button" variant="outline">
                  Promote Selected ({selectedStudentIds.length})
                </Button>
              ) : null}
              {canManageStudents ? (
                <ConfirmDialog
                  description={`Delete ${selectedStudentIds.length} selected student(s)?`}
                  onConfirm={handleBulkDelete}
                >
                  <Button type="button" variant="destructive">
                    Delete Selected ({selectedStudentIds.length})
                  </Button>
                </ConfirmDialog>
              ) : null}
            </>
          ) : null
        }
          emptyTitle={initialError ? "Unable to load students" : "No students available"}
          emptyDescription={
            initialError ||
            "Add your first student admission and the registry will appear here with sorting, search, and actions."
          }
          loading={studentsTableLoading}
          searchPlaceholder="Search by name, admission number, class, or course"
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Student Management</CardTitle>
            <CardDescription>
              Choose a class card to open its roster and manage students inside that class.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <StudentFormDialog
        open={dialogOpen}
        onOpenChange={(nextOpen) => {
          setDialogOpen(nextOpen);
          if (!nextOpen) {
            setEditingStudent(null);
          }
        }}
        initialValues={editingStudent}
        institutions={institutions}
        classes={classes}
        defaultInstitutionId={institutionFilter || defaultInstitutionId || institutions[0]?.id || ""}
        onSuccess={handleSuccess}
      />

      <StudentFeesDialog
        open={feesDialogOpen}
        onOpenChange={(nextOpen) => {
          setFeesDialogOpen(nextOpen);
          if (!nextOpen) {
            setFeesStudent(null);
          }
        }}
        student={feesStudent}
      />

      <Dialog
        open={promotionDialogOpen}
        onOpenChange={(nextOpen) => {
          setPromotionDialogOpen(nextOpen);
          if (!nextOpen) {
            setPromotionClassId("");
          }
        }}
      >
        <DialogContent className="border-rose-200 bg-gradient-to-br from-rose-50 via-amber-50 to-sky-50">
          <DialogHeader>
            <DialogTitle>Promote Students</DialogTitle>
            <DialogDescription>
              Move the selected students to their next class and update the academic year in one step.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-rose-200 bg-white/60 p-4">
              <p className="text-sm font-medium">Selected students</p>
              <p className="text-sm text-muted-foreground">
                {selectedStudentIds.length} student(s) from{" "}
                {selectedInstitutionId
                  ? institutions.find((institution) => institution.id === selectedInstitutionId)?.name || "the selected institution"
                  : "multiple institutions"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedStudentPromotionSummary.length > 0 ? (
                  selectedStudentPromotionSummary.map((entry) => (
                    <span
                      className="rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                      key={`${entry.classLabel}-${entry.academicYear}`}
                    >
                      {entry.classLabel} • {entry.academicYear}
                      <span className="ml-2 rounded-full bg-rose-50 px-2 py-0.5 text-rose-700">
                        {entry.count}
                      </span>
                    </span>
                  ))
                ) : (
                  <span className="rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                    No class assigned yet
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-sky-200 bg-white/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Promote to class</p>
                  <p className="text-sm text-muted-foreground">
                    Click a class card to move the selected students into that class.
                  </p>
                </div>
                {selectedPromotionTargetClass ? (
                  <div className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-800">
                    Selected: {getClassLabel(selectedPromotionTargetClass)}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {promotionClassOptions.map((academicClass) => {
                  const isSelected = promotionClassId === academicClass.id;
                  const hasYear = Boolean(academicClass.academicYear);

                  return (
                    <button
                      className={`rounded-xl border p-4 text-left transition-all ${
                        isSelected
                          ? "border-emerald-400 bg-emerald-50 shadow-sm"
                          : "border-slate-200 bg-white hover:border-sky-300 hover:shadow-sm"
                      }`}
                      key={academicClass.id}
                      onClick={() => setPromotionClassId(academicClass.id)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="font-semibold">{getClassLabel(academicClass)}</p>
                          <p className="text-sm text-muted-foreground">
                            {academicClass.institutionName ||
                              institutions.find((institution) => institution.id === academicClass.institutionId)?.name ||
                              "Institution"}
                          </p>
                        </div>
                        <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                          {isSelected ? "Selected" : "Click"}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                          {hasYear ? academicClass.academicYear : "Academic year missing"}
                        </span>
                        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                          Capacity {academicClass.capacity || "NA"}
                        </span>
                        {!hasYear ? (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
                            Missing year
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedPromotionTargetClass ? (
                <div className="rounded-lg border bg-white p-4">
                  <p className="text-sm font-medium">
                    Promoting to {getClassLabel(selectedPromotionTargetClass)}
                    {selectedPromotionTargetAcademicYear ? ` • ${selectedPromotionTargetAcademicYear}` : ""}
                  </p>
                  {selectedPromotionTargetMissingYear ? (
                    <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        <p className="font-medium">Academic year is not set for the target class.</p>
                        <p className="text-sm">
                          Add an academic year before promoting, or enter the year manually below.
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Choose a class card above to set the promotion destination.
                </p>
              )}
            </div>

            <div className="space-y-2 rounded-xl border border-amber-200 bg-white/60 p-4">
              <label className="text-sm font-medium" htmlFor="promotion-academic-year">
                Academic year
              </label>
              <Input
                id="promotion-academic-year"
                placeholder="2026-2027"
                value={promotionAcademicYear}
                onChange={(event) => setPromotionAcademicYear(event.target.value)}
              />
              {selectedPromotionTargetMissingYear ? (
                <p className="text-xs text-amber-700">
                  The selected class has no academic year. Set it here before promoting.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  This year is applied when students are promoted to the selected class.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button className="border-sky-200 bg-white/70 hover:bg-sky-50" onClick={() => setPromotionDialogOpen(false)} type="button" variant="outline">
              Cancel
            </Button>
            <Button className="bg-rose-400 text-white hover:bg-rose-500" disabled={promotionSubmitting} onClick={handlePromoteStudents} type="button">
              {promotionSubmitting ? "Promoting..." : "Promote Students"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
