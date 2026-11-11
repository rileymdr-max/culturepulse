"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BTN_GO, INPUT, LABEL } from "@/components/marketing/brand";
import { AuthShell, FormNotice } from "@/components/marketing/auth-shell";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "We couldn’t create your account. Please try again.");
      } else {
        router.push(data.pending ? "/login?pending=true" : "/login?registered=true");
      }
    } catch {
      setError("Something went wrong on our side. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      headline={
        <>
          Every trend starts as a <span className="text-[#0B6B45]">subculture</span>.
        </>
      }
      title="Create your account"
      subtitle="Free plan with one monitor. No credit card. New accounts are reviewed, usually within a day."
      switchPrompt="Already have an account?"
      switchHref="/login"
      switchLabel="Sign in"
    >
      {error && <FormNotice tone="error">{error}</FormNotice>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className={LABEL}>
            Name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={INPUT}
          />
        </div>

        <div>
          <label htmlFor="email" className={LABEL}>
            Work email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={INPUT}
            placeholder="you@company.com"
          />
        </div>

        <div>
          <label htmlFor="password" className={LABEL}>
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={INPUT}
            aria-describedby="password-hint"
          />
          <p id="password-hint" className="mt-1.5 text-sm text-[#66625A]">
            At least 6 characters.
          </p>
        </div>

        <button type="submit" disabled={loading} className={cn(BTN_GO, "mt-2 w-full")}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {loading ? "Creating your account…" : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}
