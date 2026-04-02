"use client";

import * as React from "react";
import Cookies from "js-cookie";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import LoaderSpin from "@/components/shared/LoaderSpin";
import RestartLoginButton from "@/components/shared/RestartLoginButton";
import { Button } from "@/components/ui/button";
import { resolveSessionUserId } from "@/lib/utils";
import { getUserRolesAndDomains } from "@/query/user/function";

type UserRoleOption = {
  _id?: string;
  role_name?: string;
  [key: string]: unknown;
};

const SelectUserRole = () => {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [userRoles, setUserRoles] = React.useState<UserRoleOption[]>([]);
  const [selectedRole, setSelectedRole] = React.useState<UserRoleOption | null>(null);
  const [isLoadingRoles, setIsLoadingRoles] = React.useState(false);
  const [isContinuing, setIsContinuing] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");

  const fetchUserRoles = React.useCallback(async (userId: string) => {
    setIsLoadingRoles(true);
    setErrorMessage("");

    try {
      const fetchedRoles = await getUserRolesAndDomains(userId);
      const normalizedRoles = Array.isArray(fetchedRoles) ? fetchedRoles : [];
      setUserRoles(normalizedRoles);
      setSelectedRole((prev) =>
        prev ? normalizedRoles.find((role) => role?.role_name === prev?.role_name) || null : null
      );
    } catch {
      setUserRoles([]);
      setSelectedRole(null);
      setErrorMessage("We could not load your roles right now. Please try again.");
    } finally {
      setIsLoadingRoles(false);
    }
  }, []);

  React.useEffect(() => {
    if (status === "loading") return;

    const userId = resolveSessionUserId(session);
    if (!userId) {
      router.replace("/signin");
      return;
    }

    void fetchUserRoles(userId);
  }, [fetchUserRoles, router, session, status]);

  const handleContinueWithRole = async () => {
    if (!selectedRole?.role_name) return;

    setIsContinuing(true);

    try {
      Cookies.set("user_role", JSON.stringify(selectedRole), { sameSite: "lax" });

      if (selectedRole.role_name === "AGENT") {
        router.push("/enquiry");
        return;
      }

      router.push("/select-domain");
    } finally {
      setIsContinuing(false);
    }
  };

  return (
    <div className="min-h-screen w-full px-4 py-6 sm:p-6 flex items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full max-w-3xl space-y-3">
        <div className="rounded-xl border border-slate-800 bg-gradient-to-tr from-slate-950/70 to-slate-900/60 p-5">
          <h1 className="text-2xl font-semibold">Choose your role</h1>
          <p className="mt-1 text-sm text-slate-300">
            Pick the role you want to continue with. You can switch later by restarting login.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-gradient-to-tr from-slate-950/60 to-slate-900/50 p-3 sm:p-4 max-h-[58dvh] overflow-y-auto space-y-2">
          {isLoadingRoles && (
            <div className="min-h-[160px] flex items-center justify-center gap-3 text-slate-300">
              <LoaderSpin size={28} />
              <span className="text-sm">Loading your roles...</span>
            </div>
          )}

          {!isLoadingRoles && errorMessage && (
            <div className="rounded-lg border border-amber-800/70 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
              {errorMessage}
            </div>
          )}

          {!isLoadingRoles && !errorMessage && userRoles.length === 0 && (
            <div className="rounded-lg border border-slate-700 bg-slate-900/40 px-4 py-6 text-sm text-slate-300">
              No active roles were found for your account.
            </div>
          )}

          {!isLoadingRoles &&
            !errorMessage &&
            userRoles.map((role) => {
              const roleName = role?.role_name || "Unknown role";
              const isSelected = selectedRole?.role_name === role?.role_name;

              return (
                <motion.button
                  key={role?._id || roleName}
                  type="button"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setSelectedRole(role)}
                  className={`w-full rounded-lg border p-4 text-left transition-colors ${
                    isSelected
                      ? "border-cyan-700/80 bg-cyan-950/30"
                      : "border-slate-700/70 bg-slate-900/45 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-base font-semibold">{roleName}</h2>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs ${
                        isSelected
                          ? "bg-cyan-900/80 text-cyan-100"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {isSelected ? "Selected" : "Select"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Continue with this role to access the right workspace quickly.
                  </p>
                </motion.button>
              );
            })}
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleContinueWithRole}
            disabled={!selectedRole || isLoadingRoles || isContinuing}
            className="min-w-[220px]"
          >
            {isContinuing ? "Continuing..." : "Continue"}
          </Button>
        </div>
      </div>

      <RestartLoginButton />
    </div>
  );
};

export default SelectUserRole;
