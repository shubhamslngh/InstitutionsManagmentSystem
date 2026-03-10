"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "./ui/badge.js";
import { Button } from "./ui/button.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card.js";
import { DatePicker } from "./ui/date-picker.js";
import { Input } from "./ui/input.js";
import { Select } from "./ui/select.js";
import { Table } from "./ui/table.js";
import { Textarea } from "./ui/textarea.js";
import { formatDateForDisplay, formatDateForStorage } from "../lib/dateFormat.js";

const initialForm = {
  institutionId: "",
  admissionNumber: "",
  firstName: "",
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

export default function StudentManager({
  initialStudents = [],
  institutions = [],
  classes = [],
  initialError = null
}) {
  const router = useRouter();
  const defaultInstitutionId = institutions[0]?.id || "";
  const [students, setStudents] = useState(initialStudents);
  const [form, setForm] = useState({ ...initialForm, institutionId: defaultInstitutionId });
  const [message, setMessage] = useState(initialError);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [institutionFilter, setInstitutionFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const institutionMap = Object.fromEntries(institutions.map((item) => [item.id, item]));
  const classMap = Object.fromEntries(
    classes.map((item) => [item.id, `${item.name}${item.section ? ` - ${item.section}` : ""}`])
  );
  const availableClasses = classes.filter((item) => item.institutionId === form.institutionId);

  async function parseResponse(response) {
    const raw = await response.text();

    try {
      return raw ? JSON.parse(raw) : {};
    } catch {
      throw new Error(
        response.ok
          ? "Received an invalid server response."
          : "Server returned a non-JSON error response."
      );
    }
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "institutionId" ? { classId: "" } : {})
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(editingId ? `/api/students/${editingId}` : "/api/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...form,
          dob: formatDateForStorage(form.dob)
        })
      });

      const result = await parseResponse(response);

      if (!response.ok) {
        throw new Error(result.message || "Failed to save student.");
      }

      setStudents((current) =>
        editingId
          ? current.map((item) => (item.id === editingId ? result.data : item))
          : [result.data, ...current]
      );
      setForm({ ...initialForm, institutionId: defaultInstitutionId });
      setEditingId(null);
      setMessage(editingId ? "Student updated successfully." : "Student added successfully.");
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEdit(student) {
    setEditingId(student.id);
    setForm({
      institutionId: student.institutionId,
      admissionNumber: student.admissionNumber || "",
      firstName: student.firstName || "",
      motherName: student.motherName || "",
      fatherName: student.fatherName || "",
      aadhaarNumber: student.aadhaarNumber || "",
      email: student.email || "",
      phone: student.phone || "",
      address: student.address || "",
      dob: formatDateForDisplay(student.dob),
      course: student.course || "",
      classId: student.classId || ""
    });
  }

  async function handleDelete(studentId) {
    setMessage(null);

    try {
      const response = await fetch(`/api/students/${studentId}`, { method: "DELETE" });
      if (!response.ok) {
        const result = await parseResponse(response);
        throw new Error(result.message || "Failed to delete student.");
      }
      setStudents((current) => current.filter((item) => item.id !== studentId));
      if (editingId === studentId) {
        setEditingId(null);
        setForm({ ...initialForm, institutionId: defaultInstitutionId });
      }
      setMessage("Student removed.");
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error.message);
    }
  }

  const filteredStudents = students.filter((student) => {
    const matchesInstitution =
      institutionFilter === "ALL" || student.institutionId === institutionFilter;
    const matchesSearch = `${student.admissionNumber} ${student.firstName} ${student.lastName} ${student.course || ""} ${student.className || ""}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesInstitution && matchesSearch;
  });
  const assignedToClassCount = students.filter((student) => student.classId || student.className).length;

  return (
    <div className="stack-lg">
      <section className="summary-grid">
        <article className="summary-card">
          <span className="summary-label">Total Students</span>
          <strong className="summary-value">{students.length}</strong>
        </article>
        <article className="summary-card">
          <span className="summary-label">Class Assigned</span>
          <strong className="summary-value">{assignedToClassCount}</strong>
        </article>
        <article className="summary-card">
          <span className="summary-label">Institutions</span>
          <strong className="summary-value">{institutions.length}</strong>
        </article>
        <article className="summary-card">
          <span className="summary-label">Filtered View</span>
          <strong className="summary-value">{filteredStudents.length}</strong>
        </article>
      </section>

      <Card className="panel">
        <CardHeader className="page-head">
          <span className="eyebrow">Admissions</span>
          <CardTitle>{editingId ? "Update student record" : "Register student"}</CardTitle>
          <CardDescription>Create student records and attach them to the correct school or college.</CardDescription>
        </CardHeader>
        <CardContent>
        {institutions.length === 0 ? (
          <div className="notice">Add at least one institution before creating students.</div>
        ) : (
          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="field">
              <span>Institution</span>
              <Select
                name="institutionId"
                value={form.institutionId}
                onChange={updateField}
                required
              >
                {institutions.map((institution) => (
                  <option key={institution.id} value={institution.id}>
                    {institution.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="field">
              <span>Admission No.</span>
              <Input
                name="admissionNumber"
                value={form.admissionNumber}
                onChange={updateField}
                required
              />
            </label>
            <label className="field">
              <span>Student&apos;s Name</span>
              <Input name="firstName" value={form.firstName} onChange={updateField} required />
            </label>
            <label className="field">
              <span>Mother&apos;s Name</span>
              <Input name="motherName" value={form.motherName} onChange={updateField} />
            </label>
            <label className="field">
              <span>Father&apos;s Name</span>
              <Input name="fatherName" value={form.fatherName} onChange={updateField} />
            </label>
            <label className="field">
              <span>Aadhaar No.</span>
              <Input name="aadhaarNumber" value={form.aadhaarNumber} onChange={updateField} />
            </label>
            <label className="field">
              <span>Email</span>
              <Input name="email" type="email" value={form.email} onChange={updateField} />
            </label>
            <label className="field">
              <span>Phone</span>
              <Input name="phone" value={form.phone} onChange={updateField} />
            </label>
            <label className="field">
              <span>Date of Birth</span>
              <DatePicker name="dob" value={form.dob} onChange={updateField} />
            </label>
            <label className="field field-wide">
              <span>Address</span>
              <Textarea name="address" rows="3" value={form.address} onChange={updateField} />
            </label>
            <label className="field">
              <span>Course</span>
              <Input name="course" value={form.course} onChange={updateField} />
            </label>
            <label className="field">
              <span>Class Group</span>
              <Select name="classId" value={form.classId} onChange={updateField}>
                <option value="">Select class</option>
                {availableClasses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}{item.section ? ` - ${item.section}` : ""}
                  </option>
                ))}
              </Select>
            </label>
            <div className="form-actions">
              <Button disabled={isSubmitting} type="submit">
                {isSubmitting ? "Saving..." : editingId ? "Save Changes" : "Create Student"}
              </Button>
              {editingId ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditingId(null);
                    setForm({ ...initialForm, institutionId: defaultInstitutionId });
                  }}
                  type="button"
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        )}
        {message ? <div className="notice">{message}</div> : null}
        </CardContent>
      </Card>

      <Card className="panel">
        <CardHeader className="page-head">
          <CardTitle>Student registry</CardTitle>
          <CardDescription>Students listed here are ready for fee assignment and payment collection.</CardDescription>
        </CardHeader>
        <CardContent>
        <div className="toolbar toolbar-wide">
          <Input
            className="filter-input"
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by admission no., name, class, or course"
            value={searchTerm}
          />
          <Select
            className="filter-input"
            onChange={(event) => setInstitutionFilter(event.target.value)}
            value={institutionFilter}
          >
            <option value="ALL">All institutions</option>
            {institutions.map((institution) => (
              <option key={institution.id} value={institution.id}>
                {institution.name}
              </option>
            ))}
          </Select>
          <span className="stat-pill">{filteredStudents.length} students</span>
        </div>
        {filteredStudents.length === 0 ? (
          <p className="empty">No student records yet.</p>
        ) : (
          <Table className="table">
            <thead>
              <tr>
                <th>Institution</th>
                <th>Admission</th>
                <th>Name</th>
                <th>Parents</th>
                <th>Class</th>
                <th>Mobile</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td>{institutionMap[student.institutionId]?.name || "-"}</td>
                  <td>{student.admissionNumber}</td>
                  <td>{student.firstName}</td>
                  <td>{student.fatherName || student.motherName || "-"}</td>
                  <td>{student.classId ? classMap[student.classId] || student.className || "-" : student.className || "-"}</td>
                  <td>{student.phone || "-"}</td>
                  <td><Badge>{student.status}</Badge></td>
                  <td>
                    <div className="row-actions">
                      <Button size="sm" variant="outline" onClick={() => startEdit(student)} type="button">
                        Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(student.id)} type="button">
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        </CardContent>
      </Card>
    </div>
  );
}
