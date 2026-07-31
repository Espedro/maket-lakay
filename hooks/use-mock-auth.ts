"use client";

import * as React from "react";

import { toast } from "@/hooks/use-toast";
import {
  defaultMockSession,
  getMockSessionUser,
  getMockUsers,
  getRoleLabel,
  MOCK_SESSION_EVENT,
  MOCK_SESSION_KEY,
  type MockRole,
  type MockSession,
} from "@/lib/mock-auth";
import { readLocalJson, writeLocalJson } from "@/lib/local-storage";

function readSession(): MockSession {
  return readLocalJson<MockSession>(MOCK_SESSION_KEY, defaultMockSession);
}

function writeSession(session: MockSession) {
  writeLocalJson(MOCK_SESSION_KEY, session, MOCK_SESSION_EVENT);
}

export function useMockAuth() {
  const [session, setSession] = React.useState<MockSession>(defaultMockSession);
  const [users, setUsers] = React.useState(getMockUsers);
  const [isReady, setIsReady] = React.useState(false);

  const refresh = React.useCallback(() => {
    const nextUsers = getMockUsers();
    const nextSession = readSession();
    const sessionUser = getMockSessionUser(nextSession, nextUsers);

    setUsers(nextUsers);
    setSession({ userId: sessionUser.id, role: sessionUser.role });
    setIsReady(true);
  }, []);

  React.useEffect(() => {
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener(MOCK_SESSION_EVENT, refresh);
    window.addEventListener("maket-lakay-admin-management-storage", refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(MOCK_SESSION_EVENT, refresh);
      window.removeEventListener("maket-lakay-admin-management-storage", refresh);
    };
  }, [refresh]);

  const currentUser = getMockSessionUser(session, users);
  const currentCustomerId =
    currentUser.customerId ?? (currentUser.role === "customer" ? currentUser.id : undefined);
  const currentStoreId = currentUser.storeId;
  const currentVendorId =
    currentUser.vendorId ?? (currentUser.role === "vendor" ? currentUser.id : undefined);

  const switchToUser = React.useCallback(
    (userId: string) => {
      const nextUsers = getMockUsers();
      const nextUser = nextUsers.find((user) => user.id === userId);

      if (!nextUser) return;

      writeSession({ userId: nextUser.id, role: nextUser.role });
      setSession({ userId: nextUser.id, role: nextUser.role });
      setUsers(nextUsers);
      toast({
        title: "Role switched",
        description: `You are now previewing as ${nextUser.name}.`,
      });
    },
    [],
  );

  const switchRole = React.useCallback(
    (role: MockRole) => {
      const nextUsers = getMockUsers();
      const nextUser = nextUsers.find((user) => user.role === role);

      if (!nextUser) return;

      writeSession({ userId: nextUser.id, role });
      setSession({ userId: nextUser.id, role });
      setUsers(nextUsers);
      toast({
        title: `${getRoleLabel(role)} preview active`,
        description: `Maket Lakay is now showing ${role} access locally.`,
      });
    },
    [],
  );

  const signOut = React.useCallback(() => {
    writeSession(defaultMockSession);
    setSession(defaultMockSession);
    toast({
      title: "Signed out locally",
      description: "Returned to the default customer preview.",
    });
  }, []);

  return {
    currentUser,
    currentCustomerId,
    currentStoreId,
    currentVendorId,
    isReady,
    session,
    signOut,
    switchRole,
    switchToUser,
    users,
  };
}
