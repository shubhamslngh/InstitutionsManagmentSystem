export const USER_ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  INSTITUTION_ADMIN: "INSTITUTION_ADMIN",
  ACCOUNTANT: "ACCOUNTANT",
  DATA_ENTRY: "DATA_ENTRY",
  VIEWER: "VIEWER"
};

const rolePermissions = {
  [USER_ROLES.SUPER_ADMIN]: ["*"],
  [USER_ROLES.INSTITUTION_ADMIN]: [
    "dashboard.view",
    "institutions.read",
    "students.read",
    "students.manage",
    "students.promote",
    "classes.read",
    "classes.manage",
    "fees.read",
    "fees.manage",
    "payments.manage"
  ],
  [USER_ROLES.ACCOUNTANT]: [
    "dashboard.view",
    "institutions.read",
    "students.read",
    "classes.read",
    "fees.read",
    "fees.manage",
    "payments.manage"
  ],
  [USER_ROLES.DATA_ENTRY]: [
    "dashboard.view",
    "institutions.read",
    "students.read",
    "students.manage",
    "students.promote",
    "classes.read",
    "classes.manage",
    "fees.read"
  ],
  [USER_ROLES.VIEWER]: [
    "dashboard.view",
    "institutions.read",
    "students.read",
    "classes.read",
    "fees.read"
  ]
};

export function can(user, permission) {
  if (!user) {
    return false;
  }

  const permissions = rolePermissions[user.role] || [];
  return permissions.includes("*") || permissions.includes(permission);
}

export function canAccessPath(user, pathname) {
  const normalizedPath = pathname === "/" ? "/" : pathname.replace(/\/$/, "");

  if (normalizedPath === "/" || normalizedPath === "/students" || normalizedPath === "/classes") {
    return can(user, "dashboard.view");
  }

  if (normalizedPath === "/users") {
    return can(user, "users.manage");
  }

  if (normalizedPath === "/institutions") {
    return can(user, "institutions.read");
  }

  if (normalizedPath === "/fees" || normalizedPath === "/fees/invoices") {
    return can(user, "fees.read");
  }

  return true;
}

export function getRoleOptions() {
  return Object.values(USER_ROLES);
}
