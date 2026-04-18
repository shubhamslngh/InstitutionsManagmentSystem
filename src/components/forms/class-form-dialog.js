"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "../ui/button.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../ui/dialog.js";
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

const classSchema = z.object({
  institutionId: z.string().min(1, "Institution is required."),
  name: z.string().min(1, "Class name is required."),
  section: z.string().optional(),
  academicYear: z.string().optional(),
  capacity: z.union([z.literal(""), z.coerce.number().int().positive("Capacity must be positive.")])
});

const defaultValues = {
  institutionId: "",
  name: "",
  section: "",
  academicYear: "",
  capacity: ""
};

function getDefaultClassFeeRow() {
  return {
    feeStructureId: "",
    name: "",
    amount: "",
    frequency: "ONE_TIME",
    dueDayOfMonth: "10",
    notes: "",
    isActive: true
  };
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
    academicYear: values?.academicYear ?? "",
    capacity: values?.capacity ? String(values.capacity) : ""
  };
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
  const form = useForm({
    resolver: zodResolver(classSchema),
    defaultValues: normalizeValues(null, defaultInstitutionId || institutions[0]?.id || "")
  });
  const academicYearOptions = getAcademicYearOptions();
  const selectedAcademicYear = form.watch("academicYear");
  const combinedAcademicYearOptions = selectedAcademicYear &&
    !academicYearOptions.includes(selectedAcademicYear)
    ? [selectedAcademicYear, ...academicYearOptions]
    : academicYearOptions;
  const [classFeeRows, setClassFeeRows] = useState([getDefaultClassFeeRow()]);
  const [generateStudentInvoices, setGenerateStudentInvoices] = useState(true);

  useEffect(() => {
    form.reset(
      initialValues
        ? normalizeValues(initialValues, defaultInstitutionId || institutions[0]?.id || "")
        : normalizeValues(null, defaultInstitutionId || institutions[0]?.id || "")
    );
  }, [defaultInstitutionId, form, initialValues, institutions]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!initialValues?.id) {
      setClassFeeRows([getDefaultClassFeeRow()]);
      setGenerateStudentInvoices(true);
      return;
    }

    let cancelled = false;
    fetch(`/api/fees/structures?institutionId=${initialValues.institutionId}&classId=${initialValues.id}`)
      .then((response) => response.json().catch(() => ({})).then((result) => ({ ok: response.ok, result })))
      .then(({ ok, result }) => {
        if (cancelled) {
          return;
        }
        if (!ok) {
          throw new Error(result.message || "Failed to load class fee structures.");
        }
        const rows = (result.data || []).map((item) => ({
          feeStructureId: item.id,
          name: item.name || "",
          amount: String(Number(item.amount || 0)),
          frequency: item.frequency || "ONE_TIME",
          dueDayOfMonth: item.dueDayOfMonth ? String(item.dueDayOfMonth) : "10",
          notes: item.notes || "",
          isActive: item.isActive !== false
        }));
        setClassFeeRows(rows.length > 0 ? rows : [getDefaultClassFeeRow()]);
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error.message);
          setClassFeeRows([getDefaultClassFeeRow()]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [initialValues?.id, initialValues?.institutionId, open]);

  function addClassFeeRow() {
    setClassFeeRows((current) => [...current, getDefaultClassFeeRow()]);
  }

  function removeClassFeeRow(index) {
    setClassFeeRows((current) => current.filter((_, idx) => idx !== index));
  }

  function updateClassFeeRow(index, field, value) {
    setClassFeeRows((current) =>
      current.map((row, idx) => (idx === index ? { ...row, [field]: value } : row))
    );
  }

  async function onSubmit(values) {
    const isEditing = Boolean(initialValues?.id);
    const response = await fetch(isEditing ? `/api/classes/${initialValues.id}` : "/api/classes", {
      method: isEditing ? "PATCH" : "POST",
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
            notes: row.notes.trim() || null,
            isActive: row.isActive
          }))
          .filter((row) => row.name && Number.isFinite(row.amount) && row.amount > 0),
        generateStudentInvoices
      })
    });

    const result = await parseJson(response);
    toast.success(isEditing ? "Class updated." : "Class created.");
    onSuccess(result.data);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialValues?.id ? "Edit Class" : "Add Class"}</DialogTitle>
          <DialogDescription>
            Create academic classes and sections for admissions and fee assignment.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={form.handleSubmit(onSubmit, (error) => {
              const message = Object.values(error)[0]?.message;
              if (message) {
                toast.error(message);
              }
            })}
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
            <DialogFooter className="md:col-span-2">
              <div className="w-full space-y-3 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Class Fee Structures</p>
                  <Button onClick={addClassFeeRow} type="button" variant="outline">Add Fee</Button>
                </div>
                {classFeeRows.map((row, index) => (
                  <div className="grid gap-2 rounded-md border p-2 md:grid-cols-6" key={`${row.feeStructureId || "new"}-${index}`}>
                    <Input
                      className="md:col-span-2"
                      onChange={(event) => updateClassFeeRow(index, "name", event.target.value)}
                      placeholder="Fee name"
                      value={row.name}
                    />
                    <Input
                      min="1"
                      onChange={(event) => updateClassFeeRow(index, "amount", event.target.value)}
                      placeholder="Amount"
                      type="number"
                      value={row.amount}
                    />
                    <Select
                      onChange={(event) => updateClassFeeRow(index, "frequency", event.target.value)}
                      value={row.frequency}
                    >
                      <option value="ONE_TIME">ONE_TIME</option>
                      <option value="MONTHLY">MONTHLY</option>
                    </Select>
                    <Input
                      disabled={row.frequency !== "MONTHLY"}
                      max="31"
                      min="1"
                      onChange={(event) => updateClassFeeRow(index, "dueDayOfMonth", event.target.value)}
                      placeholder="Due day"
                      type="number"
                      value={row.dueDayOfMonth}
                    />
                    <Button onClick={() => removeClassFeeRow(index)} type="button" variant="outline">Remove</Button>
                  </div>
                ))}
                <label className="flex items-center gap-2 text-sm">
                  <input
                    checked={generateStudentInvoices}
                    onChange={(event) => setGenerateStudentInvoices(event.target.checked)}
                    type="checkbox"
                  />
                  Generate/refresh student invoices from class structures on save
                </label>
              </div>
              <Button disabled={form.formState.isSubmitting} type="submit">
                {form.formState.isSubmitting ? "Saving..." : "Save Class"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
