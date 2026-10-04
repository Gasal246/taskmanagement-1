"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import SessionRecovery from "@/components/shared/SessionRecovery";

const AuthProvider = ({ children, session }: any) => {
  return <SessionProvider session={session}><SessionRecovery>{children}</SessionRecovery></SessionProvider>;
};

export default AuthProvider;
