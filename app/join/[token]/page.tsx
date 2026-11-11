"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type InviteState = "loading" | "ready" | "accepting" | "done" | "error";

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const { data: session, status } = useSession();
  const router = useRouter();

  const [inviteState, setInviteState] = useState<InviteState>("loading");
  const [invite, setInvite]           = useState<{ workspaceName: string; invitedEmail: string } | null>(null);
  const [errorMsg, setErrorMsg]       = useState("");

  useEffect(() => {
    async function fetchInvite() {
      try {
        const res = await fetch(`/api/join/${token}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setErrorMsg(body.error ?? "Invalid or expired invite link.");
          setInviteState("error");
          return;
        }
        const data = await res.json();
        setInvite(data.invite);
        setInviteState("ready");
      } catch {
        setErrorMsg("Failed to load invite.");
        setInviteState("error");
      }
    }
    fetchInvite();
  }, [token]);

  async function handleAccept() {
    setInviteState("accepting");
    try {
      const res = await fetch(`/api/join/${token}`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrorMsg(body.error ?? "Failed to accept invite.");
        setInviteState("error");
        return;
      }
      setInviteState("done");
      setTimeout(() => router.push("/dashboard/workspace"), 1500);
    } catch {
      setErrorMsg("Failed to accept invite.");
      setInviteState("error");
    }
  }

  if (status === "loading" || inviteState === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-foreground font-medium">Sign in to accept this workspace invite</p>
            <Link href={`/login?callbackUrl=/join/${token}`}>
              <Button className="w-full">Sign in</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-sm w-full">
        <CardContent className="pt-8 pb-6 text-center space-y-5">
          {inviteState === "error" && (
            <>
              <div className="h-12 w-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
                <AlertCircle className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <p className="font-medium text-foreground">Invite error</p>
                <p className="text-sm text-muted-foreground mt-1">{errorMsg}</p>
              </div>
              <Link href="/dashboard">
                <Button variant="outline" className="w-full">Go to dashboard</Button>
              </Link>
            </>
          )}

          {inviteState === "ready" && invite && (
            <>
              <div className="h-12 w-12 rounded-full bg-accent border border-primary/30 flex items-center justify-center mx-auto">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  You&apos;ve been invited to <strong>{invite.workspaceName}</strong>
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Sent to {invite.invitedEmail}
                </p>
              </div>
              <Button className="w-full gap-2" onClick={handleAccept}>
                Accept invite
              </Button>
            </>
          )}

          {inviteState === "accepting" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Joining workspace…</p>
            </div>
          )}

          {inviteState === "done" && (
            <>
              <div className="h-12 w-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <p className="font-medium text-foreground">You&apos;re in! Redirecting…</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
