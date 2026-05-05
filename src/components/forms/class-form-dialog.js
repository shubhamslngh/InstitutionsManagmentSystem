"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, Plus, Users } from "lucide-react";
import { Button } from "../ui/button.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../ui/dialog.js";
import { Badge } from "../ui/badge.js";
import { Card, CardContent } from "../ui/card.js";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "../ui/form.js";
import { Input } from "../ui/input.js";
import { Select } from "../ui/select.js";

const currentAcademicYear = getCurrentAcademicYearLabel();

const classSchema = z.object({
  institutionId: z.string().min(1, "Institution is required."),
  name: z.string().min(1, "Class name is required."),
  section: z.string().optional(),
  academicYear: z.string().min(1, "Academic year is required."),
  capacity: z.union([z.literal(""), z.coerce.number().int().positive("Capacity must be positive.")])
});

const defaultValues = {
  institutionId: "",
  name: "",
  section: "",
  academicYear: currentAcademicYear,
  capacity: ""
};

const fullMonthLabels = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

function getCurrentAcademicYearLabel(centerYear = new Date().getFullYear()) {
  return `${centerYear}-${centerYear + 1}`;
}

function getDefaultClassFeeRow() {
  return {
    id: getRowId(),
    feeStructureId: "",
    name: "",
    amount: "",
    frequency: "ONE_TIME",
    dueDayOfMonth: "10",
    sessionStartMonth: "3",
    sessionEndMonth: "2",
    notes: "",
    isActive: true
  };
}

function getRowId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getAcademicYearOptions(centerYear = new Date().getFullYear()) {
  return Array.from({ length: 9 }, (_, index) => {
    const startYear = centerYear - 3 + index;
    return `${startYear}-${startYear + 1}`;
  });
}

function normalizeValues(values, fallbackInstitutionId) {
  return {
    ...defaultValues,
    ...values,
    institutionId: values?.institutionId ?? fallbackInstitutionId ?? "",
    name: values?.name ?? "",
    section: values?.section ?? "",
    academicYear: values?.academicYear ?? currentAcademicYear,
    capacity: values?.capacity ? String(values.capacity) : ""
  };
}

function getSessionPreview(academicYear, startMonth, endMonth) {
  const startYear = Number(String(academicYear || currentAcademicYear).split("-")[0]);
  const endYear = Number.isFinite(startYear) ? startYear + 1 : new Date().getFullYear() + 1;
  const safeStartMonth = Number(startMonth || 3);
  const safeEndMonth = Number(endMonth || 2);

  return `${fullMonthLabels[safeStartMonth - 1]} ${startYear} to ${fullMonthLabels[safeEndMonth - 1]} ${endYear}`;
}

function getMonthOptions() {
  return fullMonthLabels.map((label, index) => ({
    value: String(index + 1),
    label
  }));
}

async function parseJson(response) {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || "Request failed.");
  }

  return result;
}

