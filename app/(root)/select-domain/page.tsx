"use client";

import * as React from "react";
import Cookies from "js-cookie";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";

import LoaderSpin from "@/components/shared/LoaderSpin";
import RestartLoginButton from "@/components/shared/RestartLoginButton";
import { Button } from "@/components/ui/button";
import { resolveSessionUserId } from "@/lib/utils";
import { useGetUserDomainByRole } from "@/query/user/queries";
import { loadBusinessData } from "@/redux/slices/userdata";
import { AppDispatch } from "@/redux/store";

type RoleCookie = {
  role_name?: string;
  [key: string]: unknown;
};

type DomainOption = {
  value: string;
  name?: string;
  region_name?: string;
  area_name?: string;
  location_name?: string;
  dept_name?: string;
  business_id?: string;
  [key: string]: unknown;
};

type BusinessOption = {
  _id?: string;
  [key: string]: unknown;
};

const SelectDomainPage = () => {
  const { data: session, status } = useSession();
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();

  const [selectedDomain, setSelectedDomain] = React.useState("");
  const [domains, setDomains] = React.useState<DomainOption[]>([]);
  const [businessData, setBusinessData] = React.useState<BusinessOption[]>([]);
  const [isFetchingDomains, setIsFetchingDomains] = React.useState(false);
  const [isContinuing, setIsContinuing] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");

  const { mutateAsync: fetchDomains, isPending: domainsLoading } = useGetUserDomainByRole();

  const getRoleFromCookie = React.useCallback((): RoleCookie | null => {
    const roleCookie = Cookies.get("user_role");
    if (!roleCookie) return null;

    try {
      const parsed = JSON.parse(roleCookie);
      if (!parsed || typeof parsed !== "object") return null;
      return parsed as RoleCookie;
    } catch {
      return null;
    }
  }, []);

  const getDomainLabel = React.useCallback((domain: DomainOption): string => {
    return (
      domain?.region_name ||
      domain?.area_name ||
      domain?.location_name ||
      domain?.dept_name ||
      domain?.name ||
      "Unknown domain"
    );
  }, []);

  const handleFetchDomains = React.useCallback(async () => {
    setIsFetchingDomains(true);
    setErrorMessage("");

    try {
      const roleFromCookie = getRoleFromCookie();
      const roleName = roleFromCookie?.role_name;

      if (!roleName) {
        Cookies.remove("user_role");
        router.replace("/select-roles");
        return;
      }

      const userId = resolveSessionUserId(session);
      if (!userId) {
        router.replace("/signin");
        return;
      }

      const data: any = await fetchDomains({ userid: userId, role: roleName });

      if (roleName === "BUSINESS_ADMIN") {
        const businesses = Array.isArray(data?.businesses) ? data.businesses : [];

        const nextBusinessData: BusinessOption[] = businesses
          .map((business: any) => business?.business_id)
          .filter(Boolean);

        const nextDomains: DomainOption[] = businesses
          .map((business: any) => {
            const businessId = business?.business_id?._id;
            if (!businessId) return null;

            return {
              value: String(businessId),
              name: business?.business_id?.business_name,
            };
          })
          .filter(Boolean) as DomainOption[];

        setBusinessData(nextBusinessData);
        setDomains(nextDomains);
        setSelectedDomain((prev) =>
          prev && nextDomains.some((domain) => domain.value === prev) ? prev : ""
        );

        return;
      }

      const returnData = Array.isArray(data?.returnData) ? data.returnData : [];

      const nextDomains: DomainOption[] = returnData
        .map((domain: any) => {
          const value = domain?.value ?? domain?.business_id;
          if (!value) return null;

          return {
            ...domain,
            value: String(value),
          };
        })
        .filter(Boolean) as DomainOption[];

      const nextBusinessData: BusinessOption[] = returnData
        .map((domain: any) => ({ _id: String(domain?.business_id || "") }))
        .filter((business: BusinessOption) => Boolean(business?._id));

      setBusinessData(nextBusinessData);
      setDomains(nextDomains);
      setSelectedDomain((prev) =>
        prev && nextDomains.some((domain) => domain.value === prev) ? prev : ""
      );
    } catch {
      setDomains([]);
      setBusinessData([]);
      setSelectedDomain("");
      setErrorMessage("We could not load your domains right now. Please try again.");
    } finally {
      setIsFetchingDomains(false);
    }
  }, [fetchDomains, getRoleFromCookie, router, session]);

  React.useEffect(() => {
    if (status === "loading") return;

    const userId = resolveSessionUserId(session);
    if (!userId) {
      router.replace("/signin");
      return;
    }

    void handleFetchDomains();
  }, [handleFetchDomains, router, session, status]);

  const handleContinueWithDomain = async () => {
    if (!selectedDomain) return;

    setIsContinuing(true);

    try {
      const roleFromCookie = getRoleFromCookie();
      const roleName = roleFromCookie?.role_name;

      if (!roleName) {
        Cookies.remove("user_role");
        router.replace("/select-roles");
        return;
      }

      const selected = domains.find((domain) => domain?.value === selectedDomain);
      if (!selected) return;

      Cookies.set("user_domain", JSON.stringify(selected), { sameSite: "lax" });

      const selectedBusiness =
        businessData.find((business) => business?._id === selectedDomain) || {
          _id: String(selected?.business_id || selected?.value || ""),
        };
      dispatch(loadBusinessData(selectedBusiness));

      if (roleName === "BUSINESS_ADMIN") {
        router.push("/admin");
        return;
      }

      router.push("/staff");
    } finally {
      setIsContinuing(false);
    }
  };

  const showLoadingState = isFetchingDomains || domainsLoading;

  return (
    <div className="min-h-screen w-full px-4 py-6 sm:p-6 flex items-center justify-center">
      <div className="w-full max-w-3xl space-y-3">
        <div className="rounded-xl border border-slate-800 bg-gradient-to-tr from-slate-950/70 to-slate-900/60 p-5">
          <h1 className="text-2xl font-semibold">Choose your domain</h1>
          <p className="mt-1 text-sm text-slate-300">
            Select where you want to work today. We will open the right dashboard for you.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-gradient-to-tr from-slate-950/60 to-slate-900/50 p-3 sm:p-4 max-h-[58dvh] overflow-y-auto space-y-2">
          {showLoadingState && (
            <div className="min-h-[160px] flex items-center justify-center gap-3 text-slate-300">
              <LoaderSpin size={28} />
              <span className="text-sm">Loading your domains...</span>
            </div>
          )}

          {!showLoadingState && errorMessage && (
            <div className="rounded-lg border border-amber-800/70 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
              {errorMessage}
            </div>
          )}

          {!showLoadingState && !errorMessage && domains.length === 0 && (
            <div className="rounded-lg border border-slate-700 bg-slate-900/40 px-4 py-6 text-sm text-slate-300">
              No domains are available for this role right now.
            </div>
          )}

          {!showLoadingState &&
            !errorMessage &&
            domains.map((domain) => {
              const isSelected = selectedDomain === domain?.value;

              return (
                <motion.button
                  key={domain?.value}
                  type="button"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setSelectedDomain(domain?.value)}
                  className={`w-full rounded-lg border p-4 text-left transition-colors ${
                    isSelected
                      ? "border-cyan-700/80 bg-cyan-950/30"
                      : "border-slate-700/70 bg-slate-900/45 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-base font-semibold">{getDomainLabel(domain)}</h2>
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
                    Continue with this domain to open the most relevant workspace.
                  </p>
                </motion.button>
              );
            })}
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleContinueWithDomain}
            disabled={!selectedDomain || showLoadingState || isContinuing}
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

export default SelectDomainPage;
