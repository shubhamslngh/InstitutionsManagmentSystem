"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "../ui/button.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card.js";
import { Input } from "../ui/input.js";

export function AuthFormCard({ mode = "login" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isSetup = mode === "setup";

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(isSetup ? "/api/auth/setup" : "/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(
          isSetup
            ? { name, email, password }
            : { email, password }
        )
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.message || "Authentication failed.");
      }

      toast.success(isSetup ? "Admin account created." : "Signed in successfully.");
      router.push("/");
      router.refresh();
    } catch (error) {
      toast.error(error.message || "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-sky-200 bg-white/90 shadow-lg">
      <CardHeader className="space-y-2 text-center">
        <CardTitle>{isSetup ? "Initial Setup" : "Sign In"}</CardTitle>
        <CardDescription>
          {isSetup
            ? "Create the first super admin account to secure the dashboard."
            : "Sign in with your user account to access the dashboard."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {isSetup ? (
            <Input
              onChange={(event) => setName(event.target.value)}
              placeholder="Full name"
              required
              value={name}
            />
          ) : null}
          <Input
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email address"
            required
            type="email"
            value={email}
          />
          <Input
            autoComplete={isSetup ? "new-password" : "current-password"}
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            required
            type="password"
            value={password}
          />
          <Button className="w-full" disabled={submitting} type="submit">
            {submitting ? "Please wait..." : isSetup ? "Create Admin Account" : "Sign In"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
