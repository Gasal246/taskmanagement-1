"use client";

import { loadUserInfo, resetApplication } from "@/redux/slices/application";
import { loadBusinessData, loadCurrentUser, loadUserRole, resetUserData } from "@/redux/slices/userdata";
import type { RootState } from "@/redux/store";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import Cookies from "js-cookie";
import { useQueryClient } from "@tanstack/react-query";
import { clearClientAuthCleanup } from "@/lib/client-auth-cleanup";

type CookieRecord = Record<string, any> | null;

const parseCookie = (name: string): CookieRecord => {
  const value = Cookies.get(name);
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const resolveBusinessId = (domainCookie: CookieRecord) => {
  if (!domainCookie) return "";

  return (
    domainCookie.business_id ||
    domainCookie.value ||
    domainCookie._id ||
    ""
  );
};

const AppBootstrap = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const previousUser = useRef<string | null>(null);
  const { data: session, status } = useSession();
  const { businessData } = useSelector((state: RootState) => state.user);
  const { user_info } = useSelector((state: RootState) => state.application);
  const fetchedBusinessIdRef = useRef<string | null>(null);
  const fetchedUserIdRef = useRef<string | null>(null);

  const roleCookie = useMemo(() => parseCookie("user_role"), []);
  const domainCookie = useMemo(() => parseCookie("user_domain"), []);
  const businessId = resolveBusinessId(domainCookie);
  const roleLabel = roleCookie?.role_name || roleCookie?.role || "";

  useEffect(() => {
    if (status === "loading") return;
    const userId = session?.user?.id || null;
    if (previousUser.current && previousUser.current !== userId) {
      queryClient.clear();
      dispatch(resetApplication());
      dispatch(resetUserData());
      fetchedBusinessIdRef.current = null;
      fetchedUserIdRef.current = null;
      void clearClientAuthCleanup();
    }
    previousUser.current = userId;
  }, [dispatch, queryClient, session?.user?.id, status]);

  useEffect(() => {
    dispatch(loadUserRole(roleCookie));
  }, [dispatch, roleCookie]);

  useEffect(() => {
    if (session?.user) {
      dispatch(loadCurrentUser(session.user));
      return;
    }

    if (status === "unauthenticated") {
      dispatch(loadCurrentUser(null));
      dispatch(loadUserInfo(null));
    }
  }, [dispatch, session?.user, status]);

  useEffect(() => {
    if (status !== "authenticated" || !businessId || businessData?._id === businessId) {
      return;
    }

    if (fetchedBusinessIdRef.current === businessId) {
      return;
    }

    fetchedBusinessIdRef.current = businessId;
    let active = true;

    const fetchBusinessData = async () => {
      try {
        const response = await fetch(`/api/business/get-id/${businessId}?summary=true`);
        if (!response.ok) return;
        const payload = await response.json();
        if (active && payload?.data?.info) {
          dispatch(loadBusinessData(payload.data.info));
        }
      } catch (error) {
        console.error("Failed to bootstrap business data", error);
      }
    };

    fetchBusinessData();

    return () => {
      active = false;
    };
  }, [businessData?._id, businessId, dispatch, status]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (status !== "authenticated" || !userId || user_info?._id === userId) {
      return;
    }

    if (fetchedUserIdRef.current === userId) {
      return;
    }

    fetchedUserIdRef.current = userId;
    let active = true;

    const fetchUserData = async () => {
      try {
        const response = await fetch("/api/users/get-user/id-with-meta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId, roleLabel }),
        });
        if (!response.ok) return;
        const payload = await response.json();
        if (active) {
          dispatch(loadUserInfo(payload || null));
        }
      } catch (error) {
        console.error("Failed to bootstrap user data", error);
      }
    };

    fetchUserData();

    return () => {
      active = false;
    };
  }, [dispatch, roleLabel, session?.user?.id, status, user_info?._id]);

  return null;
};

export default AppBootstrap;
