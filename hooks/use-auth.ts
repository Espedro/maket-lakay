"use client";

import * as React from "react";

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
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [isReady, setIsReady] = React.useState(false);

  const loadUser = React.useCallback(
    async (userId: string) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, name, email, role")
        .eq("id", userId)
        .maybeSingle();

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

  React.useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;

      if (session?.user) {
        loadUser(session.user.id);
      } else {
        setUser(null);
        setIsReady(true);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;

      if (session?.user) {
        loadUser(session.user.id);
      } else {
        setUser(null);
        setIsReady(true);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase, loadUser]);

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.assign("/");
  }, [supabase]);

  return { user, isReady, signOut };
}
