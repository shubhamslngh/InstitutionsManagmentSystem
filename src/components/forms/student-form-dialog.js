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
import { formatDateInput } from "../../lib/dateFormat.js";

const studentCategoryOptions = [
  "GENERAL",
  "OBC",
  "SC",
  "ST",
  "EWS",
  "MINORITY"
];

const optionalTrimmedString = z.string().transform((value) => value.trim());
const optionalNameField = optionalTrimmedString.refine(
  (value) => value === "" || /^[A-Za-z][A-Za-z\s.'-]{1,}$/.test(value),
  "Enter a valid name."
);
const optionalAadhaarField = optionalTrimmedString.refine(
  (value) => value === "" || /^\d{12}$/.test(value),
  "Aadhaar number must be exactly 12 digits."
);
const optionalPhoneField = optionalTrimmedString.refine(
  (value) => value === "" || /^\d{10}$/.test(value),
  "Phone number must be exactly 10 digits."
);
const optionalDateField = optionalTrimmedString.refine((value) => {
  if (value === "") {
    return true;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parsed <= today;
}, "Date of birth cannot be in the future.");

const studentSchema = z.object({
  institutionId: z.string().min(1, "Institution is required."),
  admissionNumber: z.string().trim().min(1, "Admission number is required."),
  category: z.string().refine((value) => value === "" || studentCategoryOptions.includes(value), "Select a valid category."),
  firstName: optionalNameField.refine((value) => value.length >= 2, "Student name is required."),
  lastName: optionalNameField,
  motherName: optionalNameField,
  fatherName: optionalNameField,
  aadhaarNumber: optionalAadhaarField,
  email: z.string().trim().email("Enter a valid email address.").or(z.literal("")),
  phone: optionalPhoneField,
  address: optionalTrimmedString,
  dob: optionalDateField,
  course: optionalTrimmedString,
  classId: z.string().optional()
});

const defaultValues = {
  institutionId: "",
  admissionNumber: "",
  category: "",
  firstName: "",
  lastName: "",
  motherName: "",
  fatherName: "",
  aadhaarNumber: "",
  email: "",
  phone: "",
  address: "",
  dob: "",
  course: "",
  classId: ""
};

function normalizeStudentValues(values) {
  return {
    ...defaultValues,
    ...values,
    category: values?.category ?? "",
    lastName: values?.lastName ?? "",
    motherName: values?.motherName ?? "",
    fatherName: values?.fatherName ?? "",
    aadhaarNumber: values?.aadhaarNumber ?? "",
    email: values?.email ?? "",
    phone: values?.phone ?? "",
    address: values?.address ?? "",
    dob: values?.dob ? formatDateInput(values.dob) : "",
    course: values?.course ?? "",
    classId: values?.classId ?? ""
  };
}

async function parseJson(response) {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || "Request failed.");
  }

  return result;
}

export function StudentFormDialog({
  open,
  onOpenChange,
  initialValues,
  institutions,
  classes,
  defaultInstitutionId,
  onSuccess
}) {
  const form = useForm({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      ...defaultValues,
      institutionId: defaultInstitutionId || institutions[0]?.id || ""
    }
  });

  useEffect(() => {
    form.reset(
      initialValues
        ? normalizeStudentValues(initialValues)
        : {
            ...defaultValues,
            institutionId: defaultInstitutionId || institutions[0]?.id || ""
          }
    );
  }, [defaultInstitutionId, form, initialValues, institutions]);

  const selectedInstitutionId = form.watch("institutionId");
  const institutionClasses = useMemo(
    () => classes.filter((item) => item.institutionId === selectedInstitutionId),
    [classes, selectedInstitutionId]
  );

  useEffect(() => {
    const currentClassId = form.getValues("classId");
    const hasSelectedClass = institutionClasses.some((item) => item.id === currentClassId);

    if (!hasSelectedClass && currentClassId) {
      form.setValue("classId", "");
    }
  }, [form, institutionClasses]);

  async function onSubmit(values) {
    const isEditing = Boolean(initialValues?.id);
    const response = await fetch(isEditing ? `/api/students/${initialValues.id}` : "/api/students", {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });

    const result = await parseJson(response);
    toast.success(isEditing ? "Student updated." : "Student added.");
    onSuccess(result.data);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{initialValues?.id ? "Edit Student" : "Add Student"}</DialogTitle>
          <DialogDescription>
            Capture admissions, contact details, and class mapping in one clean flow.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit, (error) => {
            const message = Object.values(error)[0]?.message;
            if (message) {
              toast.error(message);
            }
          })}>
            {[
              ["institutionId", "Institution"],
              ["admissionNumber", "Admission Number"],
              ["category", "Category"],
              ["firstName", "First Name"],
              ["lastName", "Last Name"],
              ["motherName", "Mother Name"],
              ["fatherName", "Father Name"],
              ["aadhaarNumber", "Aadhaar Number"],
              ["email", "Email"],
              ["phone", "Phone"],
              ["dob", "Date of Birth"],
              ["course", "Course"]
            ].map(([name, label]) => (
              <FormField
                control={form.control}
                key={name}
                name={name}
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                      {name === "institutionId" ? (
                        <Select {...field}>
                          {institutions.map((institution) => (
                            <option key={institution.id} value={institution.id}>
                              {institution.name}
                            </option>
                          ))}
                        </Select>
                      ) : name === "category" ? (
                        <Select {...field}>
                          <option value="">Select Category</option>
                          {studentCategoryOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </Select>
                      ) : name === "dob" ? (
                        <Input {...field} type="date" />
                      ) : (
                        <Input {...field} type={name === "email" ? "email" : "text"} />
                      )}
                    </FormControl>
                    <FormMessage>{fieldState.error?.message}</FormMessage>
                  </FormItem>
                )}
              />
            ))}
            <FormField
              control={form.control}
              name="classId"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Class</FormLabel>
                  <FormControl>
                    <Select {...field}>
                      <option value="">Unassigned</option>
                      {institutionClasses.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}{item.section ? ` - ${item.section}` : ""}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                  {institutionClasses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No classes found for the selected institution.
                    </p>
                  ) : null}
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
                    <Textarea {...field} placeholder="Student residential address" />
                  </FormControl>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
            <DialogFooter className="md:col-span-2">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Save Student"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
