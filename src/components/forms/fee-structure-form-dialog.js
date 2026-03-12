"use client";

import { useEffect, useMemo } from "react";
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
import { Textarea } from "../ui/textarea.js";

const schema = z.object({
  institutionId: z.string().min(1, "Institution is required."),
  classId: z.string().optional(),
  name: z.string().min(2, "Fee title is required."),
  amount: z.coerce.number().positive("Amount must be greater than zero."),
  frequency: z.enum(["ONE_TIME", "MONTHLY"]),
  applicableFor: z.string().min(1, "Applicable for is required."),
  dueDayOfMonth: z.union([z.literal(""), z.coerce.number().min(1).max(31)]),
  sessionStartMonth: z.union([z.literal(""), z.coerce.number().min(1).max(12)]),
  sessionEndMonth: z.union([z.literal(""), z.coerce.number().min(1).max(12)]),
  notes: z.string().optional()
});

const defaults = {
  institutionId: "",
  classId: "",
  name: "",
  amount: "",
  frequency: "MONTHLY",
  applicableFor: "ALL",
  dueDayOfMonth: "",
  sessionStartMonth: "3",
  sessionEndMonth: "2",
  notes: ""
};

function normalize(values, fallbackInstitutionId) {
  return {
    ...defaults,
    ...values,
    institutionId: values?.institutionId ?? fallbackInstitutionId ?? "",
    classId: values?.classId ?? "",
    name: values?.name ?? "",
    amount: values?.amount ?? "",
    frequency: values?.frequency ?? "MONTHLY",
    applicableFor: values?.applicableFor ?? "ALL",
    dueDayOfMonth: values?.dueDayOfMonth ? String(values.dueDayOfMonth) : "",
    sessionStartMonth: values?.sessionStartMonth ? String(values.sessionStartMonth) : "3",
    sessionEndMonth: values?.sessionEndMonth ? String(values.sessionEndMonth) : "2",
    notes: values?.notes ?? ""
  };
}

async function parseJson(response) {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || "Request failed.");
  }

  return result;
}

export function FeeStructureFormDialog({
  open,
  onOpenChange,
  initialValues,
  institutions,
  classes,
  defaultInstitutionId,
  onSuccess
}) {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: normalize(null, defaultInstitutionId || institutions[0]?.id || "")
  });

  useEffect(() => {
    form.reset(
      initialValues
        ? normalize(initialValues, defaultInstitutionId || institutions[0]?.id || "")
        : normalize(null, defaultInstitutionId || institutions[0]?.id || "")
    );
  }, [defaultInstitutionId, form, initialValues, institutions]);

  const selectedInstitutionId = form.watch("institutionId");
  const frequency = form.watch("frequency");
  const institutionClasses = useMemo(
    () => classes.filter((item) => item.institutionId === selectedInstitutionId),
    [classes, selectedInstitutionId]
  );

  useEffect(() => {
    const currentClassId = form.getValues("classId");
    if (currentClassId && !institutionClasses.some((item) => item.id === currentClassId)) {
      form.setValue("classId", "");
    }
  }, [form, institutionClasses]);

  async function onSubmit(values) {
    const isEditing = Boolean(initialValues?.id);
    const response = await fetch(
      isEditing ? `/api/fees/structures/${initialValues.id}` : "/api/fees/structures",
      {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          classId: values.classId || null,
          dueDayOfMonth: values.frequency === "MONTHLY" && values.dueDayOfMonth !== ""
            ? Number(values.dueDayOfMonth)
            : null,
          sessionStartMonth:
            values.frequency === "MONTHLY" && values.sessionStartMonth !== ""
              ? Number(values.sessionStartMonth)
              : null,
          sessionEndMonth:
            values.frequency === "MONTHLY" && values.sessionEndMonth !== ""
              ? Number(values.sessionEndMonth)
              : null
        })
      }
    );

    const result = await parseJson(response);
    toast.success(isEditing ? "Fee structure updated." : "Fee structure created.");
    onSuccess(result.data);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialValues?.id ? "Edit Fee Structure" : "Add Fee Structure"}</DialogTitle>
          <DialogDescription>
            Create institution-wide or class-specific tuition structures for billing and monthly ledger tracking.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit, (error) => {
            const message = Object.values(error)[0]?.message;
            if (message) {
              toast.error(message);
            }
          })}>
            <FormField
              control={form.control}
              name="institutionId"
              render={({ field, fieldState }) => (
                <FormItem>
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
              name="classId"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Class</FormLabel>
                  <FormControl>
                    <Select {...field}>
                      <option value="">All Classes</option>
                      {institutionClasses.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}{item.section ? ` - ${item.section}` : ""}
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
                <FormItem className="md:col-span-2">
                  <FormLabel>Fee Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Monthly Tuition Fee" />
                  </FormControl>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input {...field} min="0" type="number" />
                  </FormControl>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="frequency"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Frequency</FormLabel>
                  <FormControl>
                    <Select {...field}>
                      <option value="MONTHLY">Monthly</option>
                      <option value="ONE_TIME">One Time</option>
                    </Select>
                  </FormControl>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="applicableFor"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Applicable For</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="ALL" />
                  </FormControl>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dueDayOfMonth"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Due Day</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={frequency !== "MONTHLY"} max="31" min="1" type="number" />
                  </FormControl>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sessionStartMonth"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Session Start Month</FormLabel>
                  <FormControl>
                    <Select {...field} disabled={frequency !== "MONTHLY"}>
                      <option value="1">January</option>
                      <option value="2">February</option>
                      <option value="3">March</option>
                      <option value="4">April</option>
                      <option value="5">May</option>
                      <option value="6">June</option>
                      <option value="7">July</option>
                      <option value="8">August</option>
                      <option value="9">September</option>
                      <option value="10">October</option>
                      <option value="11">November</option>
                      <option value="12">December</option>
                    </Select>
                  </FormControl>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sessionEndMonth"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Session End Month</FormLabel>
                  <FormControl>
                    <Select {...field} disabled={frequency !== "MONTHLY"}>
                      <option value="1">January</option>
                      <option value="2">February</option>
                      <option value="3">March</option>
                      <option value="4">April</option>
                      <option value="5">May</option>
                      <option value="6">June</option>
                      <option value="7">July</option>
                      <option value="8">August</option>
                      <option value="9">September</option>
                      <option value="10">October</option>
                      <option value="11">November</option>
                      <option value="12">December</option>
                    </Select>
                  </FormControl>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field, fieldState }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Optional internal note for accounts team" />
                  </FormControl>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
            <DialogFooter className="md:col-span-2">
              <Button disabled={form.formState.isSubmitting} type="submit">
                {form.formState.isSubmitting ? "Saving..." : "Save Fee Structure"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
