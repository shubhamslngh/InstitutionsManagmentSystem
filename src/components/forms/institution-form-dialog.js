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
import { Textarea } from "../ui/textarea.js";

const institutionSchema = z.object({
  name: z.string().min(2, "Institution name is required."),
  type: z.enum(["SCHOOL", "COLLEGE"]),
  code: z.string().optional(),
  address: z.string().optional(),
  contactEmail: z.string().email("Enter a valid email address.").or(z.literal("")),
  contactPhone: z.string().optional()
});

const defaultValues = {
  name: "",
  type: "SCHOOL",
  code: "",
  address: "",
  contactEmail: "",
  contactPhone: ""
};

function normalizeInstitutionValues(values) {
  return {
    ...defaultValues,
    ...values,
    code: values?.code ?? "",
    address: values?.address ?? "",
    contactEmail: values?.contactEmail ?? "",
    contactPhone: values?.contactPhone ?? ""
  };
}

async function parseJson(response) {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || "Request failed.");
  }

  return result;
}

export function InstitutionFormDialog({
  open,
  onOpenChange,
  initialValues,
  onSuccess
}) {
  const form = useForm({
    resolver: zodResolver(institutionSchema),
    defaultValues
  });

  useEffect(() => {
    form.reset(initialValues ? normalizeInstitutionValues(initialValues) : defaultValues);
  }, [form, initialValues]);

  async function onSubmit(values) {
    const isEditing = Boolean(initialValues?.id);
    const response = await fetch(
      isEditing ? `/api/institutions/${initialValues.id}` : "/api/institutions",
      {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      }
    );

    const result = await parseJson(response);
    toast.success(isEditing ? "Institution updated." : "Institution created.");
    onSuccess(result.data);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialValues?.id ? "Edit Institution" : "Add Institution"}</DialogTitle>
          <DialogDescription>
            Register a school or college with clean administrative metadata.
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
              name="name"
              render={({ field, fieldState }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Maurya Public School" />
                  </FormControl>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <FormControl>
                    <Select {...field}>
                      <option value="SCHOOL">School</option>
                      <option value="COLLEGE">College</option>
                    </Select>
                  </FormControl>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="code"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="MPS-01" />
                  </FormControl>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactEmail"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="admin@maurya.edu" type="email" />
                  </FormControl>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactPhone"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="+91 98765 43210" />
                  </FormControl>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field, fieldState }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Sector 14, Noida" />
                  </FormControl>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
            <DialogFooter className="md:col-span-2">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Save Institution"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
