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

function getMonthlySessionMonthCount(structure) {
  const startMonth = Number(structure?.sessionStartMonth || 0);
  const endMonth = Number(structure?.sessionEndMonth || 0);

  if (!startMonth || !endMonth) {
    return 1;
  }

  let count = 1;
  let current = startMonth;

  while (current !== endMonth) {
    current = current === 12 ? 1 : current + 1;
    count += 1;

    if (count > 12) {
      break;
    }
  }

  return count;
}

function getFeeStructureBilledTotal(structure) {
  const baseAmount = Number(structure?.amount || 0);
  if (structure?.frequency !== "MONTHLY") {
    return baseAmount;
  }

  return baseAmount * getMonthlySessionMonthCount(structure);
}

function getMonthLabel(monthNumber) {
  const option = monthOptions.find((item) => item.value === String(monthNumber));
  return option?.label || "Month";
}

function getSessionYearLabel(academicYear, monthNumber) {
  const startYear = getAcademicYearStart(academicYear);
  const month = Number(monthNumber);
  if (!month || Number.isNaN(month)) {
    return String(startYear);
  }

  return month >= 3 ? String(startYear) : String(startYear + 1);
}

function getSessionSpanLabel(structure, academicYear) {
  if (structure?.frequency !== "MONTHLY") {
    return "One-time fee";
  }

  const startMonth = structure?.sessionStartMonth || 3;
  const endMonth = structure?.sessionEndMonth || 2;
  const startYearLabel = getSessionYearLabel(academicYear, startMonth);
  const endYearLabel = Number(startYearLabel) + (Number(startMonth) <= Number(endMonth) ? 0 : 1);

  return `${getMonthLabel(startMonth)} ${startYearLabel} to ${getMonthLabel(endMonth)} ${endYearLabel}`;
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
  const [wizardStep, setWizardStep] = useState("setup");
  const [feeItems, setFeeItems] = useState([getDefaultFeeItem("")]);
  const [classFeeStructures, setClassFeeStructures] = useState([]);
  const [loadingClassFees, setLoadingClassFees] = useState(false);
  const [lastAppliedClassId, setLastAppliedClassId] = useState("");
  const [selectedFeeStructureIds, setSelectedFeeStructureIds] = useState([]);

  useEffect(() => {
    const nextStep = initialValues?.id ? "details" : "setup";
    form.reset(
      initialValues
        ? normalizeStudentValues(initialValues)
        : {
            ...defaultValues,
            institutionId: defaultInstitutionId || institutions[0]?.id || ""
          }
    );
    setWizardStep(nextStep);
    setFeeItems([getDefaultFeeItem(initialValues?.academicYear || "")]);
    setClassFeeStructures([]);
    setLastAppliedClassId("");
    setSelectedFeeStructureIds([]);
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

  const selectedFeeStructures = useMemo(
    () => classFeeStructures.filter((item) => selectedFeeStructureIds.includes(item.id)),
    [classFeeStructures, selectedFeeStructureIds]
  );

  const selectedStructuredFeeItems = useMemo(
    () =>
      feeItems.filter(
        (item) => item.feeStructureId && selectedFeeStructureIds.includes(item.feeStructureId)
      ),
    [feeItems, selectedFeeStructureIds]
  );

  const customFeeItemEntries = useMemo(
    () =>
      feeItems
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => !item.feeStructureId),
    [feeItems]
  );

  const classFeeStructureById = useMemo(
    () => new Map(classFeeStructures.map((item) => [item.id, item])),
    [classFeeStructures]
  );

  const selectedFeeTotal = useMemo(
    () => selectedFeeStructures.reduce((sum, item) => sum + getFeeStructureBilledTotal(item), 0),
    [selectedFeeStructures]
  );

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

  function toggleFeeStructureSelection(feeStructureId) {
    setSelectedFeeStructureIds((current) =>
      current.includes(feeStructureId)
        ? current.filter((item) => item !== feeStructureId)
        : [...current, feeStructureId]
    );
  }

  function selectAllFeeStructures() {
    setSelectedFeeStructureIds(classFeeStructures.map((item) => item.id));
  }

  function clearFeeStructureSelection() {
    setSelectedFeeStructureIds([]);
  }

  function goToNextStep() {
    if (wizardStep === "setup") {
      form.trigger(["institutionId", "academicYear", "classId", "admissionNumber"]).then((isValid) => {
        if (isValid) {
          setWizardStep("details");
        }
      });
      return;
    }

    if (wizardStep === "details") {
      form
        .trigger([
          "firstName",
          "lastName",
          "motherName",
          "fatherName",
          "aadhaarNumber",
          "email",
          "phone",
          "dob",
          "category",
          "gender",
          "address",
          "course"
        ])
        .then((isValid) => {
          if (isValid) {
            setWizardStep("fees");
          }
        });
    }
  }

  function goToPreviousStep() {
    if (wizardStep === "fees") {
      setWizardStep("details");
      return;
    }

    if (wizardStep === "details") {
      setWizardStep("setup");
    }
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
    if (isEditing || wizardStep !== "fees") {
      return;
    }

    setSelectedFeeStructureIds(classFeeStructures.map((item) => item.id));
  }, [classFeeStructures, isEditing, wizardStep]);

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
          const nextFeeItems = editableInvoices.map(buildFeeItemFromInvoice);
          setFeeItems(nextFeeItems);
          setSelectedFeeStructureIds(
            Array.from(new Set(editableInvoices.map((invoice) => invoice.feeStructureId).filter(Boolean)))
          );
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

  async function onSubmit(values, overrideFeeItems, selectedFeeStructureIdsOverride = []) {
    const sourceFeeItems = overrideFeeItems || feeItems;
    const normalizedFeeItems = sourceFeeItems
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
        feeItems: normalizedFeeItems,
        selectedFeeStructureIds: selectedFeeStructureIdsOverride
      })
    });

    const result = await parseJson(response);
    toast.success(isEditing ? "Student updated." : "Student added.");
    onSuccess(result.data);
    onOpenChange(false);
  }

  async function handleFormSubmit(event) {
    event.preventDefault();

    if (!isEditing && wizardStep !== "fees") {
      goToNextStep();
      return;
    }

    const submit = form.handleSubmit(
      async (values) => {
        if (wizardStep === "fees") {
          if (isEditing) {
            const editableFeeItems = [
              ...feeItems.filter((item) => !item.feeStructureId),
              ...selectedStructuredFeeItems
            ];
            await onSubmit(values, editableFeeItems, selectedFeeStructureIds);
            return;
          }

          await onSubmit(values, [], selectedFeeStructureIds);
          return;
        }

        await onSubmit(values);
      },
      (error) => {
        const message = Object.values(error)[0]?.message;
        if (message) {
          toast.error(message);
        }
      }
    );

    await submit(event);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{initialValues?.id ? "Edit Student" : "Add Student"}</DialogTitle>
          <DialogDescription>
            Capture admissions, class mapping, contact details, and fee setup in a guided flow.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={handleFormSubmit}>
            {!isEditing ? (
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-md border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Step 1</p>
                  <p className="mt-1 font-medium">Setup</p>
                  <p className="text-sm text-muted-foreground">Institution, year, class, and admission number.</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Step 2</p>
                  <p className="mt-1 font-medium">Student details</p>
                  <p className="text-sm text-muted-foreground">Personal, contact, and identity details.</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Step 3</p>
                  <p className="mt-1 font-medium">Fee setup</p>
                  <p className="text-sm text-muted-foreground">Load or adjust fee rows before saving.</p>
                </div>
              </div>
            ) : null}

            {(isEditing || wizardStep === "setup") ? (
              <Card>
                <CardContent className="grid gap-4 p-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <p className="text-sm font-semibold">Student setup</p>
                    <p className="text-xs text-muted-foreground">
                      Start with the institution, academic year, and class assignment.
                    </p>
                  </div>
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
                    name="admissionNumber"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel>Admission Number</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="ADM-2026-001" />
                        </FormControl>
                        <FormMessage>{fieldState.error?.message}</FormMessage>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            ) : null}

            {(isEditing || wizardStep === "details") ? (
              <Card>
                <CardContent className="grid gap-4 p-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <p className="text-sm font-semibold">Student details</p>
                    <p className="text-xs text-muted-foreground">
                      Capture the student profile and contact information.
                    </p>
                  </div>
                  {[
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
                        <FormItem className={name === "course" ? "md:col-span-2" : ""}>
                          <FormLabel>{label}</FormLabel>
                          <FormControl>
                            {name === "category" ? (
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
                </CardContent>
              </Card>
            ) : null}

            {(isEditing || wizardStep === "fees") ? (
              <div className="space-y-3 rounded-md border p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Student Fee Structure</p>
                    <p className="text-xs text-muted-foreground">
                      {isEditing
                        ? "Update the fee cards that apply to this student. The total updates automatically."
                        : "Select the fee cards that apply to this student. The total updates automatically."}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      disabled={classFeeStructures.length === 0}
                      onClick={selectAllFeeStructures}
                      type="button"
                      variant="outline"
                    >
                      Select All
                    </Button>
                    <Button
                      disabled={selectedFeeStructureIds.length === 0}
                      onClick={clearFeeStructureSelection}
                      type="button"
                      variant="outline"
                    >
                      Clear
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Selected Fees</p>
                    <p className="mt-2 text-2xl font-semibold">{selectedFeeStructureIds.length}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Billed</p>
                    <p className="mt-2 text-2xl font-semibold">Rs. {selectedFeeTotal.toFixed(2)}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Class Fees</p>
                    <p className="mt-2 text-2xl font-semibold">{classFeeStructures.length}</p>
                  </div>
                </div>

                {loadingClassFees ? (
                  <p className="text-sm text-muted-foreground">Loading class fee cards...</p>
                ) : null}

                {!loadingClassFees && classFeeStructures.length === 0 ? (
                  <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                    No class fee structures were found for this class. You can still add custom fee items below.
                  </p>
                ) : null}

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {classFeeStructures.map((structure) => {
                    const isSelected = selectedFeeStructureIds.includes(structure.id);

                    return (
                      <button
                        className={`rounded-xl border p-4 text-left transition-all ${
                          isSelected
                            ? "border-emerald-400 bg-emerald-50 shadow-sm"
                            : "border-slate-200 bg-card hover:border-sky-300 hover:shadow-sm"
                        }`}
                        key={structure.id}
                        onClick={() => toggleFeeStructureSelection(structure.id)}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="font-medium">{structure.name || "Untitled fee"}</p>
                            <p className="text-sm text-muted-foreground">
                              {structure.notes || getSessionSpanLabel(structure, selectedAcademicYear)}
                            </p>
                          </div>
                          <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                            {isSelected ? "Selected" : "Tap to select"}
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                          <span className="rounded-full bg-muted px-2 py-1">
                            Rs. {Number(structure.amount || 0).toFixed(2)}
                            {structure.frequency === "MONTHLY" ? " / month" : ""}
                          </span>
                          <span className="rounded-full bg-muted px-2 py-1">
                            {structure.frequency === "MONTHLY" ? "Monthly" : "One-time"}
                          </span>
                          <span className="rounded-full bg-muted px-2 py-1">
                            {getSessionSpanLabel(structure, selectedAcademicYear)}
                          </span>
                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-900">
                            Total Rs. {getFeeStructureBilledTotal(structure).toFixed(2)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {isEditing ? (
                  <div className="space-y-3 rounded-xl border bg-muted/10 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Custom fee items</p>
                        <p className="text-sm text-muted-foreground">
                          Add or adjust manual fee rows that are not linked to class fee structures.
                        </p>
                      </div>
                      <Button onClick={addFeeItem} type="button" variant="outline">
                        Add Custom Fee
                      </Button>
                    </div>
                    {customFeeItemEntries.length === 0 ? (
                      <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                        No custom fee items yet.
                      </p>
                    ) : null}
                    {customFeeItemEntries.map(({ item, index }) => (
                      <div className="rounded-xl border bg-card p-4 shadow-sm" key={item.feeInvoiceId || `fee-item-${index}`}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="font-medium">{item.name || "Untitled fee"}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.frequency === "MONTHLY"
                                ? getSessionSpanLabel(
                                    classFeeStructureById.get(item.feeStructureId) || item,
                                    selectedAcademicYear
                                  )
                                : item.dueDate || "One-time fee"}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                              {item.frequency === "MONTHLY" ? "Monthly" : "One-time"}
                            </span>
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-900">
                              Rs. {Number(item.amount || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                          <div className="space-y-1 xl:col-span-2">
                            <p className="text-xs font-medium text-muted-foreground">Fee Head</p>
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

                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Amount</p>
                            <Input
                              min="1"
                              onChange={(event) => updateFeeItem(index, "amount", event.target.value)}
                              type="number"
                              value={item.amount}
                            />
                          </div>

                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Frequency</p>
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
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Month</p>
                                <Select
                                  onChange={(event) => updateFeeItem(index, "monthNumber", event.target.value)}
                                  value={item.monthNumber}
                                >
                                  {monthOptions.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                  ))}
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Year</p>
                                <Input
                                  min="2000"
                                  onChange={(event) => updateFeeItem(index, "ledgerYear", event.target.value)}
                                  type="number"
                                  value={item.ledgerYear}
                                />
                              </div>
                            </>
                          ) : (
                            <div className="space-y-1 md:col-span-2">
                              <p className="text-xs font-medium text-muted-foreground">Due Date</p>
                              <Input
                                onChange={(event) => updateFeeItem(index, "dueDate", event.target.value)}
                                type="date"
                                value={item.dueDate}
                              />
                            </div>
                          )}

                          <div className="space-y-1 md:col-span-5">
                            <p className="text-xs font-medium text-muted-foreground">Notes (optional)</p>
                            <Input
                              onChange={(event) => updateFeeItem(index, "notes", event.target.value)}
                              placeholder="Optional note"
                              value={item.notes}
                            />
                          </div>

                          <div className="flex items-end">
                            <Button onClick={() => removeFeeItem(index)} type="button" variant="outline">
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <DialogFooter className="flex flex-wrap items-center justify-between gap-2">
              {!isEditing ? (
                <div className="flex gap-2">
                  <Button disabled={wizardStep === "setup"} onClick={goToPreviousStep} type="button" variant="outline">
                    Back
                  </Button>
                  {wizardStep !== "fees" ? (
                    <Button onClick={goToNextStep} type="button">
                      Next
                    </Button>
                  ) : null}
                </div>
              ) : null}
              {isEditing || wizardStep === "fees" ? (
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting
                    ? "Saving..."
                    : isEditing
                      ? `Save Student${selectedFeeStructureIds.length ? ` (Rs. ${selectedFeeTotal.toFixed(2)})` : ""}`
                      : `Confirm & Save Student${selectedFeeStructureIds.length ? ` (Rs. ${selectedFeeTotal.toFixed(2)})` : ""}`}
                </Button>
              ) : null}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
