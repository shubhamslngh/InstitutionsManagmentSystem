"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, IndianRupee, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button.js";
import { MetricCard } from "./metric-card.js";
import { Select } from "../ui/select.js";
import { StatusBadge } from "./status-badge.js";
import { DataTable } from "../tables/data-table.js";
import { StudentFormDialog } from "../forms/student-form-dialog.js";
import { ConfirmDialog } from "./confirm-dialog.js";
import { formatDate } from "../../lib/dateFormat.js";
import { StudentFeesDialog } from "./student-fees-dialog.js";

export function StudentsPageClient({
  initialStudents,
  institutions,
  classes,
  initialError,
  defaultInstitutionId = ""
}) {
  const [students, setStudents] = useState(initialStudents);
  const [institutionFilter, setInstitutionFilter] = useState(defaultInstitutionId);
  const [classFilter, setClassFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [feesDialogOpen, setFeesDialogOpen] = useState(false);
  const [feesStudent, setFeesStudent] = useState(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  useEffect(() => {
    setInstitutionFilter(defaultInstitutionId);
  }, [defaultInstitutionId]);

  useEffect(() => {
    setClassFilter("");
  }, [institutionFilter]);

  function getClassFilterLabel(student) {
    if (!student.className) {
      return "Unassigned";
    }

    return student.section ? `${student.className} - ${student.section}` : student.className;
  }

  const filteredStudents = useMemo(() => {
    return students.filter((item) => {
      const matchesInstitution = institutionFilter
        ? item.institutionId === institutionFilter
        : true;
      const normalizedClass = getClassFilterLabel(item);
      const matchesClass = classFilter ? normalizedClass === classFilter : true;
      return matchesInstitution && matchesClass;
    });
  }, [classFilter, institutionFilter, students]);

  const classOptions = useMemo(() => {
    const visibleClasses = students
      .filter((item) => (institutionFilter ? item.institutionId === institutionFilter : true))
      .map((item) => getClassFilterLabel(item));

    return Array.from(new Set(visibleClasses)).sort((left, right) =>
      left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" })
    );
  }, [institutionFilter, students]);

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

  async function handleDelete(id) {
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
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        <MetricCard icon={Users} label="Total Students" value={students.length} />
        <MetricCard
          icon={Users}
          label="Filtered Students"
          value={filteredStudents.length}
          tone="success"
        />
        <MetricCard
          icon={Users}
          label="Active Institutions"
          value={institutions.length}
          tone="warning"
        />
      </div>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex w-full flex-col gap-3 md:max-w-2xl md:flex-row">
          <Select value={institutionFilter} onChange={(event) => setInstitutionFilter(event.target.value)}>
            <option value="">All Institutions</option>
            {institutions.map((institution) => (
              <option key={institution.id} value={institution.id}>
                {institution.name}
              </option>
            ))}
          </Select>
          <Select value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
            <option value="">All Classes</option>
            {classOptions.map((className) => (
              <option key={className} value={className}>
                {className}
              </option>
            ))}
          </Select>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Student
        </Button>
      </div>

      <DataTable
        title="Student Registry"
        columns={columns}
        data={classWiseStudents}
        actions={
          selectedStudentIds.length > 0 ? (
            <ConfirmDialog
              description={`Delete ${selectedStudentIds.length} selected student(s)?`}
              onConfirm={handleBulkDelete}
            >
              <Button type="button" variant="destructive">
                Delete Selected ({selectedStudentIds.length})
              </Button>
            </ConfirmDialog>
          ) : null
        }
        emptyTitle={initialError ? "Unable to load students" : "No students available"}
        emptyDescription={
          initialError ||
          "Add your first student admission and the registry will appear here with sorting, search, and actions."
        }
        searchPlaceholder="Search by name, admission number, class, or course"
      />

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
    </div>
  );
}
