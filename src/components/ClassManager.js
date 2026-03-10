"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

const initialForm = {
  institutionId: "",
  name: "",
  section: "",
  academicYear: "",
  capacity: ""
};

export default function ClassManager({
  institutions = [],
  initialClasses = [],
  initialError = null
}) {
  const router = useRouter();
  const [classes, setClasses] = useState(initialClasses);
  const [form, setForm] = useState({
    ...initialForm,
    institutionId: institutions[0]?.id || ""
  });
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState(initialError);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [institutionFilter, setInstitutionFilter] = useState("ALL");

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(editingId ? `/api/classes/${editingId}` : "/api/classes", {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...form,
          capacity: form.capacity ? Number(form.capacity) : null
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Failed to save class.");
      }

      setClasses((current) =>
        editingId
          ? current.map((item) => (item.id === editingId ? result.data : item))
          : [result.data, ...current]
      );
      setEditingId(null);
      setForm({ ...initialForm, institutionId: institutions[0]?.id || "" });
      setMessage(editingId ? "Class updated successfully." : "Class created successfully.");
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      institutionId: item.institutionId,
      name: item.name || "",
      section: item.section || "",
      academicYear: item.academicYear || "",
      capacity: item.capacity ? String(item.capacity) : ""
    });
  }

  async function handleDelete(classId) {
    setMessage(null);

    try {
      const response = await fetch(`/api/classes/${classId}`, { method: "DELETE" });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || "Failed to delete class.");
      }
      setClasses((current) => current.filter((item) => item.id !== classId));
      if (editingId === classId) {
        setEditingId(null);
        setForm({ ...initialForm, institutionId: institutions[0]?.id || "" });
      }
      setMessage("Class removed.");
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error.message);
    }
  }

  const filteredClasses = classes.filter((item) =>
    institutionFilter === "ALL" ? true : item.institutionId === institutionFilter
  );

  return (
    <div className="stack-lg">
      <section className="panel">
        <div className="page-head">
          <span className="eyebrow">Class Desk</span>
          <h2>{editingId ? "Update class" : "Create class"}</h2>
          <p>Attach classes to campuses so admissions and fee plans can follow the same structure.</p>
        </div>
        {institutions.length === 0 ? (
          <div className="notice">Create an institution before adding classes.</div>
        ) : (
          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="field">
              <span>Institution</span>
              <select name="institutionId" value={form.institutionId} onChange={updateField}>
                {institutions.map((institution) => (
                  <option key={institution.id} value={institution.id}>
                    {institution.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Class Name</span>
              <input name="name" onChange={updateField} required value={form.name} />
            </label>
            <label className="field">
              <span>Section</span>
              <input name="section" onChange={updateField} value={form.section} />
            </label>
            <label className="field">
              <span>Academic Year</span>
              <input name="academicYear" onChange={updateField} value={form.academicYear} />
            </label>
            <label className="field">
              <span>Capacity</span>
              <input min="1" name="capacity" onChange={updateField} type="number" value={form.capacity} />
            </label>
            <div className="form-actions">
              <button className="button button-primary" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Saving..." : editingId ? "Save Changes" : "Create Class"}
              </button>
              {editingId ? (
                <button
                  className="button button-muted"
                  onClick={() => {
                    setEditingId(null);
                    setForm({ ...initialForm, institutionId: institutions[0]?.id || "" });
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
          <h2>Class register</h2>
          <p>Students can be attached to these classes and inherit class-level fee plans.</p>
        </div>
        <div className="toolbar">
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
          <span className="stat-pill">{filteredClasses.length} classes</span>
        </div>
        {filteredClasses.length === 0 ? (
          <p className="empty">No classes created yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Class</th>
                <th>Section</th>
                <th>Institution</th>
                <th>Academic Year</th>
                <th>Capacity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClasses.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.section || "-"}</td>
                  <td>{item.institutionName}</td>
                  <td>{item.academicYear || "-"}</td>
                  <td>{item.capacity || "-"}</td>
                  <td>
                    <div className="row-actions">
                      <button className="button button-small" onClick={() => startEdit(item)} type="button">
                        Edit
                      </button>
                      <button className="button button-small button-danger" onClick={() => handleDelete(item.id)} type="button">
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
