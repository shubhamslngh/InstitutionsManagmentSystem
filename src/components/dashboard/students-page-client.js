"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button.js";
import { MetricCard } from "./metric-card.js";
import { Select } from "../ui/select.js";
import { StatusBadge } from "./status-badge.js";
import { DataTable } from "../tables/data-table.js";
import { StudentFormDialog } from "../forms/student-form-dialog.js";
import { ConfirmDialog } from "./confirm-dialog.js";
import { formatDate } from "../../lib/dateFormat.js";

export function StudentsPageClient({
  initialStudents,
  institutions,
  classes,
  initialError,
  defaultInstitutionId = ""
}) {
  const [students, setStudents] = useState(initialStudents);
  const [institutionFilter, setInstitutionFilter] = useState(defaultInstitutionId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  useEffect(() => {
    setInstitutionFilter(defaultInstitutionId);
  }, [defaultInstitutionId]);

  const filteredStudents = useMemo(() => {
    return institutionFilter
      ? students.filter((item) => item.institutionId === institutionFilter)
      : students;
  }, [institutionFilter, students]);

  async function handleDelete(id) {
    const response = await fetch(`/api/students/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      toast.error(result.message || "Failed to delete student.");
      return;
    }

    setStudents((current) => current.filter((item) => item.id !== id));
    toast.success("Student deleted.");
  }

  function handleSuccess(nextStudent) {
    setStudents((current) => {
      const exists = current.some((item) => item.id === nextStudent.id);
      if (exists) {
        return current.map((item) => (item.id === nextStudent.id ? nextStudent : item));
      }

      return [nextStudent, ...current];
    });
    setEditingStudent(null);
  }

  const columns = [
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
              setEditingStudent(row.original);
              setDialogOpen(true);
            }}
          >
            Edit
          </Button>
          <ConfirmDialog
            description={`Delete ${row.original.firstName} ${row.original.lastName || ""} from the student registry?`}
            onConfirm={() => handleDelete(row.original.id)}
          >
            <Button size="sm" variant="destructive">
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
        <div className="flex w-full max-w-xs items-center gap-3">
          <Select value={institutionFilter} onChange={(event) => setInstitutionFilter(event.target.value)}>
            <option value="">All Institutions</option>
            {institutions.map((institution) => (
              <option key={institution.id} value={institution.id}>
                {institution.name}
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
        data={filteredStudents}
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
    </div>
  );
}
