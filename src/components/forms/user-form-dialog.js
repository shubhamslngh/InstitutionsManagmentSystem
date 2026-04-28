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

const userSchema = z.object({
  name: z.string().trim().min(2, "Name is required."),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string(),
  role: z.enum(["SUPER_ADMIN", "INSTITUTION_ADMIN", "ACCOUNTANT", "DATA_ENTRY", "VIEWER"]),
  institutionId: z.string(),
  isActive: z.string()
});

const defaultValues = {
  name: "",
  email: "",
  password: "",
  role: "INSTITUTION_ADMIN",
  institutionId: "",
  isActive: "true"
};

function normalizeValues(values) {
  return {
    ...defaultValues,
    ...values,
    password: "",
    institutionId: values?.institutionId ?? "",
    isActive: values?.isActive === false ? "false" : "true"
  };
}

async function parseJson(response) {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || "Request failed.");
  }

  return result;
}

export function UserFormDialog({
  open,
  onOpenChange,
  initialValues,
  institutions,
  onSuccess
}) {
  const isEditing = Boolean(initialValues?.id);
  const form = useForm({
    resolver: zodResolver(userSchema),
    defaultValues
  });

  const selectedRole = form.watch("role");

  useEffect(() => {
    form.reset(initialValues ? normalizeValues(initialValues) : defaultValues);
  }, [form, initialValues]);

  useEffect(() => {
    if (selectedRole === "SUPER_ADMIN") {
      form.setValue("institutionId", "");
    }
  }, [form, selectedRole]);

  async function onSubmit(values) {
    if (!isEditing && values.password.trim().length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    if (isEditing && values.password && values.password.trim().length > 0 && values.password.trim().length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    if (values.role !== "SUPER_ADMIN" && !values.institutionId) {
      toast.error("Institution is required for this role.");
      return;
    }

    const payload = {
      name: values.name.trim(),
      email: values.email.trim(),
      role: values.role,
      institutionId: values.role === "SUPER_ADMIN" ? null : values.institutionId,
      isActive: values.isActive === "true"
    };

    if (values.password.trim()) {
      payload.password = values.password.trim();
    }

    const response = await fetch(isEditing ? `/api/users/${initialValues.id}` : "/api/users", {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await parseJson(response);
    toast.success(isEditing ? "User updated." : "User created.");
    onSuccess(result.data);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-sky-200 bg-gradient-to-br from-sky-50 via-amber-50 to-rose-50">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit User" : "Add User"}</DialogTitle>
          <DialogDescription>
            Assign role, institution scope, and account status for this dashboard user.
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
              name="name"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Aditi Sharma" />
                  </FormControl>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="aditi@school.com" type="email" />
                  </FormControl>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <Select {...field}>
                      <option value="SUPER_ADMIN">Super Admin</option>
                      <option value="INSTITUTION_ADMIN">Institution Admin</option>
                      <option value="ACCOUNTANT">Accountant</option>
                      <option value="DATA_ENTRY">Data Entry</option>
                      <option value="VIEWER">Viewer</option>
                    </Select>
                  </FormControl>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="institutionId"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Institution</FormLabel>
                  <FormControl>
                    <Select {...field} disabled={selectedRole === "SUPER_ADMIN"}>
                      <option value="">Select institution</option>
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
              name="password"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>{isEditing ? "New Password" : "Password"}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={isEditing ? "Leave blank to keep unchanged" : "Minimum 8 characters"} type="password" />
                  </FormControl>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <Select {...field}>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </Select>
                  </FormControl>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
            <DialogFooter className="md:col-span-2">
              <Button disabled={form.formState.isSubmitting} type="submit">
                {form.formState.isSubmitting ? "Saving..." : isEditing ? "Save User" : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
