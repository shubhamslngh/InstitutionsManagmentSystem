"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card.js";
import { Input } from "./ui/input.js";
import { Select } from "./ui/select.js";
import { Table } from "./ui/table.js";
import { Badge } from "./ui/badge.js";

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
  const schoolCount = institutions.filter((institution) => institution.type === "SCHOOL").length;
  const collegeCount = institutions.filter((institution) => institution.type === "COLLEGE").length;

  return (
    <div className="stack-lg">
      <section className="summary-grid">
        <article className="summary-card">
          <span className="summary-label">Total Campuses</span>
          <strong className="summary-value">{institutions.length}</strong>
        </article>
        <article className="summary-card">
          <span className="summary-label">Schools</span>
          <strong className="summary-value">{schoolCount}</strong>
        </article>
        <article className="summary-card">
          <span className="summary-label">Colleges</span>
          <strong className="summary-value">{collegeCount}</strong>
        </article>
        <article className="summary-card">
          <span className="summary-label">Filtered View</span>
          <strong className="summary-value">{filteredInstitutions.length}</strong>
        </article>
      </section>

      <Card className="panel">
        <CardHeader className="page-head">
          <span className="eyebrow">New Institution</span>
          <CardTitle>{editingId ? "Update campus" : "Register campus"}</CardTitle>
          <CardDescription>Add a school or college and make it available to the admissions and fee teams.</CardDescription>
        </CardHeader>
        <CardContent>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>Name</span>
            <Input name="name" value={form.name} onChange={updateField} required />
          </label>
          <label className="field">
            <span>Type</span>
            <Select name="type" value={form.type} onChange={updateField}>
              <option value="SCHOOL">School</option>
              <option value="COLLEGE">College</option>
            </Select>
          </label>
          <label className="field">
            <span>Code</span>
            <Input name="code" value={form.code} onChange={updateField} />
          </label>
          <label className="field">
            <span>Address</span>
            <Input name="address" value={form.address} onChange={updateField} />
          </label>
          <label className="field">
            <span>Email</span>
            <Input name="contactEmail" type="email" value={form.contactEmail} onChange={updateField} />
          </label>
          <label className="field">
            <span>Phone</span>
            <Input name="contactPhone" value={form.contactPhone} onChange={updateField} />
          </label>
          <div className="form-actions">
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? "Saving..." : editingId ? "Save Changes" : "Create Institution"}
            </Button>
            {editingId ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setEditingId(null);
                  setForm(initialForm);
                }}
                type="button"
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
        {message ? <div className="notice">{message}</div> : null}
        </CardContent>
      </Card>

      <Card className="panel">
        <CardHeader className="page-head">
          <CardTitle>Institution directory</CardTitle>
          <CardDescription>All registered campuses available for student and finance operations.</CardDescription>
        </CardHeader>
        <CardContent>
        <div className="toolbar">
          <Input
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
          <Table className="table">
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
                  <td><Badge>{institution.type}</Badge></td>
                  <td>{institution.code || "-"}</td>
                  <td>{institution.contactEmail || institution.contactPhone || "-"}</td>
                  <td>
                    <div className="row-actions">
                      <Button size="sm" variant="outline" onClick={() => startEdit(institution)} type="button">
                        Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(institution.id)} type="button">
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
