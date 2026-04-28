import {
  assertInstitutionAccess,
  assertPermission,
  getCurrentUserFromRequest,
  getScopedInstitutionId
} from "./auth.js";

export async function requireApiPermission(request, permission) {
  const user = await getCurrentUserFromRequest(request);
  assertPermission(user, permission);
  return user;
}

export function resolveScopedInstitutionId(user, requestedInstitutionId) {
  return getScopedInstitutionId(user, requestedInstitutionId);
}

export function assertApiInstitutionAccess(user, institutionId) {
  assertInstitutionAccess(user, institutionId);
}
