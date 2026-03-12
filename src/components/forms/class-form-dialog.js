"use client";

import { useEffect } from "react";
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

  useEffect(() => {
    form.reset(
      initialValues
        ? normalizeValues(initialValues, defaultInstitutionId || institutions[0]?.id || "")
        : normalizeValues(null, defaultInstitutionId || institutions[0]?.id || "")
    );
  }, [defaultInstitutionId, form, initialValues, institutions]);

  async function onSubmit(values) {
    const isEditing = Boolean(initialValues?.id);
    const response = await fetch(isEditing ? `/api/classes/${initialValues.id}` : "/api/classes", {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        capacity: values.capacity === "" ? null : Number(values.capacity)
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
                    <Input {...field} placeholder="2025-2026" />
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
