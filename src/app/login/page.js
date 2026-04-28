import { redirect } from "next/navigation";
import { ensureSchema } from "../../db/ensureSchema.js";
import { AuthFormCard } from "../../components/auth/auth-form-card.js";
import { countUsers, getCurrentUser } from "../../lib/auth.js";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  await ensureSchema();
  const [totalUsers, currentUser] = await Promise.all([countUsers(), getCurrentUser()]);

  if (totalUsers === 0) {
    redirect("/setup");
  }

  if (currentUser) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 via-amber-50 to-rose-50 p-6">
      <AuthFormCard mode="login" />
    </div>
  );
}
