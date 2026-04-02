"use client";

import { loadUserInfo } from "@/redux/slices/application";
import { loadBusinessData, loadCurrentUser, loadUserRole } from "@/redux/slices/userdata";
import type { RootState } from "@/redux/store";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import Cookies from "js-cookie";

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
        const response = await fetch(`/api/business/get-id/${businessId}`);
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
