 "use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, School2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button.js";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.js";
import { Select } from "../ui/select.js";
import { ConfirmDialog } from "./confirm-dialog.js";
import { EmptyState } from "./empty-state.js";
import { MetricCard } from "./metric-card.js";
import { Badge } from "../ui/badge.js";
import { ClassFormDialog } from "../forms/class-form-dialog.js";

export function ClassesPageClient({ classes, institutions, initialError, defaultInstitutionId = "" }) {
  const [classRows, setClassRows] = useState(classes);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [institutionFilter, setInstitutionFilter] = useState(defaultInstitutionId);

  useEffect(() => {
    setInstitutionFilter(defaultInstitutionId);
  }, [defaultInstitutionId]);

  const filteredClasses = useMemo(
    () =>
      institutionFilter
        ? classRows.filter((item) => item.institutionId === institutionFilter)
        : classRows,
    [classRows, institutionFilter]
  );

  async function handleDelete(id) {
    const response = await fetch(`/api/classes/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      toast.error(result.message || "Failed to delete class.");
      return;
    }

    setClassRows((current) => current.filter((item) => item.id !== id));
    toast.success("Class deleted.");
  }

  function handleSuccess(nextClass) {
    setClassRows((current) => {
      const exists = current.some((item) => item.id === nextClass.id);
      if (exists) {
        return current.map((item) => (item.id === nextClass.id ? nextClass : item));
      }

      return [nextClass, ...current];
    });
    setEditingClass(null);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        <MetricCard icon={School2} label="Total Classes" value={classRows.length} />
        <MetricCard label="Institutions" value={institutions.length} tone="success" />
        <MetricCard
          label="Sections"
          value={classRows.filter((item) => item.section).length}
          tone="warning"
        />
      </div>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="w-full max-w-xs">
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
          Add Class
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Class Directory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {initialError ? (
            <p className="text-sm text-red-600">{initialError}</p>
          ) : filteredClasses.length === 0 ? (
            <EmptyState
              title="No classes available"
              description="Create academic classes for institutions so students and fee structures can be organized correctly."
              action={
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add Class
                </Button>
              }
            />
          ) : (
            filteredClasses.map((item) => (
              <div className="flex flex-col gap-3 rounded-md border p-4 md:flex-row md:items-center md:justify-between" key={item.id}>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {item.name}
                    </p>
                    {item.section ? <Badge variant="secondary">{item.section}</Badge> : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.institutionName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {item.academicYear || "Academic year NA"}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right text-sm text-muted-foreground">
                    <p>Capacity</p>
                    <p className="font-medium text-foreground">{item.capacity || "NA"}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingClass(item);
                        setDialogOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <ConfirmDialog
                      description={`Delete ${item.name}${item.section ? ` - ${item.section}` : ""}?`}
                      onConfirm={() => handleDelete(item.id)}
                    >
                      <Button size="sm" variant="destructive">
                        Delete
                      </Button>
                    </ConfirmDialog>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <ClassFormDialog
        open={dialogOpen}
        onOpenChange={(nextOpen) => {
          setDialogOpen(nextOpen);
          if (!nextOpen) {
            setEditingClass(null);
          }
        }}
        initialValues={editingClass}
        institutions={institutions}
        defaultInstitutionId={institutionFilter || institutions[0]?.id || ""}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
