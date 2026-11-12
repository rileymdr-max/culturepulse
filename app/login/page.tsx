"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BTN_GO, INPUT, LABEL } from "@/components/marketing/brand";
import { AuthShell, FormNotice } from "@/components/marketing/auth-shell";
import { PENDING_APPROVAL_ERROR } from "@/lib/approval";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // "/" sends first-time users to onboarding and everyone else to the dashboard.
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const justRegistered = searchParams.get("registered") === "true";
  const justRequested = searchParams.get("pending") === "true";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error === PENDING_APPROVAL_ERROR) {
        setError("Your account is waiting for approval. We’ll email you as soon as it’s ready.");
      } else if (result?.error) {
        setError("That email and password don’t match. Check them and try again.");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("Something went wrong on our side. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {justRegistered && !error && (
        <FormNotice tone="success">Your account is ready. Sign in to get started.</FormNotice>
      )}
      {justRequested && !error && (
        <FormNotice tone="success">
          Thanks for signing up! Your account is waiting for approval. We&rsquo;ll email you as soon as it&rsquo;s ready.
        </FormNotice>
      )}
      {error && <FormNotice tone="error">{error}</FormNotice>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className={LABEL}>
            Email
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
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={INPUT}
          />
        </div>

        <button type="submit" disabled={loading} className={cn(BTN_GO, "mt-2 w-full")}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </>
  );
}

export default function LoginPage() {
  return (
    <AuthShell
      headline={
        <>
          See what <span className="text-[#0B6B45]">moved</span>
          <br />
          while you were away.
        </>
      }
      title="Welcome back"
      subtitle="Sign in to your Signal Board."
      switchPrompt="New to CulturePulse?"
      switchHref="/register"
      switchLabel="Create an account"
    >
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-[#F2EDE3]" />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