export function ClassFormDialog({
  open,
  onOpenChange,
  initialValues,
  institutions,
  defaultInstitutionId,
  onSuccess
}) {
  const router = useRouter();
  const isEditing = Boolean(initialValues?.id);
  const form = useForm({
    resolver: zodResolver(classSchema),
    defaultValues: normalizeValues(null, defaultInstitutionId || institutions[0]?.id || "")
  });
  const academicYearOptions = getAcademicYearOptions();
  const selectedAcademicYear = form.watch("academicYear");
  const combinedAcademicYearOptions =
    selectedAcademicYear && !academicYearOptions.includes(selectedAcademicYear)
      ? [selectedAcademicYear, ...academicYearOptions]
      : academicYearOptions;
  const [wizardStep, setWizardStep] = useState("details");
  const [editTab, setEditTab] = useState("details");
  const [createdClass, setCreatedClass] = useState(null);
  const [classFeeRows, setClassFeeRows] = useState([getDefaultClassFeeRow()]);
  const [expandedFeeRowIds, setExpandedFeeRowIds] = useState([]);
  const [savingClass, setSavingClass] = useState(false);
  const [savingFeeStructures, setSavingFeeStructures] = useState(false);
  const [generateStudentInvoices, setGenerateStudentInvoices] = useState(true);
  const monthOptions = getMonthOptions();

  useEffect(() => {
    const fallbackInstitutionId = defaultInstitutionId || institutions[0]?.id || "";
    form.reset(
      initialValues
        ? normalizeValues(initialValues, fallbackInstitutionId)
        : normalizeValues(null, fallbackInstitutionId)
    );
  }, [defaultInstitutionId, form, initialValues, institutions]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (isEditing) {
      setWizardStep("details");
      setEditTab("details");
      setCreatedClass(null);
      setGenerateStudentInvoices(true);

      let cancelled = false;
      fetch(`/api/fees/structures?institutionId=${initialValues.institutionId}&classId=${initialValues.id}`)
        .then((response) =>
          response.json().catch(() => ({})).then((result) => ({ ok: response.ok, result }))
        )
        .then(({ ok, result }) => {
          if (cancelled) {
            return;
          }
          if (!ok) {
            throw new Error(result.message || "Failed to load class fee structures.");
          }

          const rows = (result.data || []).map((item) => ({
            id: item.id || getRowId(),
            feeStructureId: item.id,
            name: item.name || "",
            amount: String(Number(item.amount || 0)),
            frequency: item.frequency || "ONE_TIME",
            dueDayOfMonth: item.dueDayOfMonth ? String(item.dueDayOfMonth) : "10",
            sessionStartMonth: item.sessionStartMonth ? String(item.sessionStartMonth) : "3",
            sessionEndMonth: item.sessionEndMonth ? String(item.sessionEndMonth) : "2",
            notes: item.notes || "",
            isActive: item.isActive !== false
          }));

          const nextRows = rows.length > 0 ? rows : [getDefaultClassFeeRow()];
          setClassFeeRows(nextRows);
          setExpandedFeeRowIds(nextRows.map((row) => row.id).slice(0, 1));
        })
        .catch((error) => {
          if (!cancelled) {
            toast.error(error.message);
            const fallbackRows = [getDefaultClassFeeRow()];
            setClassFeeRows(fallbackRows);
            setExpandedFeeRowIds([fallbackRows[0].id]);
          }
        });

      return () => {
        cancelled = true;
      };
    }

    setWizardStep("details");
    setCreatedClass(null);
    const fallbackRows = [getDefaultClassFeeRow()];
    setClassFeeRows(fallbackRows);
    setExpandedFeeRowIds([fallbackRows[0].id]);
    setGenerateStudentInvoices(true);
  }, [initialValues, isEditing, open]);

  function addClassFeeRow() {
    const nextRow = getDefaultClassFeeRow();
    setClassFeeRows((current) => [...current, nextRow]);
    setExpandedFeeRowIds([nextRow.id]);
  }

  function removeClassFeeRow(index) {
    setClassFeeRows((current) => {
      const nextRows = current.filter((_, idx) => idx !== index);
      setExpandedFeeRowIds((currentExpanded) => currentExpanded.filter((id) => nextRows.some((row) => row.id === id)));
      return nextRows;
    });
  }

  function updateClassFeeRow(index, field, value) {
    setClassFeeRows((current) =>
      current.map((row, idx) => (idx === index ? { ...row, [field]: value } : row))
    );
  }

  function toggleFeeRowExpanded(rowId) {
    setExpandedFeeRowIds((current) =>
      current.includes(rowId) ? current.filter((id) => id !== rowId) : [...current, rowId]
    );
  }

  function resetCreateFlow(nextInstitutionId = defaultInstitutionId || institutions[0]?.id || "") {
    form.reset(normalizeValues(null, nextInstitutionId));
    setWizardStep("details");
    setCreatedClass(null);
    setClassFeeRows([getDefaultClassFeeRow()]);
    setGenerateStudentInvoices(true);
  }

  async function createClass(values) {
    setSavingClass(true);
    try {
      const response = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: values.institutionId,
          name: values.name,
          section: values.section || null,
          academicYear: values.academicYear,
          capacity: values.capacity === "" ? null : Number(values.capacity)
        })
      });

      const result = await parseJson(response);
      setCreatedClass(result.data);
      setWizardStep("fees");
      toast.success("Class created. Set up fee structures next.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSavingClass(false);
    }
  }

  async function saveClassFeeStructures() {
    if (!createdClass) {
      return;
    }

    const rows = classFeeRows
      .map((row) => ({
        ...row,
        name: row.name.trim(),
        amount: Number(row.amount),
        notes: row.notes.trim()
      }))
      .filter((row) => row.name && Number.isFinite(row.amount) && row.amount > 0);

    if (rows.length === 0) {
      setWizardStep("complete");
      toast.success("Class created. No fee structures were added yet.");
      onSuccess(createdClass);
      return;
    }

    setSavingFeeStructures(true);
    try {
      const requests = rows.map((row) =>
        fetch("/api/fees/structures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            institutionId: createdClass.institutionId,
            classId: createdClass.id,
            name: row.name,
            amount: row.amount,
            frequency: row.frequency,
            applicableFor: "ALL",
            dueDayOfMonth: row.frequency === "MONTHLY" ? Number(row.dueDayOfMonth || 10) : null,
            sessionStartMonth:
              row.frequency === "MONTHLY" ? Number(row.sessionStartMonth || 3) : null,
            sessionEndMonth: row.frequency === "MONTHLY" ? Number(row.sessionEndMonth || 2) : null,
            notes: row.notes || null,
            isActive: row.isActive
          })
        })
      );

      const responses = await Promise.all(requests);
      for (const response of responses) {
        await parseJson(response);
      }

      toast.success("Fee structures saved.");
      setWizardStep("complete");
      onSuccess(createdClass);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSavingFeeStructures(false);
    }
  }

  function finishAndClose() {
    onOpenChange(false);
  }

  function finishAndEnrollStudents() {
    if (createdClass?.institutionId) {
      router.push(`/students?institutionId=${createdClass.institutionId}`);
    } else {
      router.push("/students");
    }
    onOpenChange(false);
  }

  function finishAndAddAnotherClass() {
    const nextInstitutionId = createdClass?.institutionId || defaultInstitutionId || institutions[0]?.id || "";
    resetCreateFlow(nextInstitutionId);
  }

  function renderEditMode() {
    return (
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>{initialValues?.id ? "Edit Class" : "Add Class"}</DialogTitle>
          <DialogDescription>
            Update the class record and keep its fee structures aligned with the academic session.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(
              async (values) => {
                const response = await fetch(initialValues?.id ? `/api/classes/${initialValues.id}` : "/api/classes", {
                  method: initialValues?.id ? "PATCH" : "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    ...values,
                    capacity: values.capacity === "" ? null : Number(values.capacity),
                    classFeeStructures: classFeeRows
                      .map((row) => ({
                        feeStructureId: row.feeStructureId || null,
                        name: row.name.trim(),
                        amount: Number(row.amount),
                        frequency: row.frequency,
                        dueDayOfMonth: row.frequency === "MONTHLY" ? Number(row.dueDayOfMonth || 10) : null,
                        sessionStartMonth: row.frequency === "MONTHLY" ? Number(row.sessionStartMonth || 3) : null,
                        sessionEndMonth: row.frequency === "MONTHLY" ? Number(row.sessionEndMonth || 2) : null,
                        notes: row.notes.trim() || null,
                        isActive: row.isActive
                      }))
                      .filter((row) => row.name && Number.isFinite(row.amount) && row.amount > 0),
                    generateStudentInvoices
                  })
                });

                const result = await parseJson(response);
                toast.success(initialValues?.id ? "Class updated." : "Class created.");
                onSuccess(result.data);
                onOpenChange(false);
              },
              (error) => {
                const message = Object.values(error)[0]?.message;
                if (message) {
                  toast.error(message);
                }
              }
            )}
          >
            <div className="flex flex-wrap gap-2 rounded-lg border bg-muted/30 p-2">
              {[
                { id: "details", label: "Class Details" },
                { id: "fees", label: "Fee Structures" }
              ].map((tab) => (
                <Button
                  key={tab.id}
                  onClick={() => setEditTab(tab.id)}
                  type="button"
                  variant={editTab === tab.id ? "default" : "outline"}
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            {editTab === "details" ? (
            <Card>
              <CardContent className="grid gap-4 p-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="institutionId"
                  render={({ field, fieldState }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Institution</FormLabel>
                      <FormControl>
                        <Select {...field}>
                          {institutions.map((institution) => (
                            <option key={institution.id} value={institution.id}>
                              {institution.name}
                            </option>
                          ))}
                        </Select>
                      </FormControl>
                      <FormMessage>{fieldState.error?.message}</FormMessage>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Class Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Class 7" />
                      </FormControl>
                      <FormMessage>{fieldState.error?.message}</FormMessage>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="section"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Section</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="A" />
                      </FormControl>
                      <FormMessage>{fieldState.error?.message}</FormMessage>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="academicYear"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Academic Year</FormLabel>
                      <FormControl>
                        <Select {...field}>
                          <option value="">Select Academic Year</option>
                          {combinedAcademicYearOptions.map((yearOption) => (
                            <option key={yearOption} value={yearOption}>
                              {yearOption}
                            </option>
                          ))}
                        </Select>
                      </FormControl>
                      <FormMessage>{fieldState.error?.message}</FormMessage>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Capacity</FormLabel>
                      <FormControl>
                        <Input {...field} min="1" type="number" />
                      </FormControl>
                      <FormMessage>{fieldState.error?.message}</FormMessage>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            ) : null}

            {editTab === "fees" ? (
              <Card>
                <CardContent className="space-y-4 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">Class Fee Structures</p>
                      <p className="text-xs text-muted-foreground">
                        Monthly fee structures should use the academic session window, for example Mar 26 to Feb 27.
                      </p>
                    </div>
                    <Button onClick={addClassFeeRow} type="button" variant="outline">
                      Add Fee
                    </Button>
                  </div>

                  <div className="space-y-3">
                  {classFeeRows.map((row, index) => {
                    const sessionPreview = getSessionPreview(
                      form.getValues("academicYear"),
                      row.sessionStartMonth,
                      row.sessionEndMonth
                    );
                    const isExpanded = expandedFeeRowIds.includes(row.id);

                    return (
                      <div className="rounded-xl border bg-card p-4 shadow-sm" key={row.id}>
                        <button
                          className="flex w-full items-center justify-between gap-3 text-left"
                          onClick={() => toggleFeeRowExpanded(row.id)}
                          type="button"
                        >
                          <div className="min-w-0">
                            <p className="font-medium">
                              {row.name?.trim() || "Untitled fee structure"}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <Badge variant="secondary">
                                {row.frequency === "MONTHLY" ? "Monthly" : "One Time"}
                              </Badge>
                              <Badge variant="outline">
                                {row.frequency === "MONTHLY" ? sessionPreview : "One-time fee"}
                              </Badge>
                            </div>
                          </div>
                          <Badge variant={isExpanded ? "default" : "secondary"}>
                            {isExpanded ? "Editing" : "Click to edit"}
                          </Badge>
                        </button>

                        {isExpanded ? (
                          <>
                            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                              <div className="space-y-1 xl:col-span-2">
                                <p className="text-xs font-medium text-muted-foreground">Fee name</p>
                                <Input
                                  onChange={(event) => updateClassFeeRow(index, "name", event.target.value)}
                                  placeholder="Fee name"
                                  value={row.name}
                                />
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Amount</p>
                                <Input
                                  min="1"
                                  onChange={(event) => updateClassFeeRow(index, "amount", event.target.value)}
                                  placeholder="Amount"
                                  type="number"
                                  value={row.amount}
                                />
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Fee frequency</p>
                                <Select
                                  onChange={(event) => updateClassFeeRow(index, "frequency", event.target.value)}
                                  value={row.frequency}
                                >
                                  <option value="ONE_TIME">One Time</option>
                                  <option value="MONTHLY">Monthly</option>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Due day of month</p>
                                <Input
                                  disabled={row.frequency !== "MONTHLY"}
                                  max="31"
                                  min="1"
                                  onChange={(event) => updateClassFeeRow(index, "dueDayOfMonth", event.target.value)}
                                  placeholder="Due day"
                                  type="number"
                                  value={row.dueDayOfMonth}
                                />
                              </div>
                            </div>

                            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Session start month</p>
                                <Select
                                  disabled={row.frequency !== "MONTHLY"}
                                  onChange={(event) => updateClassFeeRow(index, "sessionStartMonth", event.target.value)}
                                  value={row.sessionStartMonth}
                                >
                                  {monthOptions.map((month) => (
                                    <option key={month.value} value={month.value}>
                                      {month.label}
                                    </option>
                                  ))}
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Session end month</p>
                                <Select
                                  disabled={row.frequency !== "MONTHLY"}
                                  onChange={(event) => updateClassFeeRow(index, "sessionEndMonth", event.target.value)}
                                  value={row.sessionEndMonth}
                                >
                                  {monthOptions.map((month) => (
                                    <option key={month.value} value={month.value}>
                                      {month.label}
                                    </option>
                                  ))}
                                </Select>
                              </div>
                              <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                                Monthly rows use the session window for invoice generation.
                              </div>
                            </div>
                          </>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      checked={generateStudentInvoices}
                      onChange={(event) => setGenerateStudentInvoices(event.target.checked)}
                      type="checkbox"
                    />
                    Generate/refresh student invoices from class structures on save
                  </label>
                </CardContent>
              </Card>
            ) : null}

            <DialogFooter>
              {editTab === "details" ? (
                <Button onClick={() => setEditTab("fees")} type="button" variant="outline">
                  Next: Fee Structures
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : null}
              <Button disabled={form.formState.isSubmitting} type="submit">
                {form.formState.isSubmitting ? "Saving..." : "Save Class"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    );
  }

  function renderCreateWizard() {
    return (
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>New Class Setup</DialogTitle>
          <DialogDescription>
            Follow the setup flow: create the class first, then define its fee structures, and finish by enrolling students.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-md border p-3">
            <Badge variant={wizardStep === "details" ? "default" : "secondary"}>Step 1</Badge>
            <p className="mt-2 font-medium">Class details</p>
            <p className="text-sm text-muted-foreground">Institution, class, section, capacity, and academic year.</p>
          </div>
          <div className="rounded-md border p-3">
            <Badge variant={wizardStep === "fees" ? "default" : "outline"}>Step 2</Badge>
            <p className="mt-2 font-medium">Fee structure setup</p>
            <p className="text-sm text-muted-foreground">Add the fee rows for the newly created class.</p>
          </div>
          <div className="rounded-md border p-3">
            <Badge variant={wizardStep === "complete" ? "default" : "outline"}>Step 3</Badge>
            <p className="mt-2 font-medium">Finish flow</p>
            <p className="text-sm text-muted-foreground">Close, enroll students, or add another class.</p>
          </div>
        </div>

        {wizardStep === "details" ? (
          <Form {...form}>
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={form.handleSubmit(
                (values) => createClass(values),
                (error) => {
                  const message = Object.values(error)[0]?.message;
                  if (message) {
                    toast.error(message);
                  }
                }
              )}
            >
              <FormField
                control={form.control}
                name="institutionId"
                render={({ field, fieldState }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Institution</FormLabel>
                    <FormControl>
                      <Select {...field}>
                        {institutions.map((institution) => (
                          <option key={institution.id} value={institution.id}>
                            {institution.name}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormMessage>{fieldState.error?.message}</FormMessage>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Class Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Class 7" />
                    </FormControl>
                    <FormMessage>{fieldState.error?.message}</FormMessage>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="section"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Section</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="A" />
                    </FormControl>
                    <FormMessage>{fieldState.error?.message}</FormMessage>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="capacity"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Capacity</FormLabel>
                    <FormControl>
                      <Input {...field} min="1" type="number" />
                    </FormControl>
                    <FormMessage>{fieldState.error?.message}</FormMessage>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="academicYear"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Academic Year</FormLabel>
                    <FormControl>
                      <Select {...field}>
                        <option value="">Select Academic Year</option>
                        {combinedAcademicYearOptions.map((yearOption) => (
                          <option key={yearOption} value={yearOption}>
                            {yearOption}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormMessage>{fieldState.error?.message}</FormMessage>
                  </FormItem>
                )}
              />
              <DialogFooter className="md:col-span-2">
                <Button disabled={savingClass} type="submit">
                  {savingClass ? "Creating..." : "Next"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : null}

        {wizardStep === "fees" && createdClass ? (
          <div className="space-y-4">
            <Card>
              <CardContent className="grid gap-3 p-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Created Class</p>
                  <p className="mt-1 text-lg font-semibold">
                    {createdClass.name}
                    {createdClass.section ? ` - ${createdClass.section}` : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {institutions.find((item) => item.id === createdClass.institutionId)?.name || "NA"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Academic Year</p>
                  <p className="mt-1 text-lg font-semibold">{createdClass.academicYear || currentAcademicYear}</p>
                  <p className="text-sm text-muted-foreground">Capacity {createdClass.capacity || "NA"}</p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3 rounded-md border p-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">Fee Structure Setup</p>
                  <p className="text-xs text-muted-foreground">
                    Create one or more fee structures for this class before moving to student enrollment.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Monthly fee structures will bill within the session window:{" "}
                    {getSessionPreview(createdClass.academicYear, "3", "2")}.
                  </p>
                </div>
                <Button onClick={addClassFeeRow} type="button" variant="outline">
                  <Plus className="h-4 w-4" />
                  Add Fee
                </Button>
              </div>

                {classFeeRows.map((row, index) => (
                  <div className="rounded-xl border bg-card p-4 shadow-sm" key={row.id}>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                      <div className="space-y-1 xl:col-span-2">
                        <p className="text-xs font-medium text-muted-foreground">Fee name</p>
                        <Input
                          onChange={(event) => updateClassFeeRow(index, "name", event.target.value)}
                          placeholder="Fee name"
                          value={row.name}
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Amount</p>
                        <Input
                          min="1"
                          onChange={(event) => updateClassFeeRow(index, "amount", event.target.value)}
                          placeholder="Amount"
                          type="number"
                          value={row.amount}
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Fee frequency</p>
                        <Select
                          onChange={(event) => updateClassFeeRow(index, "frequency", event.target.value)}
                          value={row.frequency}
                        >
                          <option value="ONE_TIME">One Time</option>
                          <option value="MONTHLY">Monthly</option>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Due day of month</p>
                        <Input
                          disabled={row.frequency !== "MONTHLY"}
                          max="31"
                          min="1"
                          onChange={(event) => updateClassFeeRow(index, "dueDayOfMonth", event.target.value)}
                          placeholder="Due day"
                          type="number"
                          value={row.dueDayOfMonth}
                        />
                      </div>
                      <div className="flex items-end">
                        <Button onClick={() => removeClassFeeRow(index)} type="button" variant="outline">
                          Remove
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Session start month</p>
                        <Select
                          disabled={row.frequency !== "MONTHLY"}
                          onChange={(event) => updateClassFeeRow(index, "sessionStartMonth", event.target.value)}
                          value={row.sessionStartMonth}
                        >
                          {monthOptions.map((month) => (
                            <option key={month.value} value={month.value}>
                              {month.label}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Session end month</p>
                        <Select
                          disabled={row.frequency !== "MONTHLY"}
                          onChange={(event) => updateClassFeeRow(index, "sessionEndMonth", event.target.value)}
                          value={row.sessionEndMonth}
                        >
                          {monthOptions.map((month) => (
                            <option key={month.value} value={month.value}>
                              {month.label}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                        {getSessionPreview(createdClass.academicYear, row.sessionStartMonth, row.sessionEndMonth)}
                      </div>
                    </div>
                  </div>
                ))}

              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    checked={generateStudentInvoices}
                    onChange={(event) => setGenerateStudentInvoices(event.target.checked)}
                    type="checkbox"
                  />
                  Generate/refresh student invoices from class structures on save
                </label>
                <Button disabled={savingFeeStructures} onClick={saveClassFeeStructures} type="button">
                  {savingFeeStructures ? "Saving..." : "Finish Fee Setup"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {wizardStep === "complete" && createdClass ? (
          <div className="space-y-4 rounded-md border p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-600" />
              <div>
                <p className="font-semibold">Class setup complete</p>
                <p className="text-sm text-muted-foreground">
                  You can close this dialog, enroll students into the class, or add another class.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={finishAndClose} type="button" variant="outline">
                Close
              </Button>
              <Button onClick={finishAndEnrollStudents} type="button" variant="default">
                <Users className="h-4 w-4" />
                Enroll Students
              </Button>
              <Button onClick={finishAndAddAnotherClass} type="button" variant="outline">
                Add Another Class
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          if (!isEditing) {
            resetCreateFlow();
          }
          setCreatedClass(null);
          setWizardStep("details");
        }
        onOpenChange(nextOpen);
      }}
    >
      {isEditing ? renderEditMode() : renderCreateWizard()}
    </Dialog>
  );
}
