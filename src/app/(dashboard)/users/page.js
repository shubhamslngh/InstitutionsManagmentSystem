import { ensureSchema } from "../../../db/ensureSchema.js";
import { requireDashboardUser } from "../../../lib/auth.js";
import { listInstitutions } from "../../../services/institutionService.js";
import { listUsers } from "../../../services/userService.js";
import { UsersPageClient } from "../../../components/dashboard/users-page-client.js";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const currentUser = await requireDashboardUser("users.manage");
  let users = [];
  let institutions = [];
  let error = null;

  try {
    await ensureSchema();
    [users, institutions] = await Promise.all([listUsers(), listInstitutions()]);
  } catch (cause) {
    error = cause.message;
  }

  return (
    <UsersPageClient
      currentUser={currentUser}
      initialError={error}
      initialUsers={users}
      institutions={institutions}
    />
  );
}
