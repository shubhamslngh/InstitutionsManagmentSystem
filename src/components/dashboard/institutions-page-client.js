"use client";

import { useState } from "react";
import { Building2, Landmark, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button.js";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.js";
import { EmptyState } from "./empty-state.js";
import { MetricCard } from "./metric-card.js";
import { StatusBadge } from "./status-badge.js";
import { InstitutionFormDialog } from "../forms/institution-form-dialog.js";
import { ConfirmDialog } from "./confirm-dialog.js";

export function InstitutionsPageClient({ initialInstitutions, initialError }) {
  const [institutions, setInstitutions] = useState(initialInstitutions);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInstitution, setEditingInstitution] = useState(null);

  async function handleDelete(id) {
    const response = await fetch(`/api/institutions/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      toast.error(result.message || "Failed to delete institution.");
      return;
    }

    setInstitutions((current) => current.filter((item) => item.id !== id));
    toast.success("Institution deleted.");
  }

  function handleSuccess(nextInstitution) {
    setInstitutions((current) => {
      const exists = current.some((item) => item.id === nextInstitution.id);
      if (exists) {
        return current.map((item) => (item.id === nextInstitution.id ? nextInstitution : item));
      }

      return [nextInstitution, ...current];
    });
    setEditingInstitution(null);
  }

  const schoolCount = institutions.filter((item) => item.type === "SCHOOL").length;
  const collegeCount = institutions.filter((item) => item.type === "COLLEGE").length;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        <MetricCard icon={Building2} label="Total Institutions" value={institutions.length} />
        <MetricCard icon={Landmark} label="Schools" value={schoolCount} tone="success" />
        <MetricCard icon={Landmark} label="Colleges" value={collegeCount} tone="warning" />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Institution Directory</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage schools and colleges from a single institutional registry.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Institution
        </Button>
      </div>

      {initialError ? (
        <Card>
          <CardContent className="p-6 text-sm text-red-600">{initialError}</CardContent>
        </Card>
      ) : institutions.length === 0 ? (
        <EmptyState
          title="No institutions yet"
          description="Start by adding your first school or college to unlock admissions and fee operations."
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Institution
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {institutions.map((institution) => (
            <Card key={institution.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="space-y-2">
                  <StatusBadge status={institution.type} />
                  <CardTitle className="text-base">{institution.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-muted-foreground">Code</dt>
                    <dd className="font-medium">{institution.code || "NA"}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-muted-foreground">Email</dt>
                    <dd className="text-right font-medium">{institution.contactEmail || "NA"}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-muted-foreground">Phone</dt>
                    <dd className="font-medium">{institution.contactPhone || "NA"}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-muted-foreground">Address</dt>
                    <dd className="max-w-48 text-right font-medium">{institution.address || "NA"}</dd>
                  </div>
                </dl>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    variant="outline"
                    onClick={() => {
                      setEditingInstitution(institution);
                      setDialogOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <ConfirmDialog
                    description={`Delete ${institution.name} from the institution registry?`}
                    onConfirm={() => handleDelete(institution.id)}
                  >
                    <Button className="flex-1" variant="destructive">
                      Delete
                    </Button>
                  </ConfirmDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <InstitutionFormDialog
        open={dialogOpen}
        onOpenChange={(nextOpen) => {
          setDialogOpen(nextOpen);
          if (!nextOpen) {
            setEditingInstitution(null);
          }
        }}
        initialValues={editingInstitution}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
