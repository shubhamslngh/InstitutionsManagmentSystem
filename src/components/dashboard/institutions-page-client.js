"use client";

import { useState } from "react";
import { Building2, Hash, Landmark, Mail, MapPin, Pencil, Phone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button.js";
import { AnimatedAddButton } from "../ui/animated-add-button.js";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.js";
import { EmptyState } from "./empty-state.js";
import { MetricCard } from "./metric-card.js";
import { StatusBadge } from "./status-badge.js";
import { InstitutionFormDialog } from "../forms/institution-form-dialog.js";
import { ConfirmDialog } from "./confirm-dialog.js";
import { can } from "../../lib/permissions.js";
import { cn } from "../../lib/utils.js";

export function InstitutionsPageClient({ initialInstitutions, initialError, currentUser }) {
  const [institutions, setInstitutions] = useState(initialInstitutions);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInstitution, setEditingInstitution] = useState(null);
  const [hoveredCardAction, setHoveredCardAction] = useState({});
  const canManageInstitutions = can(currentUser, "institutions.manage");

  async function handleDelete(id) {
    if (!canManageInstitutions) {
      return;
    }

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
          <p className="text-sm text-muted-foreground ">
            Create and manage schools and colleges.
          </p>
        </div>
        {canManageInstitutions ? (
          <AnimatedAddButton onClick={() => setDialogOpen(true)}>
            Add Institution
          </AnimatedAddButton>
        ) : null}
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
            canManageInstitutions ? (
              <AnimatedAddButton onClick={() => setDialogOpen(true)}>
                Add Institution
              </AnimatedAddButton>
            ) : null
          }
        />
      ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {institutions.map((institution) => {
                const actionTone = hoveredCardAction[institution.id];

                return (
                  <Card
                    key={institution.id}
                    className={cn(
                      "group relative overflow-hidden rounded-3xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
                      "after:absolute after:inset-x-0 after:bottom-0 after:h-1.5 after:bg-slate-200",
                      actionTone === "edit" &&
                      "border-sky-200 bg-linear-to-br from-sky-50 via-cyan-50 to-white shadow-slate-400 after:bg-blue-600",
                      actionTone === "delete" &&
                      "border-red-200 bg-linear-to-br from-red-50 via-rose-50 to-white shadow-red-400 after:bg-red-300"
                    )}
                  >
                    <CardHeader className="items-center group-hover:border-x-4 border-x-2  border-blue-600 bg-slate-50/70 px-6 py-6 text-center">
                      <div className="mb-2 flex justify-center">
                        <StatusBadge status={institution.type} />
                      </div>

                      <CardTitle className="text-center text-xl font-bold tracking-tight text-slate-950">
                        {institution.name}
                      </CardTitle>

                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                        Institution Profile
                      </p>
                    </CardHeader> 

                    <CardContent className="space-y-3 p-4">
                      <dl className="grid gap-1.5 text-sm sm:grid-cols-2">
                        {[
                          {
                            className: "sm:col-span-1",
                            icon: Hash,
                            label: "Code",
                            value: institution.code || "NA",
                          },
                          {
                            className: "sm:col-span-1",
                            icon: Phone,
                            label: "Phone",
                            value: institution.contactPhone || "NA",
                          },
                          {
                            className: "sm:col-span-2",
                            icon: Mail,
                            label: "Email",
                            value: institution.contactEmail || "NA",
                          },
                          {
                            className: "sm:col-span-2",
                            icon: MapPin,
                            label: "Address",
                            value: institution.address || "NA",
                          },
                        ].map(({ className, icon: Icon, label, value }) => (
                          <div
                            className={cn(
                              "grid grid-cols-[1.5rem_3.5rem_1fr] items-start gap-1.5 rounded-lg border border-slate-100 bg-slate-50/70 px-2.5 py-1.5",
                              className
                            )}
                            key={label}
                          >
                            <dt className="contents">
                              <span className="flex size-6 items-center justify-center rounded-md bg-white text-blue-500 shadow-xs">
                                <Icon className="size-3.5" />
                              </span>
                           
                            </dt>
                            <dd className="min-w-0 pt-1 items-center text-xs font-semibold text-slate-900">
                              {value}
                            </dd>
                          </div>
                        ))}
                      </dl>

                      {canManageInstitutions ? (
                        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                          <Button
                            className="gap-2 rounded-xl border-sky-200 bg-white text-sky-700 hover:bg-sky-50"
                            variant="outline"
                            onMouseEnter={() =>
                              setHoveredCardAction((current) => ({
                                ...current,
                                [institution.id]: "edit",
                              }))
                            }
                            onMouseLeave={() =>
                              setHoveredCardAction((current) => ({
                                ...current,
                                [institution.id]: "",
                              }))
                            }
                            onClick={() => {
                              setEditingInstitution(institution);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="size-4" />
                            Edit
                          </Button>

                          <ConfirmDialog
                            description={`Delete ${institution.name} from the institution registry?`}
                            onConfirm={() => handleDelete(institution.id)}
                          >
                            <Button
                              className="gap-2 rounded-xl bg-red-600 text-white hover:bg-red-700"
                              onMouseEnter={() =>
                                setHoveredCardAction((current) => ({
                                  ...current,
                                  [institution.id]: "delete",
                                }))
                              }
                              onMouseLeave={() =>
                                setHoveredCardAction((current) => ({
                                  ...current,
                                  [institution.id]: "",
                                }))
                              }
                              variant="destructive"
                            >
                              <Trash2 className="size-4" />
                              Delete
                            </Button>
                          </ConfirmDialog>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
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
