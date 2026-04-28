import { redirect } from "next/navigation";
import { ensureSchema } from "../../db/ensureSchema.js";
import { AuthFormCard } from "../../components/auth/auth-form-card.js";
import { countUsers, getCurrentUser } from "../../lib/auth.js";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  await ensureSchema();
  const [totalUsers, currentUser] = await Promise.all([countUsers(), getCurrentUser()]);

  if (totalUsers > 0) {
    if (currentUser) {
      redirect("/");
    }
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-rose-50 via-amber-50 to-sky-50 p-6">
      <AuthFormCard mode="setup" />
    </div>
  );
}
