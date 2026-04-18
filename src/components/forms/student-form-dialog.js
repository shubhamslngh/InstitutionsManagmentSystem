"use client";

import { useEffect, useMemo, useState } from "react";
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
const studentGenderOptions = ["MALE", "FEMALE", "OTHER"];
const feeHeadOptions = [
  "Admission Fee",
  "Term Charges",
  "Tuition Fee",
  "Development Fee",
  "Exam Fee",
  "Lab Fee",
  "Late Fee",
  "Transport Fee"
];
const monthOptions = [
  { value: "1", label: "Jan" },
  { value: "2", label: "Feb" },
  { value: "3", label: "Mar" },
  { value: "4", label: "Apr" },
  { value: "5", label: "May" },
  { value: "6", label: "Jun" },
  { value: "7", label: "Jul" },
  { value: "8", label: "Aug" },
  { value: "9", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" }
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
  gender: z.string().refine((value) => value === "" || studentGenderOptions.includes(value), "Select a valid gender."),
  academicYear: optionalTrimmedString,
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
  gender: "",
  academicYear: "",
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
    gender: values?.gender ?? "",
    academicYear: values?.academicYear ?? "",
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

function getAcademicYearStart(academicYear) {
  const match = String(academicYear || "").trim().match(/^(\d{4})/);
  return match ? Number(match[1]) : new Date().getFullYear();
}

function getDefaultFeeItem(academicYear) {
  const now = new Date();
  return {
    feeInvoiceId: "",
    feeStructureId: "",
    name: "",
    amount: "",
    frequency: "ONE_TIME",
    dueDate: "",
    monthNumber: String(now.getMonth() + 1),
    ledgerYear: String(getAcademicYearStart(academicYear)),
    notes: ""
  };
}

function buildFeeItemFromStructure(structure, academicYear) {
  return {
    feeInvoiceId: "",
    feeStructureId: structure.id || "",
    name: structure.name || "",
    amount: String(Number(structure.amount || 0)),
    frequency: structure.frequency === "MONTHLY" ? "MONTHLY" : "ONE_TIME",
    dueDate: "",
    monthNumber: String(new Date().getMonth() + 1),
    ledgerYear: String(getAcademicYearStart(academicYear)),
    notes: structure.notes || ""
  };
}

function buildFeeItemFromInvoice(invoice) {
  return {
    feeInvoiceId: invoice.id || "",
    feeStructureId: invoice.feeStructureId || "",
    name: invoice.title || "",
    amount: String(Number(invoice.netAmount || invoice.grossAmount || 0)),
    frequency: invoice.monthNumber ? "MONTHLY" : "ONE_TIME",
    dueDate: invoice.dueDate ? formatDateInput(invoice.dueDate) : "",
    monthNumber: invoice.monthNumber ? String(invoice.monthNumber) : String(new Date().getMonth() + 1),
    ledgerYear: invoice.ledgerYear ? String(invoice.ledgerYear) : String(new Date().getFullYear()),
    notes: invoice.notes || ""
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
  const isEditing = Boolean(initialValues?.id);
  const form = useForm({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      ...defaultValues,
      institutionId: defaultInstitutionId || institutions[0]?.id || ""
    }
  });
  const [feeItems, setFeeItems] = useState([getDefaultFeeItem("")]);
  const [classFeeStructures, setClassFeeStructures] = useState([]);
  const [loadingClassFees, setLoadingClassFees] = useState(false);
  const [lastAppliedClassId, setLastAppliedClassId] = useState("");

  useEffect(() => {
    form.reset(
      initialValues
        ? normalizeStudentValues(initialValues)
        : {
            ...defaultValues,
            institutionId: defaultInstitutionId || institutions[0]?.id || ""
          }
    );
    setFeeItems([getDefaultFeeItem(initialValues?.academicYear || "")]);
    setClassFeeStructures([]);
    setLastAppliedClassId("");
  }, [defaultInstitutionId, form, initialValues, institutions]);

  const selectedInstitutionId = form.watch("institutionId");
  const selectedAcademicYear = form.watch("academicYear");
  const selectedClassId = form.watch("classId");
  const institutionClasses = useMemo(
    () =>
      classes.filter(
        (item) =>
          item.institutionId === selectedInstitutionId &&
          (!selectedAcademicYear || item.academicYear === selectedAcademicYear)
      ),
    [classes, selectedAcademicYear, selectedInstitutionId]
  );
  const institutionAcademicYears = useMemo(() => {
    const years = classes
      .filter((item) => item.institutionId === selectedInstitutionId)
      .map((item) => item.academicYear)
      .filter(Boolean);

    return Array.from(new Set(years)).sort((left, right) => right.localeCompare(left));
  }, [classes, selectedInstitutionId]);

  useEffect(() => {
    const currentClassId = form.getValues("classId");
    const hasSelectedClass = institutionClasses.some((item) => item.id === currentClassId);

    if (!hasSelectedClass && currentClassId) {
      form.setValue("classId", "");
    }
  }, [form, institutionClasses]);

  useEffect(() => {
    const currentAcademicYear = form.getValues("academicYear");
    if (!currentAcademicYear) {
      return;
    }

    const isValidAcademicYear = institutionAcademicYears.includes(currentAcademicYear);
    if (!isValidAcademicYear) {
      form.setValue("academicYear", "");
      form.setValue("classId", "");
    }
  }, [form, institutionAcademicYears]);

  const watchedAcademicYear = selectedAcademicYear;
  useEffect(() => {
    if (isEditing) {
      return;
    }

    setFeeItems((current) =>
      current.map((item) =>
        item.frequency === "MONTHLY"
          ? { ...item, ledgerYear: item.ledgerYear || String(getAcademicYearStart(watchedAcademicYear)) }
          : item
      )
    );
  }, [isEditing, watchedAcademicYear]);

  function addFeeItem() {
    setFeeItems((current) => [...current, getDefaultFeeItem(form.getValues("academicYear"))]);
  }

  function removeFeeItem(index) {
    setFeeItems((current) => current.filter((_, idx) => idx !== index));
  }

  function updateFeeItem(index, field, value) {
    setFeeItems((current) =>
      current.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  }

  function loadClassFeeRows() {
    if (!selectedClassId || classFeeStructures.length === 0) {
      return;
    }

    setFeeItems(classFeeStructures.map((structure) => buildFeeItemFromStructure(structure, selectedAcademicYear)));
    setLastAppliedClassId(selectedClassId);
  }

  useEffect(() => {
    if (!open || !selectedInstitutionId || !selectedClassId) {
      setClassFeeStructures([]);
      return;
    }

    let cancelled = false;
    setLoadingClassFees(true);

    fetch(`/api/fees/structures?institutionId=${selectedInstitutionId}&classId=${selectedClassId}`)
      .then((response) => response.json().catch(() => ({})).then((result) => ({ ok: response.ok, result })))
      .then(({ ok, result }) => {
        if (cancelled) {
          return;
        }

        if (!ok) {
          throw new Error(result.message || "Failed to load class fee structures.");
        }

        const nextStructures = result.data || [];
        setClassFeeStructures(nextStructures);
      })
      .catch((error) => {
        if (!cancelled) {
          setClassFeeStructures([]);
          toast.error(error.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingClassFees(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, selectedInstitutionId, selectedClassId]);

  useEffect(() => {
    if (!selectedClassId || selectedClassId === lastAppliedClassId) {
      return;
    }

    if (classFeeStructures.length === 0) {
      return;
    }

    setFeeItems(classFeeStructures.map((structure) => buildFeeItemFromStructure(structure, selectedAcademicYear)));
    setLastAppliedClassId(selectedClassId);
  }, [classFeeStructures, lastAppliedClassId, selectedAcademicYear, selectedClassId]);

  useEffect(() => {
    if (!open || !initialValues?.id || !isEditing) {
      return;
    }

    let cancelled = false;
    fetch(`/api/fees/assignments?studentId=${initialValues.id}`)
      .then((response) => response.json().catch(() => ({})).then((result) => ({ ok: response.ok, result })))
      .then(({ ok, result }) => {
        if (cancelled) {
          return;
        }

        if (!ok) {
          throw new Error(result.message || "Failed to load student fee invoices.");
        }

        const invoices = result.data || [];
        const editableInvoices = invoices.filter((invoice) =>
          ["PENDING", "PARTIALLY_PAID"].includes(invoice.status)
        );
        if (editableInvoices.length > 0) {
          setFeeItems(editableInvoices.map(buildFeeItemFromInvoice));
        }
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [initialValues?.id, isEditing, open]);

  async function onSubmit(values) {
    const normalizedFeeItems = feeItems
      .map((item) => ({
        feeInvoiceId: item.feeInvoiceId || null,
        feeStructureId: item.feeStructureId || null,
        name: item.name.trim(),
        amount: Number(item.amount),
        frequency: item.frequency,
        dueDate: item.frequency === "ONE_TIME" ? item.dueDate || null : null,
        monthNumber: item.frequency === "MONTHLY" ? Number(item.monthNumber) : null,
        ledgerYear: item.frequency === "MONTHLY" ? Number(item.ledgerYear) : null,
        notes: item.notes.trim() || null
      }))
      .filter((item) => item.name && Number.isFinite(item.amount) && item.amount > 0);

    const selectedClass = classes.find((item) => item.id === values.classId);
    const response = await fetch(isEditing ? `/api/students/${initialValues.id}` : "/api/students", {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        academicYear: values.academicYear || selectedClass?.academicYear || "",
        feeItems: normalizedFeeItems
      })
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
              ["gender", "Gender"],
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
                      ) : name === "gender" ? (
                        <Select {...field}>
                          <option value="">Select Gender</option>
                          {studentGenderOptions.map((option) => (
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
              name="academicYear"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Academic Year</FormLabel>
                  <FormControl>
                    <Select {...field}>
                      <option value="">Select Academic Year</option>
                      {institutionAcademicYears.map((yearOption) => (
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
              name="classId"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Class</FormLabel>
                  <FormControl>
                    <Select {...field} disabled={!selectedAcademicYear}>
                      <option value="">Unassigned</option>
                      {institutionClasses.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}{item.section ? ` - ${item.section}` : ""}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                  {!selectedAcademicYear ? (
                    <p className="text-sm text-muted-foreground">
                      Select academic year first to view classes.
                    </p>
                  ) : null}
                  {institutionClasses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No classes found for the selected academic year.
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
            <div className="space-y-3 rounded-md border p-3 md:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">Student Fee Structure</p>
                    <p className="text-xs text-muted-foreground">Class fees can be loaded and adjusted here.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      disabled={!selectedClassId || loadingClassFees || classFeeStructures.length === 0}
                      onClick={loadClassFeeRows}
                      type="button"
                      variant="outline"
                    >
                      {loadingClassFees ? "Loading..." : "Load Class Fees"}
                    </Button>
                    <Button onClick={addFeeItem} type="button" variant="outline">Add Fee Row</Button>
                  </div>
                </div>

                {feeItems.map((item, index) => (
                  <div className="grid gap-2 rounded-md border p-3 md:grid-cols-6" key={`fee-item-${index}`}>
                    <div className="md:col-span-2">
                      <p className="mb-1 text-xs text-muted-foreground">Fee Head</p>
                      <Input
                        list={`fee-head-options-${index}`}
                        onChange={(event) => updateFeeItem(index, "name", event.target.value)}
                        placeholder="Select or type fee head"
                        value={item.name}
                      />
                      <datalist id={`fee-head-options-${index}`}>
                        {feeHeadOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">Amount</p>
                      <Input
                        min="1"
                        onChange={(event) => updateFeeItem(index, "amount", event.target.value)}
                        type="number"
                        value={item.amount}
                      />
                    </div>

                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">Frequency</p>
                      <Select
                        onChange={(event) => updateFeeItem(index, "frequency", event.target.value)}
                        value={item.frequency}
                      >
                        <option value="ONE_TIME">ONE_TIME</option>
                        <option value="MONTHLY">MONTHLY</option>
                      </Select>
                    </div>

                    {item.frequency === "MONTHLY" ? (
                      <>
                        <div>
                          <p className="mb-1 text-xs text-muted-foreground">Month</p>
                          <Select
                            onChange={(event) => updateFeeItem(index, "monthNumber", event.target.value)}
                            value={item.monthNumber}
                          >
                            {monthOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </Select>
                        </div>
                        <div>
                          <p className="mb-1 text-xs text-muted-foreground">Year</p>
                          <Input
                            min="2000"
                            onChange={(event) => updateFeeItem(index, "ledgerYear", event.target.value)}
                            type="number"
                            value={item.ledgerYear}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="md:col-span-2">
                        <p className="mb-1 text-xs text-muted-foreground">Due Date</p>
                        <Input
                          onChange={(event) => updateFeeItem(index, "dueDate", event.target.value)}
                          type="date"
                          value={item.dueDate}
                        />
                      </div>
                    )}

                    <div className="md:col-span-5">
                      <p className="mb-1 text-xs text-muted-foreground">Notes (optional)</p>
                      <Input
                        onChange={(event) => updateFeeItem(index, "notes", event.target.value)}
                        placeholder="Optional note"
                        value={item.notes}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={() => removeFeeItem(index)} type="button" variant="outline">Remove</Button>
                    </div>
                  </div>
                ))}
            </div>
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
