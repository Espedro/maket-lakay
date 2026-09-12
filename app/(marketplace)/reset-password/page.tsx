"use client";

import * as React from "react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { updatePassword } from "./actions";

/**
 * Recovery links generated via the Supabase admin API (as opposed to a
 * user's own resetPasswordForEmail() call) aren't PKCE-bound to the browser
 * that requested them, so Supabase delivers them as access/refresh tokens in
 * the URL fragment instead of a ?code= param - fragments never reach the
 * server, so this has to run client-side before anything else, in whichever
 * browser actually opens the link.
 */
function useSessionFromHash() {
  const [status, setStatus] = React.useState<"checking" | "ready" | "error">("checking");

  React.useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");

    if (!hash) {
      setStatus("ready");
      return;
    }

    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken || params.get("type") !== "recovery") {
      setStatus("ready");
      return;
    }

    const supabase = createClient();

    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => {
      window.history.replaceState({}, "", window.location.pathname + window.location.search);
      setStatus(error ? "error" : "ready");
    });
  }, []);

  return status;
}

export default function ResetPasswordPage() {
  const [state, formAction, isPending] = useActionState(updatePassword, undefined);
  const sessionStatus = useSessionFromHash();

  return (
    <div className="container flex min-h-[60vh] items-center justify-center py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Set a new password</CardTitle>
          <CardDescription>Choose a new password for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {sessionStatus === "checking" ? (
            <p className="text-sm text-muted-foreground">Verifying your reset link...</p>
          ) : sessionStatus === "error" ? (
            <p className="text-sm text-destructive" role="alert">
              This reset link is invalid or has expired. Request a new one from the login page.
            </p>
          ) : (
            <form action={formAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </div>
              {state?.error ? (
                <p className="text-sm text-destructive" role="alert">
                  {state.error}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Updating..." : "Update password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
