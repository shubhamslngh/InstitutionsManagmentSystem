"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, School2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button.js";
import { AnimatedAddButton } from "../ui/animated-add-button.js";
import { Badge } from "../ui/badge.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card.js";
import { Select } from "../ui/select.js";
import { ConfirmDialog } from "./confirm-dialog.js";
import { EmptyState } from "./empty-state.js";
import { MetricCard } from "./metric-card.js";
import { ClassFormDialog } from "../forms/class-form-dialog.js";
import { can } from "../../lib/permissions.js";
import { cn } from "../../lib/utils.js";

function getAcademicYearStart(academicYear) {
  const match = String(academicYear || "").match(/^(\d{4})/);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

function getClassLabel(item) {
  return item.section ? `${item.name} - ${item.section}` : item.name;
}

function buildStudentLink(institutionId, classId) {
  const params = new URLSearchParams();

  if (institutionId) {
    params.set("institutionId", institutionId);
  }

  if (classId) {
    params.set("classId", classId);
  }

  const query = params.toString();
  return query ? `/students?${query}` : "/students";
}

export function ClassesPageClient({
  classes,
  institutions,
  initialError,
  defaultInstitutionId = "",
  currentUser
}) {
  const router = useRouter();
  const [classRows, setClassRows] = useState(classes);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [institutionFilter, setInstitutionFilter] = useState(defaultInstitutionId);
  const [hoveredCardAction, setHoveredCardAction] = useState({});
  const canManageClasses = can(currentUser, "classes.manage");
  const canManageStudents = can(currentUser, "students.manage");

  useEffect(() => {
    setClassRows(classes);
  }, [classes]);

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

  const groupedClasses = useMemo(() => {
    const buckets = new Map();

    filteredClasses
      .slice()
      .sort((left, right) => {
        const yearCompare = getAcademicYearStart(right.academicYear) - getAcademicYearStart(left.academicYear);
        if (yearCompare !== 0) {
          return yearCompare;
        }

        return getClassLabel(left).localeCompare(getClassLabel(right), undefined, {
          numeric: true,
          sensitivity: "base"
        });
      })
      .forEach((item) => {
        const yearKey = item.academicYear || "Academic Year Not Set";
        if (!buckets.has(yearKey)) {
          buckets.set(yearKey, []);
        }
        buckets.get(yearKey).push(item);
      });

    return Array.from(buckets.entries());
  }, [filteredClasses]);

  async function handleDelete(id) {
    if (!canManageClasses) {
      return;
    }

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

  function enrollStudentsForClass(academicClass) {
    if (!canManageStudents) {
      return;
    }

    router.push(buildStudentLink(academicClass.institutionId, academicClass.id));
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        <MetricCard icon={School2} label="Total Classes" value={classRows.length} />
        {/* <MetricCard label="Institutions" value={institutions.length} tone="success" /> */}
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
        {canManageClasses ? (
          <AnimatedAddButton onClick={() => setDialogOpen(true)}>
            Add Class
          </AnimatedAddButton>
        ) : null}
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
                canManageClasses ? (
                  <AnimatedAddButton onClick={() => setDialogOpen(true)}>
                    Add Class
                  </AnimatedAddButton>
                ) : null
              }
            />
          ) : (
            <div className="space-y-6">
              {groupedClasses.map(([academicYear, academicClasses]) => (
                <section className="space-y-3" key={academicYear}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">Academic Year - {academicYear}</h3>
                      <p className="text-sm text-muted-foreground">
                        {academicClasses.length} class{academicClasses.length === 1 ? "" : "es"} in this academic year.
                      </p>
                    </div>
                    <Badge variant="outline">{academicClasses.length} classes</Badge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {academicClasses.map((item) => {
                      const actionTone = hoveredCardAction[item.id];

                      return (
                        <Card
                          className={cn(
                            "bg-linear-to-br from-white  to-blue-50 border-slate-200/80 shadow-zinc-300 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                            actionTone === "enroll" && "border-green-500 bg-linear-to-br shadow-emerald-600 from-emerald-50 to-white",
                            actionTone === "edit" && "border-sky-200 bg-linear-to-br shadow-zinc-600 from-sky-50 via-cyan-50 to-white",
                            actionTone === "delete" && "border-red-200 bg-linear-to-br shadow-red-600 from-red-50 via-rose-50 to-white"
                          )}
                          key={item.id}
                        >
                          <CardHeader className="space-y-1">
                            <div className="flex items-start place-items-end-safe gap-3">
                              <div className="space-y-1">
                                <CardTitle className="text-base">
                                  {item.name}
                                  {item.section ? <span className="ml-2 align-middle text-sm font-medium text-muted-foreground">- {item.section}</span> : null}
                                </CardTitle>
                              </div>
                              <p className="text-sm font-light text-foreground">Seats:</p>
                              <Badge variant="success">{item.capacity || "NA"} </Badge>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge className="font-bold" variant="warning">{item.academicYear || "Academic year NA"}</Badge>
                              
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid gap-0 text-sm">
                              <div className="rounded-md bg-mauve-50 p-1">
                                {/* <p className="text-xs uppercase tracking-wide text-muted-foreground">Institution</p> */}
                                <p className=" text-medium font-medium text-foreground">{item.institutionName}</p>
                              </div>
                              
                            </div>

                            <div className="flex flex-wrap transition-all duration-200 ease-in-out  gap-2">
                              {canManageStudents ? (
                                <AnimatedAddButton
                                  className="flex-1 p-1"
                                  lottieClassName="p-1 h-6 w-0 overflow-hidden transition-all duration-200 ease-out group-hover:w-10 group-hover:opacity-100 group-focus-visible:w-8 group-focus-visible:opacity-100"
                                  lottieName="enroll"
                                  onMouseEnter={() => setHoveredCardAction((current) => ({ ...current, [item.id]: "enroll" }))}
                                  onMouseLeave={() => setHoveredCardAction((current) => ({ ...current, [item.id]: "" }))}
                                  onClick={() => enrollStudentsForClass(item)}
                                  type="button"
                                  variant="AddBtn"
                                >
                                  Enroll Students
                                  <ArrowRight className="h-4 w-4" />
                                </AnimatedAddButton>
                              ) : null}
                              {canManageClasses ? (
                                <Button
                                  className="flex-1"
                                  onMouseEnter={() => setHoveredCardAction((current) => ({ ...current, [item.id]: "edit" }))}
                                  onMouseLeave={() => setHoveredCardAction((current) => ({ ...current, [item.id]: "" }))}
                                  onClick={() => {
                                    setEditingClass(item);
                                    setDialogOpen(true);
                                  }}
                                  type="button"
                                  variant="outline"
                                >
                                  Edit
                                </Button>
                              ) : null}
                              {canManageClasses ? (
                                <ConfirmDialog
                                  description={`Delete ${item.name}${item.section ? ` - ${item.section}` : ""}?`}
                                  onConfirm={() => handleDelete(item.id)}
                                >
                                  <Button
                                    onMouseEnter={() => setHoveredCardAction((current) => ({ ...current, [item.id]: "delete" }))}
                                    onMouseLeave={() => setHoveredCardAction((current) => ({ ...current, [item.id]: "" }))}
                                    type="button"
                                    variant="destructive"
                                  >
                                    Delete
                                  </Button>
                                </ConfirmDialog>
                              ) : null}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
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
