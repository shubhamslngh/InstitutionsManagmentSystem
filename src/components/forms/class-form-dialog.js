"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, IndianRupee, Info, PlusCircle, Trash2, Users } from "lucide-react";
import { Button } from "../ui/button.js";
import { AnimatedAddButton } from "../ui/animated-add-button.js";
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
import { cn } from "../../lib/utils.js";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip.js";
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

function getPositiveIntegerInput(value) {
  return value.replace(/\D/g, "").replace(/^0+/, "");
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
  const [classSetupSaved, setClassSetupSaved] = useState(false);
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
      setClassSetupSaved(false);
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
          setExpandedFeeRowIds([]);
        })
        .catch((error) => {
          if (!cancelled) {
            toast.error(error.message);
            const fallbackRows = [getDefaultClassFeeRow()];
            setClassFeeRows(fallbackRows);
            setExpandedFeeRowIds([]);
          }
        });

      return () => {
        cancelled = true;
      };
    }

    setWizardStep("details");
    setCreatedClass(null);
    setClassSetupSaved(false);
    const fallbackRows = [getDefaultClassFeeRow()];
    setClassFeeRows(fallbackRows);
    setExpandedFeeRowIds([]);
    setGenerateStudentInvoices(true);
  }, [initialValues, isEditing, open]);

  function addClassFeeRow() {
    const nextRow = getDefaultClassFeeRow();
    setClassFeeRows((current) => [...current, nextRow]);
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
    setClassSetupSaved(false);
    setClassFeeRows([getDefaultClassFeeRow()]);
    setExpandedFeeRowIds([]);
    setGenerateStudentInvoices(true);
  }

  function saveClassDraft(values) {
    setCreatedClass({
      institutionId: values.institutionId,
      name: values.name,
      section: values.section || null,
      academicYear: values.academicYear,
      capacity: values.capacity === "" ? null : Number(values.capacity)
    });
    setWizardStep("fees");
  }

  function getDraftFeeStructures({ validate = false } = {}) {
    const rows = classFeeRows
      .map((row) => ({
        ...row,
        name: row.name.trim(),
        amount: Number(row.amount),
        notes: row.notes.trim()
      }));
    const incompleteRow = rows.find(
      (row) =>
        (row.name || row.amount > 0) &&
        (!row.name || !Number.isFinite(row.amount) || row.amount <= 0)
    );

    if (incompleteRow && validate) {
      toast.error("Complete each fee name and amount before continuing.");
      return null;
    }

    return rows.filter((row) => row.name && Number.isFinite(row.amount) && row.amount > 0);
  }

  function reviewClassSetup() {
    if (!createdClass) {
      return;
    }

    if (!getDraftFeeStructures({ validate: true })) {
      return;
    }

    setExpandedFeeRowIds([]);
    setWizardStep("complete");
  }

  function navigateCreateStep(stepId) {
    if (classSetupSaved) {
      return;
    }

    if (stepId === "details") {
      setWizardStep("details");
      return;
    }

    if (stepId === "fees" && createdClass) {
      setWizardStep("fees");
    }
  }

  async function createReviewedClassSetup() {
    if (!createdClass || classSetupSaved) {
      return;
    }

    const rows = getDraftFeeStructures({ validate: true });
    if (!rows) {
      setWizardStep("fees");
      return;
    }

    setSavingClass(true);
    try {
      const response = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createdClass,
          classFeeStructures: rows,
          generateStudentInvoices
        })
      });
      const result = await parseJson(response);

      setCreatedClass(result.data);
      setClassSetupSaved(true);
      toast.success("Class and fee structures created.");
      onSuccess(result.data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSavingClass(false);
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
      <DialogContent className="max-w-6xl max-h-[calc(100vh-1rem)] grid-rows-[auto_auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-[24px] p-0">
        <div className="border-b border-slate-100 bg-linear-to-br from-sky-50 via-white to-slate-50 px-4 py-3.5 sm:px-6 sm:py-5">
          <DialogHeader>
            <DialogTitle className="pr-7 text-lg text-slate-950 sm:text-xl">
              {initialValues?.id
                ? `Edit ${initialValues.name || "Class"}${initialValues.section ? ` - ${initialValues.section}` : ""}`
                : "Add Class"}
            </DialogTitle>
            {initialValues?.id ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50" variant="secondary">
                  AY {initialValues.academicYear || currentAcademicYear}
                </Badge>
                <DialogDescription className="text-xs sm:text-sm">
                  Update details or fee structures, then save once.
                </DialogDescription>
              </div>
            ) : (
              <DialogDescription className="text-xs sm:text-sm">
                Add class details and fee structures, then save once.
              </DialogDescription>
            )}
          </DialogHeader>
        </div>
        <Form {...form}>
          <form
            className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-slate-50"
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
            <div className="border-b border-slate-100 bg-white px-3 py-2.5 sm:px-6 sm:py-3">
              <div className="flex justify-center overflow-x-auto">
            <div className="flex w-full rounded-xl bg-slate-100 p-1 sm:inline-flex sm:w-auto sm:min-w-max">
              {[
                { id: "details", label: "Class Details" },
                { id: "fees", label: "Fee Structures" }
              ].map((tab) => (
                <button
                  className={cn(
                    "flex-1 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 transition sm:flex-none sm:px-4 sm:text-sm",
                    editTab === tab.id && "bg-white text-sky-700 shadow-sm"
                  )}
                  key={tab.id}
                  onClick={() => setEditTab(tab.id)}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>
              </div>
            </div>

            <div className="min-h-0 overflow-y-auto p-3 sm:p-6">

            {editTab === "details" ? (
            <Card className="border-0 bg-white shadow-sm">
              <CardContent className="grid grid-cols-[minmax(0,1.45fr)_minmax(0,0.8fr)_minmax(0,0.9fr)] gap-2.5 p-3 sm:p-4 md:grid-cols-2 md:gap-4">
                <FormField
                  control={form.control}
                  name="institutionId"
                  render={({ field, fieldState }) => (
                    <FormItem className="col-span-3 md:col-span-2">
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
                    <FormItem className="min-w-0">
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
                    <FormItem className="min-w-0">
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
                    <FormItem className="min-w-0">
                      <FormLabel>Capacity</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          inputMode="numeric"
                          onChange={(event) => field.onChange(getPositiveIntegerInput(event.target.value))}
                          pattern="[1-9][0-9]*"
                          type="text"
                        />
                      </FormControl>
                      <FormMessage>{fieldState.error?.message}</FormMessage>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="academicYear"
                  render={({ field, fieldState }) => (
                    <FormItem className="col-span-3 md:col-span-1">
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
              </CardContent>
            </Card>
            ) : null}

            {editTab === "fees" ? (
              <Card className="overflow-hidden rounded-2xl border-0 bg-white shadow-sm">
                <CardContent className="space-y-3 p-3 sm:space-y-4 sm:p-4">
                  <div className="flex items-start justify-between gap-2 sm:gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">Class Fee Structures</p>
                      <p className="hidden text-xs text-muted-foreground sm:block">
                        Monthly fee structures should use the academic session window, for example Mar 26 to Feb 27.
                      </p>
                    </div>
                    <AnimatedAddButton
                      className="h-9 shrink-0 px-2.5 text-xs sm:h-10 sm:px-4 sm:text-sm"
                      lottieClassName="h-5 w-5 shrink-0 overflow-hidden rounded-full border border-green-900 bg-black sm:h-7 sm:w-7"
                      onClick={addClassFeeRow}
                      type="button"
                    >
                      Add Fee
                    </AnimatedAddButton>
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
                      <div className="rounded-2xl bg-slate-50 p-3 sm:p-4" key={row.id}>
                        <div className="flex items-start gap-2">
                          <button
                            className="flex min-w-0 flex-1 items-start justify-between gap-2 text-left sm:items-center sm:gap-3"
                            onClick={() => toggleFeeRowExpanded(row.id)}
                            type="button"
                          >
                            <div className="min-w-0">
                              <p className="font-medium">
                                {row.name?.trim() || "Untitled fee structure"}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5 sm:gap-2">
                                <Badge className="px-2 text-[10px] sm:text-xs" variant="secondary">
                                  {row.frequency === "MONTHLY" ? "Monthly" : "One Time"}
                                </Badge>
                                <Badge className="max-w-full truncate px-2 text-[10px] sm:text-xs" variant="outline">
                                  {row.amount ? `INR ${row.amount}` : "Amount not set"}
                                </Badge>
                                <Badge className="max-w-full truncate px-2 text-[10px] sm:text-xs" variant="outline">
                                  {row.sessionEndMonth && row.sessionStartMonth ? sessionPreview : "Session not set"}
                                </Badge>
                              </div>
                            </div>
                            <Badge className="shrink-0 px-2 text-[10px] sm:text-xs" variant={isExpanded ? "default" : "secondary"}>
                              {isExpanded ? "Editing" : "Edit"}
                            </Badge>
                          </button>
                          <Button
                            aria-label={`Remove fee structure ${index + 1}`}
                            className="h-8 w-8 shrink-0 rounded-full border-red-100 bg-red-50 p-0 text-red-600 hover:bg-red-100"
                            onClick={() => removeClassFeeRow(index)}
                            type="button"
                            variant="outline"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {isExpanded ? (
                          <>
                            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:mt-4 sm:gap-3 md:grid-cols-2 xl:grid-cols-6">
                              <div className="col-span-2 space-y-1 xl:col-span-2">
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
                              <div className="col-span-2 space-y-1 sm:col-span-1">
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

                            <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:mt-3 sm:gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
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
                              <div className="col-span-2 rounded-md bg-muted px-3 py-2 text-[11px] text-muted-foreground md:col-span-1 md:text-xs">
                                Monthly rows use the session window for invoice generation.
                              </div>
                            </div>
                          </>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                  <label className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs sm:items-center sm:text-sm">
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
            </div>

            <DialogFooter className="border-t border-slate-100 bg-white px-3 py-3 sm:px-6">
              {editTab === "details" ? (
                <Button className="w-full sm:w-auto" onClick={() => setEditTab("fees")} type="button" variant="outline">
                  Next: Fee Structures
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : null}
              <Button className="w-full sm:w-auto" variant="AddBtn" disabled={form.formState.isSubmitting} type="submit">
                {form.formState.isSubmitting ? "Saving..." : "Save Class"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    );
  }

  function renderCreateWizard() {
    const draftedFees = getDraftFeeStructures() || [];
    const wizardSteps = [
      {
        id: "details",
        icon: Building2,
        label: "Class",
        desktopLabel: "Class Details",
        accent: "blue",
        hint: createdClass ? `${createdClass.name}${createdClass.section ? ` - ${createdClass.section}` : ""}` : "Institution, class, section, year."
      },
      {
        id: "fees",
        icon: IndianRupee,
        label: "Fees",
        desktopLabel: "Fee Setup",
        accent: "green",
        hint: wizardStep === "details" ? "Monthly or one-time fees." : `${draftedFees.length} structure${draftedFees.length === 1 ? "" : "s"} added`
      },
      {
        id: "complete",
        icon: CheckCircle2,
        label: "Finish",
        desktopLabel: "Review & Finish",
        accent: "violet",
        hint: classSetupSaved ? "Created successfully." : "Review and create."
      }
    ];
    const activeStepIndex = wizardSteps.findIndex((step) => step.id === wizardStep);

    return (
      <DialogContent className="max-w-5xl max-h-[calc(100vh-1rem)] grid-rows-[auto_auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-[24px] p-0">
        <div className="border-b border-slate-100 bg-linear-to-br from-sky-50 via-white to-slate-50 px-4 py-3.5 sm:px-6 sm:py-5">
          <DialogHeader>
            <DialogTitle className="pr-7 text-lg text-slate-950 sm:text-xl">New Class Setup</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Create the class, define fee structures, then continue to student enrollment.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="w-full border-b border-slate-100 bg-white px-4 py-3 sm:px-6">
          <div className="mx-auto flex w-full max-w-[280px] items-start md:hidden">
            {wizardSteps.map((step, index) => {
              const isActive = wizardStep === step.id;
              const isComplete = index < activeStepIndex;
              const canOpen = !classSetupSaved && (step.id === "details" ? Boolean(createdClass) : step.id === "fees" && wizardStep === "complete");
              const Icon = step.icon;
              const activeTone = {
                blue: "border-blue-600 bg-blue-600 text-white shadow-blue-200",
                green: "border-emerald-600 bg-emerald-600 text-white shadow-emerald-200",
                violet: "border-violet-600 bg-violet-600 text-white shadow-violet-200"
              }[step.accent];
              const idleTone = {
                blue: "border-blue-100 bg-blue-50 text-blue-600",
                green: "border-emerald-100 bg-emerald-50 text-emerald-600",
                violet: "border-violet-100 bg-violet-50 text-violet-600"
              }[step.accent];

              return (
                <div
                  className={cn("flex items-start", index < wizardSteps.length - 1 ? "flex-1" : "shrink-0")}
                  key={step.id}
                >
                  <button
                    className={cn("flex w-14 shrink-0 flex-col items-center", canOpen && "cursor-pointer")}
                    disabled={!canOpen}
                    onClick={() => navigateCreateStep(step.id)}
                    type="button"
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full border transition",
                        idleTone,
                        isActive && `shadow-sm ${activeTone}`,
                        isComplete && "border-emerald-500 bg-emerald-500 text-white"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <p
                      className={cn(
                        "mt-1.5 text-[11px] font-medium text-slate-400",
                        (isActive || isComplete) && "text-slate-800"
                      )}
                    >
                      {step.label}
                    </p>
                    {index < activeStepIndex ? (
                      <p className="mt-0.5 max-w-20 truncate text-[9px] text-slate-500">
                        {step.hint}
                      </p>
                    ) : null}
                  </button>
                  {index < wizardSteps.length - 1 ? (
                    <span
                      className={cn(
                        "mx-2 mt-4 h-px flex-1 bg-slate-200",
                        isComplete && "bg-emerald-400"
                      )}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="hidden gap-3 md:grid md:grid-cols-3">
            {wizardSteps.map((step, index) => {
              const isActive = wizardStep === step.id;
              const isComplete = index < activeStepIndex;
              const canOpen = !classSetupSaved && (step.id === "details" ? Boolean(createdClass) : step.id === "fees" && wizardStep === "complete");
              const Icon = step.icon;
              const tone = {
                blue: {
                  active: "bg-blue-50 ring-blue-200",
                  icon: "bg-blue-100 text-blue-700",
                  complete: "bg-blue-50/70"
                },
                green: {
                  active: "bg-emerald-50 ring-emerald-200",
                  icon: "bg-emerald-100 text-emerald-700",
                  complete: "bg-emerald-50/70"
                },
                violet: {
                  active: "bg-violet-50 ring-violet-200",
                  icon: "bg-violet-100 text-violet-700",
                  complete: "bg-violet-50/70"
                }
              }[step.accent];

              return (
                <button
                  className={cn(
                    "rounded-xl bg-slate-50 p-3 text-left transition",
                    isActive && `ring-1 ${tone.active}`,
                    isComplete && tone.complete,
                    canOpen && "cursor-pointer hover:-translate-y-0.5 hover:shadow-sm"
                  )}
                  disabled={!canOpen}
                  key={step.id}
                  onClick={() => navigateCreateStep(step.id)}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant={isActive ? "default" : isComplete ? "success" : "secondary"}>Step {index + 1}</Badge>
                    <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", tone.icon)}>
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-950">{step.desktopLabel}</p>
                  <p className="text-xs text-muted-foreground">{step.hint}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto bg-slate-50 p-3 sm:p-6">

        {wizardStep === "details" ? (
          <Form {...form}>
            <form
              className="grid grid-cols-[minmax(0,1.45fr)_minmax(0,0.8fr)_minmax(0,0.9fr)] gap-2.5 rounded-2xl bg-white p-3 shadow-sm sm:p-4 md:grid-cols-2 md:gap-4"
              onSubmit={form.handleSubmit(
                (values) => saveClassDraft(values),
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
                  <FormItem className="col-span-3 md:col-span-2">
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
                  <FormItem className="min-w-0">
                    <FormLabel>Class Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Class X" />
                    </FormControl>
                    <FormMessage>{fieldState.error?.message}</FormMessage>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="section"
                render={({ field, fieldState }) => (
                  <FormItem className="min-w-0">
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
                  <FormItem className="min-w-0">
                    <FormLabel>Capacity</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        inputMode="numeric"
                        onChange={(event) => field.onChange(getPositiveIntegerInput(event.target.value))}
                        pattern="[1-9][0-9]*"
                        type="text"
                      />
                    </FormControl>
                    <FormMessage>{fieldState.error?.message}</FormMessage>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="academicYear"
                render={({ field, fieldState }) => (
                  <FormItem className="col-span-3 md:col-span-1">
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
              <DialogFooter className="col-span-3 mt-1 md:col-span-2">
                <Button className="w-full sm:w-auto" type="submit">
                  Next: Fee Setup
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : null}

        {wizardStep === "fees" && createdClass ? (
          <div className="space-y-3 sm:space-y-4">
            <Button
              className="h-9 px-3 text-xs text-slate-600 sm:text-sm"
              onClick={() => navigateCreateStep("details")}
              type="button"
              variant="outline"
            >
              Back to Class Details
            </Button>
            <Card className="border-0 bg-white shadow-sm">
              <CardContent className="flex md:grid justify-between gap-3 p-3 sm:p-4 md:grid-cols-2">
                <div>
                  <p className="text-xs  uppercase tracking-wide text-muted-foreground">Class Details</p>
                  <p className="mt-1 text-sm md:text-lg font-semibold">
                    {createdClass.name}
                    {createdClass.section ? ` - ${createdClass.section}` : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {institutions.find((item) => item.id === createdClass.institutionId)?.name || "NA"}
                  </p>
                </div>
                <div className="text-end">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Academic Year</p>
                    <p className="mt-1 text-sm md:text-lg font-semibold">{createdClass.academicYear || currentAcademicYear}</p>
                  <p className="text-sm text-muted-foreground">Capacity {createdClass.capacity || "NA"}</p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3 rounded-2xl bg-white p-3 shadow-sm sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        Fee Structure Setup
                      </p>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700"
                            >
                              <Info className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>

                          <TooltipContent className="max-w-xs rounded-2xl">
                            <div className="space-y-2">
                              <p className="font-semibold text-slate-900">
                                Fee Structure Information
                              </p>

                              <p className="text-xs leading-5 text-slate-600">
                                Create one or more fee structures before student enrollment.
                                Monthly fee structures automatically generate invoices
                                within the academic session timeline.
                              </p>

                              <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
                                Session Preview:
                                <span className="mt-1 block font-semibold text-slate-900">
                                  {getSessionPreview(createdClass.academicYear, "3", "2")}
                                </span>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                  </div>
                <AnimatedAddButton
                  className="h-9 self-start px-2.5 text-xs sm:h-10 sm:px-3 sm:text-sm"
                  lottieClassName="h-5 w-5 shrink-0 overflow-hidden rounded-full border border-green-900 bg-black sm:h-7 sm:w-7"
                  onClick={addClassFeeRow}
                  type="button"
                >
                  Add Fee
                </AnimatedAddButton>
              </div>

                {classFeeRows.map((row, index) => {
                  const isExpanded = expandedFeeRowIds.includes(row.id);
                  const sessionPreview = getSessionPreview(
                    createdClass.academicYear,
                    row.sessionStartMonth,
                    row.sessionEndMonth
                  );

                  return (
                  <div className="rounded-2xl bg-slate-50 p-3 sm:p-4" key={row.id}>
                    <div className="flex items-start gap-2">
                      <button
                        className="min-w-0 flex-1 text-left"
                        onClick={() => toggleFeeRowExpanded(row.id)}
                        type="button"
                      >
                        <p className="truncate text-sm font-medium text-slate-900">
                          {row.name?.trim() || `Fee Structure ${index + 1}`}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <Badge className="px-2 text-[10px]" variant="secondary">
                            {row.frequency === "MONTHLY" ? "Monthly" : "One Time"}
                          </Badge>
                          <Badge className="px-2 text-[10px]" variant="outline">
                            {row.amount ? `INR ${row.amount}` : "Enter amount"}
                          </Badge>
                        </div>
                      </button>
                      <Button
                        aria-label={`Remove fee structure ${index + 1}`}
                        className="h-8 w-8 shrink-0 rounded-full border-red-100 bg-red-50 p-0 text-red-600 hover:bg-red-100"
                        onClick={() => removeClassFeeRow(index)}
                        type="button"
                        variant="outline"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {isExpanded ? (
                    <>
                    <div className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-2 xl:grid-cols-6">
                      <div className="col-span-2 space-y-1 xl:col-span-2">
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
                      <div className="col-span-2 space-y-1 sm:col-span-1">
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
                    <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:mt-3 sm:gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
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
                      <div className="col-span-2 rounded-md bg-muted px-3 py-2 text-[11px] text-muted-foreground md:col-span-1 md:text-xs">
                        {sessionPreview}
                      </div>
                    </div>
                    </>
                    ) : null}
                  </div>
                  );
                })}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs sm:items-center sm:text-sm">
                  <input
                    checked={generateStudentInvoices}
                    onChange={(event) => setGenerateStudentInvoices(event.target.checked)}
                    type="checkbox"
                  />
                  Generate/refresh student invoices from class structures on save
                </label>
                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                  <Button className="w-full sm:w-auto" onClick={() => navigateCreateStep("details")} type="button" variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Class
                  </Button>
                  <Button className="w-full sm:w-auto" onClick={reviewClassSetup} type="button">
                    Review Setup
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {wizardStep === "complete" && createdClass ? (
          <div className="space-y-4 rounded-2xl bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className={cn("mt-1 h-5 w-5", classSetupSaved ? "text-emerald-600" : "text-blue-600")} />
              <div>
                <p className="font-semibold">{classSetupSaved ? "Class setup complete" : "Review class setup"}</p>
                <p className="text-sm text-muted-foreground">
                  {classSetupSaved
                    ? "You can close this dialog, enroll students into the class, or add another class."
                    : "Confirm the class and fee structures below before creating records."}
                </p>
              </div>
            </div>
            <div className="grid gap-3 rounded-2xl bg-slate-50 p-3 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Class</p>
                <p className="mt-1 font-semibold">{createdClass.name}{createdClass.section ? ` - ${createdClass.section}` : ""}</p>
                <p className="text-xs text-slate-500">{createdClass.academicYear} | Capacity {createdClass.capacity || "NA"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Fee Structures</p>
                <p className="mt-1 font-semibold">{draftedFees.length} structure{draftedFees.length === 1 ? "" : "s"}</p>
                <p className="text-xs text-slate-500">{generateStudentInvoices ? "Generate student invoices" : "Do not generate invoices"}</p>
              </div>
            </div>
            {draftedFees.length > 0 ? (
              <div className="space-y-2">
                {draftedFees.map((row) => (
                  <div className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm" key={row.id}>
                    <span className="truncate font-medium">{row.name}</span>
                    <span className="shrink-0 text-slate-600">INR {row.amount} / {row.frequency === "MONTHLY" ? "month" : "once"}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {classSetupSaved ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button className="w-full sm:w-auto" onClick={finishAndClose} type="button" variant="outline">
                  Close
                </Button>
                <AnimatedAddButton
                  className="w-full sm:w-auto"
                  lottieClassName=" h-6 w-0 overflow-hidden transition-all duration-200 ease-out group-hover:w-10 group-hover:opacity-100 group-focus-visible:w-8 group-focus-visible:opacity-100"
                  lottieName="enroll"
                  onClick={finishAndEnrollStudents}
                  type="button"
                  variant="AddBtn"
                >
                  Enroll Students
                </AnimatedAddButton>
                <AnimatedAddButton className="w-full sm:w-auto" onClick={finishAndAddAnotherClass} type="button">
                  Add Another Class
                </AnimatedAddButton>
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button className="w-full sm:w-auto" onClick={() => setWizardStep("fees")} type="button" variant="outline">
                  Back to Fees
                </Button>
                <Button className="w-full sm:w-auto" disabled={savingClass} onClick={createReviewedClassSetup} type="button">
                  {savingClass ? "Creating..." : "Create Class & Fees"}
                </Button>
              </div>
            )}
          </div>
        ) : null}
        </div>
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
