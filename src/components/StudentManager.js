"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

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
  classId: "",
  className: "",
  section: ""
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

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(editingId ? `/api/students/${editingId}` : "/api/students", {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const result = await response.json();

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
      dob: student.dob ? String(student.dob).slice(0, 10) : "",
      course: student.course || "",
      classId: student.classId || "",
      className: student.className || "",
      section: student.section || ""
    });
  }

  async function handleDelete(studentId) {
    setMessage(null);

    try {
      const response = await fetch(`/api/students/${studentId}`, { method: "DELETE" });
      if (!response.ok) {
        const result = await response.json();
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

  return (
    <div className="stack-lg">
      <section className="panel">
        <div className="page-head">
          <span className="eyebrow">Admissions</span>
          <h2>{editingId ? "Update student record" : "Register student"}</h2>
          <p>Create student records and attach them to the correct school or college.</p>
        </div>
        {institutions.length === 0 ? (
          <div className="notice">Add at least one institution before creating students.</div>
        ) : (
          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="field">
              <span>Institution</span>
              <select
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
              </select>
            </label>
            <label className="field">
              <span>Admission No.</span>
              <input
                name="admissionNumber"
                value={form.admissionNumber}
                onChange={updateField}
                required
              />
            </label>
            <label className="field">
              <span>Student&apos;s Name</span>
              <input name="firstName" value={form.firstName} onChange={updateField} required />
            </label>
            <label className="field">
              <span>Mother&apos;s Name</span>
              <input name="motherName" value={form.motherName} onChange={updateField} />
            </label>
            <label className="field">
              <span>Father&apos;s Name</span>
              <input name="fatherName" value={form.fatherName} onChange={updateField} />
            </label>
            <label className="field">
              <span>Aadhaar No.</span>
              <input name="aadhaarNumber" value={form.aadhaarNumber} onChange={updateField} />
            </label>
            <label className="field">
              <span>Email</span>
              <input name="email" type="email" value={form.email} onChange={updateField} />
            </label>
            <label className="field">
              <span>Phone</span>
              <input name="phone" value={form.phone} onChange={updateField} />
            </label>
            <label className="field">
              <span>Date of Birth</span>
              <input name="dob" type="date" value={form.dob} onChange={updateField} />
            </label>
            <label className="field field-wide">
              <span>Address</span>
              <textarea name="address" rows="3" value={form.address} onChange={updateField} />
            </label>
            <label className="field">
              <span>Course</span>
              <input name="course" value={form.course} onChange={updateField} />
            </label>
            <label className="field">
              <span>Class Group</span>
              <select name="classId" value={form.classId} onChange={updateField}>
                <option value="">Select class</option>
                {availableClasses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}{item.section ? ` - ${item.section}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Class Label</span>
              <input name="className" value={form.className} onChange={updateField} />
            </label>
            <label className="field">
              <span>Section</span>
              <input name="section" value={form.section} onChange={updateField} />
            </label>
            <div className="form-actions">
              <button className="button button-primary" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Saving..." : editingId ? "Save Changes" : "Create Student"}
              </button>
              {editingId ? (
                <button
                  className="button button-muted"
                  onClick={() => {
                    setEditingId(null);
                    setForm({ ...initialForm, institutionId: defaultInstitutionId });
                  }}
                  type="button"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        )}
        {message ? <div className="notice">{message}</div> : null}
      </section>

      <section className="panel">
        <div className="page-head">
          <h2>Student registry</h2>
          <p>Students listed here are ready for fee assignment and payment collection.</p>
        </div>
        <div className="toolbar toolbar-wide">
          <input
            className="filter-input"
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by admission no., name, class, or course"
            value={searchTerm}
          />
          <select
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
          </select>
          <span className="stat-pill">{filteredStudents.length} students</span>
        </div>
        {filteredStudents.length === 0 ? (
          <p className="empty">No student records yet.</p>
        ) : (
          <table className="table">
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
                  <td><span className="badge">{student.status}</span></td>
                  <td>
                    <div className="row-actions">
                      <button className="button button-small" onClick={() => startEdit(student)} type="button">
                        Edit
                      </button>
                      <button className="button button-small button-danger" onClick={() => handleDelete(student.id)} type="button">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
