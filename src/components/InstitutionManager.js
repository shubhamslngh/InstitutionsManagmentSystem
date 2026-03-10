"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

const initialForm = {
  name: "",
  type: "SCHOOL",
  code: "",
  address: "",
  contactEmail: "",
  contactPhone: ""
};

export default function InstitutionManager({ initialInstitutions = [], initialError = null }) {
  const router = useRouter();
  const [institutions, setInstitutions] = useState(initialInstitutions);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState(initialError);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(editingId ? `/api/institutions/${editingId}` : "/api/institutions", {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to create institution.");
      }

      setInstitutions((current) =>
        editingId
          ? current.map((item) => (item.id === editingId ? result.data : item))
          : [result.data, ...current]
      );
      setForm(initialForm);
      setEditingId(null);
      setMessage(editingId ? "Institution updated successfully." : "Institution created successfully.");
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

  function startEdit(institution) {
    setEditingId(institution.id);
    setForm({
      name: institution.name || "",
      type: institution.type || "SCHOOL",
      code: institution.code || "",
      address: institution.address || "",
      contactEmail: institution.contactEmail || "",
      contactPhone: institution.contactPhone || ""
    });
    setMessage(null);
  }

  async function handleDelete(institutionId) {
    setMessage(null);

    try {
      const response = await fetch(`/api/institutions/${institutionId}`, { method: "DELETE" });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || "Failed to delete institution.");
      }
      setInstitutions((current) => current.filter((item) => item.id !== institutionId));
      if (editingId === institutionId) {
        setEditingId(null);
        setForm(initialForm);
      }
      setMessage("Institution removed.");
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error.message);
    }
  }

  const filteredInstitutions = institutions.filter((institution) =>
    `${institution.name} ${institution.code || ""} ${institution.type}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="stack-lg">
      <section className="panel">
        <div className="page-head">
          <span className="eyebrow">New Institution</span>
          <h2>{editingId ? "Update campus" : "Register campus"}</h2>
          <p>Add a school or college and make it available to the admissions and fee teams.</p>
        </div>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>Name</span>
            <input name="name" value={form.name} onChange={updateField} required />
          </label>
          <label className="field">
            <span>Type</span>
            <select name="type" value={form.type} onChange={updateField}>
              <option value="SCHOOL">School</option>
              <option value="COLLEGE">College</option>
            </select>
          </label>
          <label className="field">
            <span>Code</span>
            <input name="code" value={form.code} onChange={updateField} />
          </label>
          <label className="field">
            <span>Address</span>
            <input name="address" value={form.address} onChange={updateField} />
          </label>
          <label className="field">
            <span>Email</span>
            <input name="contactEmail" type="email" value={form.contactEmail} onChange={updateField} />
          </label>
          <label className="field">
            <span>Phone</span>
            <input name="contactPhone" value={form.contactPhone} onChange={updateField} />
          </label>
          <div className="form-actions">
            <button className="button button-primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Saving..." : editingId ? "Save Changes" : "Create Institution"}
            </button>
            {editingId ? (
              <button
                className="button button-muted"
                onClick={() => {
                  setEditingId(null);
                  setForm(initialForm);
                }}
                type="button"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
        {message ? <div className="notice">{message}</div> : null}
      </section>

      <section className="panel">
        <div className="page-head">
          <h2>Institution directory</h2>
          <p>All registered campuses available for student and finance operations.</p>
        </div>
        <div className="toolbar">
          <input
            className="filter-input"
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by campus name, type, or code"
            value={searchTerm}
          />
          <span className="stat-pill">{filteredInstitutions.length} campuses</span>
        </div>
        {filteredInstitutions.length === 0 ? (
          <p className="empty">No institutions added yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Code</th>
                <th>Contact</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInstitutions.map((institution) => (
                <tr key={institution.id}>
                  <td>{institution.name}</td>
                  <td><span className="badge">{institution.type}</span></td>
                  <td>{institution.code || "-"}</td>
                  <td>{institution.contactEmail || institution.contactPhone || "-"}</td>
                  <td>
                    <div className="row-actions">
                      <button className="button button-small" onClick={() => startEdit(institution)} type="button">
                        Edit
                      </button>
                      <button className="button button-small button-danger" onClick={() => handleDelete(institution.id)} type="button">
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
