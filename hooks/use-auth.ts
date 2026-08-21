"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import {
  getRoleHomeHref,
  getRoleLabel,
  getRoleProfileHref,
  type AppRole,
} from "@/lib/auth-roles";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  roleLabel: string;
  homeHref: string;
  profileHref: string;
  vendorId?: string;
  storeId?: string;
}

export function useAuth() {
  const supabase = React.useMemo(() => createClient(), []);
  const pathname = usePathname();
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [isReady, setIsReady] = React.useState(false);

  const loadUser = React.useCallback(
    async (userId: string) => {
      // The profiles row is created by a database trigger right after
      // sign-up, which can lag a moment behind the client redirect - retry
      // a couple of times before concluding there's really no profile,
      // instead of leaving a freshly-signed-up user stuck looking logged
      // out until they manually reload.
      let profile: { id: string; name: string; email: string; role: AppRole } | null = null;

      for (let attempt = 0; attempt < 3 && !profile; attempt += 1) {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        const { data } = await supabase
          .from("profiles")
          .select("id, name, email, role")
          .eq("id", userId)
          .maybeSingle();

        profile = data;
      }

      if (!profile) {
        setUser(null);
        setIsReady(true);
        return;
      }

      let vendorId: string | undefined;
      let storeId: string | undefined;

      if (profile.role === "vendor") {
        const { data: vendor } = await supabase
          .from("vendors")
          .select("id")
          .eq("owner_profile_id", profile.id)
          .maybeSingle();

        vendorId = vendor?.id;

        if (vendorId) {
          const { data: store } = await supabase
            .from("stores")
            .select("id")
            .eq("vendor_id", vendorId)
            .maybeSingle();

          storeId = store?.id;
        }
      }

      setUser({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        roleLabel: getRoleLabel(profile.role),
        homeHref: getRoleHomeHref(profile.role),
        profileHref: getRoleProfileHref(profile.role),
        vendorId,
        storeId,
      });
      setIsReady(true);
    },
    [supabase],
  );

  const checkSession = React.useCallback(
    (active: { current: boolean }) => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!active.current) return;

        if (session?.user) {
          loadUser(session.user.id);
        } else {
          setUser(null);
          setIsReady(true);
        }
      });
    },
    [supabase, loadUser],
  );

  React.useEffect(() => {
    const active = { current: true };

    checkSession(active);

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active.current) return;

      if (session?.user) {
        loadUser(session.user.id);
      } else {
        setUser(null);
        setIsReady(true);
      }
    });

    return () => {
      active.current = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase, loadUser, checkSession]);

  // Sign-up/sign-in run as Next.js Server Actions, which set the session
  // cookie server-side - the client SDK's onAuthStateChange listener never
  // fires for that, since it only observes auth calls made through the
  // client SDK itself. An already-mounted useAuth() instance (like the
  // site header, which persists across the post-auth redirect instead of
  // remounting) would otherwise keep showing "logged out" until the user
  // manually reloads. Re-checking whenever the route changes catches the
  // post-redirect session on every mounted instance, not just fresh ones.
  const isFirstPathnameRun = React.useRef(true);

  React.useEffect(() => {
    if (isFirstPathnameRun.current) {
      isFirstPathnameRun.current = false;
      return;
    }

    const active = { current: true };
    checkSession(active);
    return () => {
      active.current = false;
    };
  }, [pathname, checkSession]);

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.assign("/");
  }, [supabase]);

  return { user, isReady, signOut };
}
