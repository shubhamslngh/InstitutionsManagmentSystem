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
import { formatDateInput } from "../../lib/dateFormat.js";

const invoiceSchema = z.object({
  studentId: z.string().min(1, "Student is required."),
  title: z.string().min(2, "Invoice title is required."),
  grossAmount: z.coerce.number().positive("Gross amount must be greater than zero."),
  discountAmount: z.coerce.number().min(0, "Discount cannot be negative."),
  dueDate: z.string().optional(),
  notes: z.string().optional()
});

const defaultValues = {
  studentId: "",
  title: "",
  grossAmount: "",
  discountAmount: 0,
  dueDate: "",
  notes: ""
};

function normalizeInvoiceValues(values) {
  return {
    ...defaultValues,
    ...values,
    dueDate: values?.dueDate ? formatDateInput(values.dueDate) : "",
    notes: values?.notes ?? "",
    title: values?.title ?? "",
    studentId: values?.studentId ?? "",
    grossAmount: values?.grossAmount ?? "",
    discountAmount: values?.discountAmount ?? 0
  };
}

async function parseJson(response) {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || "Request failed.");
  }

  return result;
}

export function InvoiceFormDialog({ open, onOpenChange, initialValues, students, onSuccess }) {
  const form = useForm({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      ...defaultValues,
      studentId: students[0]?.id || ""
    }
  });

  useEffect(() => {
    form.reset(
      initialValues
        ? normalizeInvoiceValues(initialValues)
        : { ...defaultValues, studentId: students[0]?.id || "" }
    );
  }, [form, initialValues, students]);

  async function onSubmit(values) {
    const isEditing = Boolean(initialValues?.id);
    const response = await fetch(
      isEditing ? `/api/fees/assignments/${initialValues.id}` : "/api/fees/assignments",
      {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      }
    );

    const result = await parseJson(response);
    toast.success(isEditing ? "Invoice updated." : "Invoice created.");
    onSuccess(result.data);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialValues?.id ? "Edit Invoice" : "Create Invoice"}</DialogTitle>
          <DialogDescription>
            Maintain clean invoice values with discount, net, and due date metadata.
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
              name="studentId"
              render={({ field, fieldState }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Student</FormLabel>
                  <FormControl>
                    <Select {...field}>
                      {students.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.firstName} {student.lastName || ""} ({student.admissionNumber})
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
              name="title"
              render={({ field, fieldState }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Tuition Fee - Quarter 1" />
                  </FormControl>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="grossAmount"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Gross Amount</FormLabel>
                  <FormControl>
                    <Input {...field} min="0" type="number" />
                  </FormControl>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="discountAmount"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Discount</FormLabel>
                  <FormControl>
                    <Input {...field} min="0" type="number" />
                  </FormControl>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
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
                    <Textarea {...field} placeholder="Internal memo for accounts team" />
                  </FormControl>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
            <DialogFooter className="md:col-span-2">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Save Invoice"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
