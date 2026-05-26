"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { IndianRupee, Trash2, UserRound } from "lucide-react";
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
import { Badge } from "../ui/badge.js";
import { formatDateInput } from "../../lib/dateFormat.js";
import { cn } from "../../lib/utils.js";

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

function getFeeEditSnapshot(items, selectedIds) {
  return JSON.stringify({
    items: items.map((item) => ({
      feeInvoiceId: item.feeInvoiceId || "",
      feeStructureId: item.feeStructureId || "",
      name: item.name || "",
      amount: String(item.amount || ""),
      frequency: item.frequency || "",
      dueDate: item.dueDate || "",
      monthNumber: String(item.monthNumber || ""),
      ledgerYear: String(item.ledgerYear || ""),
      notes: item.notes || ""
    })),
    selectedIds: [...selectedIds].sort()
  });
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
  const [loadedClassFeesKey, setLoadedClassFeesKey] = useState("");
  const [lastAppliedClassId, setLastAppliedClassId] = useState("");
  const [selectedFeeStructureIds, setSelectedFeeStructureIds] = useState([]);
  const [editTab, setEditTab] = useState("details");
  const [feesDirty, setFeesDirty] = useState(false);
  const [initialFeeSnapshot, setInitialFeeSnapshot] = useState(null);

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
    setLoadedClassFeesKey("");
    setLastAppliedClassId("");
    setSelectedFeeStructureIds([]);
    setEditTab("details");
    setFeesDirty(false);
    setInitialFeeSnapshot(null);
  }, [defaultInstitutionId, form, initialValues, institutions]);

  const selectedInstitutionId = form.watch("institutionId");
  const selectedAcademicYear = form.watch("academicYear");
  const selectedClassId = form.watch("classId");
  const selectedClass = classes.find((item) => item.id === selectedClassId) || null;
  const selectedClassFeesKey = selectedInstitutionId && selectedClassId
    ? `${selectedInstitutionId}:${selectedClassId}`
    : "";
  const waitingForCreateFees =
    !isEditing &&
    wizardStep === "fees" &&
    Boolean(selectedClassFeesKey) &&
    loadedClassFeesKey !== selectedClassFeesKey;
  const createSteps = [
    { id: "setup", label: "Setup", hint: "Class" },
    { id: "details", label: "Details", hint: "Profile" },
    { id: "fees", label: "Fees", hint: "Confirm" }
  ];
  const activeCreateStepIndex = createSteps.findIndex((step) => step.id === wizardStep);
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
    const feePanelOpen = isEditing ? editTab === "fees" : wizardStep === "fees";

    if (!open || !selectedInstitutionId || !selectedClassId || !feePanelOpen) {
      setClassFeeStructures([]);
      setLoadedClassFeesKey("");
      setLoadingClassFees(false);
      return;
    }

    let cancelled = false;
    setLoadedClassFeesKey("");
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
        setLoadedClassFeesKey(`${selectedInstitutionId}:${selectedClassId}`);
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
  }, [editTab, isEditing, open, selectedInstitutionId, selectedClassId, wizardStep]);

  useEffect(() => {
    if (isEditing || !selectedClassId || selectedClassId === lastAppliedClassId) {
      return;
    }

    if (classFeeStructures.length === 0) {
      return;
    }

    setFeeItems(classFeeStructures.map((structure) => buildFeeItemFromStructure(structure, selectedAcademicYear)));
    setLastAppliedClassId(selectedClassId);
  }, [classFeeStructures, isEditing, lastAppliedClassId, selectedAcademicYear, selectedClassId]);

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
        const nextFeeItems = editableInvoices.map(buildFeeItemFromInvoice);
        const nextSelectedFeeStructureIds = Array.from(
          new Set(editableInvoices.map((invoice) => invoice.feeStructureId).filter(Boolean))
        );

        setFeeItems(nextFeeItems);
        setSelectedFeeStructureIds(nextSelectedFeeStructureIds);
        setInitialFeeSnapshot(getFeeEditSnapshot(nextFeeItems, nextSelectedFeeStructureIds));
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

  useEffect(() => {
    if (!isEditing || initialFeeSnapshot === null) {
      return;
    }

    setFeesDirty(getFeeEditSnapshot(feeItems, selectedFeeStructureIds) !== initialFeeSnapshot);
  }, [feeItems, initialFeeSnapshot, isEditing, selectedFeeStructureIds]);

  function normalizeFeeItems(sourceFeeItems) {
    return sourceFeeItems
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
  }

  async function onSubmit(values, overrideFeeItems, selectedFeeStructureIdsOverride) {
    const shouldSubmitFees = !isEditing || feesDirty;
    const normalizedFeeItems = shouldSubmitFees
      ? normalizeFeeItems(overrideFeeItems || feeItems)
      : undefined;

    const selectedClass = classes.find((item) => item.id === values.classId);
    const payload = {
      ...values,
      academicYear: values.academicYear || selectedClass?.academicYear || ""
    };

    if (shouldSubmitFees) {
      payload.feeItems = normalizedFeeItems;
      payload.selectedFeeStructureIds = selectedFeeStructureIdsOverride || [];
    }

    const response = await fetch(isEditing ? `/api/students/${initialValues.id}` : "/api/students", {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
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
        if (isEditing && !form.formState.isDirty && !feesDirty) {
          onOpenChange(false);
          return;
        }

        if (isEditing) {
          if (feesDirty) {
            const editableFeeItems = [
              ...feeItems.filter((item) => !item.feeStructureId),
              ...selectedStructuredFeeItems
            ];
            await onSubmit(values, editableFeeItems, selectedFeeStructureIds);
            return;
          }

          await onSubmit(values);
          return;
        }

        if (wizardStep === "fees") {
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
      <DialogContent className="max-w-5xl max-h-[calc(100vh-1rem)] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-[24px] p-0">
        <div className="border-b border-slate-100 bg-linear-to-br from-sky-50 via-white to-slate-50 px-4 py-3.5 sm:px-6 sm:py-5">
          <DialogHeader>
            <DialogTitle className="pr-7 text-lg text-slate-950 sm:text-xl">
              {isEditing
                ? `Edit ${initialValues.firstName || "Student"}${initialValues.lastName ? ` ${initialValues.lastName}` : ""}`
                : "Add Student"}
            </DialogTitle>
            {isEditing ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50" variant="secondary">
                  {initialValues.admissionNumber || "Admission not set"}
                </Badge>
                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50" variant="secondary">
                  {initialValues.academicYear || selectedClass?.academicYear || "AY not set"}
                </Badge>
                <DialogDescription className="text-xs sm:text-sm">
                  Update profile or fee assignments, then save once.
                </DialogDescription>
              </div>
            ) : (
              <DialogDescription>
                Capture admissions, class mapping, contact details, and fee setup in a guided flow.
              </DialogDescription>
            )}
          </DialogHeader>
        </div>
        <Form {...form}>
          <form className="flex min-h-0 flex-col bg-slate-50" onSubmit={handleFormSubmit}>
            {isEditing ? (
              <div className="border-b border-slate-100 bg-white px-3 py-2.5 sm:px-6 sm:py-3">
                <div className="flex rounded-xl bg-slate-100 p-1 sm:mx-auto sm:max-w-sm">
                  {[
                    { id: "details", icon: UserRound, label: "Student Details" },
                    { id: "fees", icon: IndianRupee, label: "Fees" }
                  ].map((tab) => {
                    const Icon = tab.icon;

                    return (
                      <button
                        className={cn(
                          "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium text-slate-600 transition sm:text-sm",
                          editTab === tab.id && "bg-white text-sky-700 shadow-sm",
                          tab.id === "fees" && editTab === tab.id && "text-emerald-700"
                        )}
                        key={tab.id}
                        onClick={() => setEditTab(tab.id)}
                        type="button"
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="border-b border-slate-100 bg-white px-3 py-3 sm:px-6">
                <div className="mx-auto flex max-w-md items-start">
                  {createSteps.map((step, index) => {
                    const isActive = step.id === wizardStep;
                    const isComplete = index < activeCreateStepIndex;

                    return (
                      <div
                        className={cn("flex items-start", index < createSteps.length - 1 ? "flex-1" : "shrink-0")}
                        key={step.id}
                      >
                        <div className="flex min-w-14 flex-col items-center text-center">
                          <span
                            className={cn(
                              "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold",
                              isActive && "border-sky-600 bg-sky-600 text-white",
                              isComplete && "border-emerald-500 bg-emerald-500 text-white",
                              !isActive && !isComplete && "border-slate-200 bg-slate-50 text-slate-400"
                            )}
                          >
                            {index + 1}
                          </span>
                          <p className={cn("mt-1 text-[11px] font-medium text-slate-400", (isActive || isComplete) && "text-slate-800")}>
                            {step.label}
                          </p>
                          <p className="hidden text-[10px] text-slate-400 sm:block">{step.hint}</p>
                        </div>
                        {index < createSteps.length - 1 ? (
                          <span className={cn("mx-2 mt-3.5 h-px flex-1 bg-slate-200", isComplete && "bg-emerald-400")} />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="min-h-0 space-y-3 overflow-y-auto p-3 sm:space-y-4 sm:p-5">
            {((isEditing && editTab === "details") || (!isEditing && wizardStep === "setup")) ? (
              <Card className="border-0 shadow-sm">
                <CardContent className={cn("grid p-3 sm:grid-cols-2 sm:gap-4 sm:p-4", isEditing ? "grid-cols-2 gap-2.5" : "grid-cols-1 gap-3")}>
                  <div className={isEditing ? "col-span-2" : "sm:col-span-2"}>
                    <p className="text-sm font-semibold">Student setup</p>
                    <p className="text-xs text-muted-foreground">
                      Start with the institution, academic year, and class assignment.
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name="institutionId"
                    render={({ field, fieldState }) => (
                      <FormItem className={isEditing ? "col-span-2" : "sm:col-span-2"}>
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
                      <FormItem className="min-w-0">
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
                      <FormItem className="min-w-0">
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
                          <p className="text-xs text-muted-foreground">
                            Select academic year first to view classes.
                          </p>
                        ) : null}
                        {institutionClasses.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
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
                      <FormItem className={isEditing ? "col-span-2 md:col-span-1" : "sm:col-span-2 md:col-span-1"}>
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

            {((isEditing && editTab === "details") || (!isEditing && wizardStep === "details")) ? (
              <Card className="border-0 shadow-sm">
                <CardContent className={cn("grid p-3 sm:gap-4 sm:p-4", isEditing ? "grid-cols-2 gap-2.5" : "grid-cols-1 gap-3 min-[390px]:grid-cols-2")}>
                  <div className={isEditing ? "col-span-2" : "min-[390px]:col-span-2"}>
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
                        <FormItem
                          className={cn(
                            "min-w-0",
                            isEditing && (name === "email" || name === "aadhaarNumber" || name === "course") && "col-span-2",
                            !isEditing && !["category", "gender"].includes(name) && "min-[390px]:col-span-2 sm:col-span-1",
                            !isEditing && (name === "email" || name === "aadhaarNumber" || name === "course") && "sm:col-span-2"
                          )}
                        >
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
                      <FormItem className={isEditing ? "col-span-2" : "min-[390px]:col-span-2"}>
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

            {((isEditing && editTab === "fees") || (!isEditing && wizardStep === "fees")) ? (
              <div className="space-y-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Student Fee Structure</p>
                    <p className="text-xs text-muted-foreground">
                      {isEditing
                        ? "Update the fee cards that apply to this student. The total updates automatically."
                        : "Select the fee cards that apply to this student. The total updates automatically."}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                    <Button
                      className="h-8 w-full px-2.5 text-xs sm:h-10 sm:w-auto sm:px-4 sm:text-sm"
                      disabled={classFeeStructures.length === 0}
                      onClick={selectAllFeeStructures}
                      type="button"
                      variant="outline"
                    >
                      Select All
                    </Button>
                    <Button
                      className="h-8 w-full px-2.5 text-xs sm:h-10 sm:w-auto sm:px-4 sm:text-sm"
                      disabled={selectedFeeStructureIds.length === 0}
                      onClick={clearFeeStructureSelection}
                      type="button"
                      variant="outline"
                    >
                      Clear
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                  <div className="rounded-lg border bg-muted/20 p-2.5 sm:p-4">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground sm:text-xs">Selected</p>
                    <p className="mt-1 text-lg font-semibold sm:mt-2 sm:text-2xl">{selectedFeeStructureIds.length}</p>
                  </div>
                  <div className="order-first col-span-2 min-w-0 rounded-lg border bg-emerald-50 p-2.5 sm:order-none sm:col-span-1 sm:p-4">
                    <p className="text-[10px] uppercase tracking-wide text-emerald-700 sm:text-xs">Total</p>
                    <p className="mt-1 break-words text-sm font-semibold text-emerald-800 sm:mt-2 sm:text-2xl">Rs. {selectedFeeTotal.toFixed(2)}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-2.5 sm:p-4">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground sm:text-xs">Class Fees</p>
                    <p className="mt-1 text-lg font-semibold sm:mt-2 sm:text-2xl">{classFeeStructures.length}</p>
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

                <div className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                  {classFeeStructures.map((structure) => {
                    const isSelected = selectedFeeStructureIds.includes(structure.id);

                    return (
                      <button
                        className={`min-w-0 rounded-xl border p-2.5 text-left transition-all sm:p-3 ${
                          isSelected
                            ? "border-emerald-400 bg-emerald-50 shadow-sm"
                            : "border-slate-200 bg-card hover:border-sky-300 hover:shadow-sm"
                        }`}
                        key={structure.id}
                        onClick={() => toggleFeeStructureSelection(structure.id)}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 space-y-1">
                            <p className="break-words text-sm font-medium leading-tight">{structure.name || "Untitled fee"}</p>
                            <p className="text-xs leading-snug text-muted-foreground">
                              {structure.notes || getSessionSpanLabel(structure, selectedAcademicYear)}
                            </p>
                          </div>
                          <span
                            aria-label={isSelected ? "Selected" : "Not selected"}
                            className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border ${
                              isSelected ? "border-emerald-500 bg-emerald-500 ring-2 ring-emerald-100" : "border-slate-300 bg-white"
                            }`}
                          />
                        </div>
                        <div className="mt-2.5 flex flex-wrap items-center gap-1 text-[11px]">
                          <span className="rounded-full bg-muted px-1.5 py-0.5">
                            Rs. {Number(structure.amount || 0).toFixed(2)}
                            {structure.frequency === "MONTHLY" ? " / month" : ""}
                          </span>
                          <span className="rounded-full bg-muted px-1.5 py-0.5">
                            {getSessionSpanLabel(structure, selectedAcademicYear)}
                          </span>
                          <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-emerald-900">
                            Total Rs. {getFeeStructureBilledTotal(structure).toFixed(2)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {isEditing ? (
                  <div className="space-y-3 rounded-xl border bg-muted/10 p-3">
                    <div className="flex flex-col gap-3 min-[390px]:flex-row min-[390px]:items-center min-[390px]:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Custom fee items</p>
                        <p className="hidden text-sm text-muted-foreground sm:block">
                          Add or adjust manual fee rows that are not linked to class fee structures.
                        </p>
                      </div>
                      <AnimatedAddButton className="h-8 w-full px-2 text-xs min-[390px]:w-auto sm:h-10 sm:px-4 sm:text-sm" onClick={addFeeItem} type="button">
                        Add Custom Fee
                      </AnimatedAddButton>
                    </div>
                    {customFeeItemEntries.length === 0 ? (
                      <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                        No custom fee items yet.
                      </p>
                    ) : null}
                    {customFeeItemEntries.map(({ item, index }) => (
                      <div className="rounded-xl border bg-card p-3 shadow-sm sm:p-4" key={item.feeInvoiceId || `fee-item-${index}`}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="font-medium">{item.name || "Untitled fee"}</p>
                            <p className="text-xs text-muted-foreground sm:text-sm">
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

                        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:mt-4 sm:gap-3 md:grid-cols-2 xl:grid-cols-6">
                          <div className="col-span-2 space-y-1 xl:col-span-2">
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

                          <div className="min-w-0 space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Amount</p>
                            <Input
                              min="1"
                              onChange={(event) => updateFeeItem(index, "amount", event.target.value)}
                              type="number"
                              value={item.amount}
                            />
                          </div>

                          <div className="min-w-0 space-y-1">
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
                              <div className="min-w-0 space-y-1">
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
                              <div className="min-w-0 space-y-1">
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
                            <div className="col-span-2 space-y-1 md:col-span-2">
                              <p className="text-xs font-medium text-muted-foreground">Due Date</p>
                              <Input
                                onChange={(event) => updateFeeItem(index, "dueDate", event.target.value)}
                                type="date"
                                value={item.dueDate}
                              />
                            </div>
                          )}

                          <div className="col-span-2 space-y-1 md:col-span-2 xl:col-span-5">
                            <p className="text-xs font-medium text-muted-foreground">Notes (optional)</p>
                            <Input
                              onChange={(event) => updateFeeItem(index, "notes", event.target.value)}
                              placeholder="Optional note"
                              value={item.notes}
                            />
                          </div>

                          <div className="col-span-2 flex justify-end xl:col-span-1 xl:items-end">
                            <Button
                              aria-label={`Remove ${item.name || "custom fee"}`}
                              className="h-8 gap-1.5 border-red-100 bg-red-50 px-2.5 text-xs text-red-600 hover:bg-red-100"
                              onClick={() => removeFeeItem(index)}
                              type="button"
                              variant="outline"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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

            </div>
            <DialogFooter className="shrink-0 border-t border-slate-100 bg-white p-3 sm:p-4">
              {!isEditing ? (
                <div
                  className={cn(
                    "w-full gap-2",
                    wizardStep === "fees"
                      ? "flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between"
                      : "grid grid-cols-2 sm:flex sm:items-center sm:justify-between"
                  )}
                >
                  <Button className="w-full sm:w-auto" disabled={wizardStep === "setup"} onClick={goToPreviousStep} type="button" variant="outline">
                    Back
                  </Button>
                  {wizardStep !== "fees" ? (
                    <Button className="w-full sm:w-auto" onClick={goToNextStep} type="button">
                      Next
                    </Button>
                  ) : (
                    <Button className="w-full sm:ml-auto sm:w-auto" type="submit" disabled={form.formState.isSubmitting || waitingForCreateFees}>
                      {form.formState.isSubmitting
                        ? "Saving..."
                        : waitingForCreateFees
                          ? "Loading Fee Structures..."
                        : `Confirm & Save Student${selectedFeeStructureIds.length ? ` (Rs. ${selectedFeeTotal.toFixed(2)})` : ""}`}
                    </Button>
                  )}
                </div>
              ) : (
                <Button className="w-full sm:ml-auto sm:w-auto" type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting
                    ? "Saving..."
                    : `Save Student${selectedFeeStructureIds.length ? ` (Rs. ${selectedFeeTotal.toFixed(2)})` : ""}`}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
