"use client";

import { useMemo, useState } from "react";
import { ShieldCheck, UserCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button.js";
import { AnimatedAddButton } from "../ui/animated-add-button.js";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.js";
import { MetricCard } from "./metric-card.js";
import { ConfirmDialog } from "./confirm-dialog.js";
import { EmptyState } from "./empty-state.js";
import { StatusBadge } from "./status-badge.js";
import { UserFormDialog } from "../forms/user-form-dialog.js";
import { cn } from "../../lib/utils.js";

export function UsersPageClient({ initialUsers, institutions, currentUser, initialError }) {
  const [users, setUsers] = useState(initialUsers);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [hoveredCardAction, setHoveredCardAction] = useState({});

  const activeUsers = useMemo(
    () => users.filter((user) => user.isActive !== false).length,
    [users]
  );
  const institutionAdmins = useMemo(
    () => users.filter((user) => user.role === "INSTITUTION_ADMIN").length,
    [users]
  );

  async function handleDelete(id) {
    const response = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      toast.error(result.message || "Failed to delete user.");
      return;
    }

    setUsers((current) => current.filter((item) => item.id !== id));
    toast.success("User deleted.");
  }

  function handleSuccess(nextUser) {
    setUsers((current) => {
      const exists = current.some((item) => item.id === nextUser.id);
      if (exists) {
        return current.map((item) => (item.id === nextUser.id ? nextUser : item));
      }

      return [nextUser, ...current];
    });
    setEditingUser(null);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50 p-[1px]">
          <MetricCard icon={UserCircle2} label="Total Users" value={users.length} />
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-cyan-50 p-[1px]">
          <MetricCard icon={ShieldCheck} label="Active Users" value={activeUsers} tone="success" />
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-rose-50 p-[1px]">
          <MetricCard icon={ShieldCheck} label="Institution Admins" value={institutionAdmins} tone="warning" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Users & Roles</h2>
          <p className="text-sm text-muted-foreground">
            Manage admin accounts, institution ownership, and role-based dashboard access.
          </p>
        </div>
        <AnimatedAddButton onClick={() => setDialogOpen(true)}>
          Add User
        </AnimatedAddButton>
      </div>

      {initialError ? (
        <Card>
          <CardContent className="p-6 text-sm text-red-600">{initialError}</CardContent>
        </Card>
      ) : users.length === 0 ? (
        <EmptyState
          title="No users available"
          description="Create the next institution admin, accountant, or data entry user from here."
          action={
            <AnimatedAddButton onClick={() => setDialogOpen(true)}>
              Add User
            </AnimatedAddButton>
          }
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {users.map((user) => {
            const actionTone = hoveredCardAction[user.id];

            return (
            <Card
              className={cn(
                "border-slate-200 bg-linear-to-br from-emerald-50 via-teal-50 to-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                actionTone === "edit" && "border-cyan-200 from-cyan-50 via-sky-50 to-white",
                actionTone === "delete" && "border-red-200 from-red-50 via-rose-50 to-white"
              )}
              key={user.id}
            >
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="space-y-2">
                  <StatusBadge status={user.role} />
                  <CardTitle className="text-base">{user.name}</CardTitle>
                </div>
                <StatusBadge status={user.isActive === false ? "INACTIVE" : "ACTIVE"} />
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-muted-foreground">Email</dt>
                    <dd className="text-right font-medium">{user.email}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-muted-foreground">Institution</dt>
                    <dd className="text-right font-medium">{user.institutionName || "All institutions"}</dd>
                  </div>
                </dl>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    variant="outline"
                    onMouseEnter={() => setHoveredCardAction((current) => ({ ...current, [user.id]: "edit" }))}
                    onMouseLeave={() => setHoveredCardAction((current) => ({ ...current, [user.id]: "" }))}
                    onClick={() => {
                      setEditingUser(user);
                      setDialogOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <ConfirmDialog
                    description={`Delete ${user.name} from the user directory?`}
                    onConfirm={() => handleDelete(user.id)}
                  >
                    <Button
                      className="flex-1"
                      disabled={currentUser?.id === user.id}
                      onMouseEnter={() => setHoveredCardAction((current) => ({ ...current, [user.id]: "delete" }))}
                      onMouseLeave={() => setHoveredCardAction((current) => ({ ...current, [user.id]: "" }))}
                      variant="destructive"
                    >
                      Delete
                    </Button>
                  </ConfirmDialog>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      <UserFormDialog
        initialValues={editingUser}
        institutions={institutions}
        onOpenChange={(nextOpen) => {
          setDialogOpen(nextOpen);
          if (!nextOpen) {
            setEditingUser(null);
          }
        }}
        onSuccess={handleSuccess}
        open={dialogOpen}
      />
    </div>
  );
}
