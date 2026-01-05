/* eslint-disable react-hooks/exhaustive-deps */
"use client"
import LoaderSpin from "@/components/shared/LoaderSpin";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "antd";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Cookies from "js-cookie";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/redux/store";
import { loadCurrentUser, loadUserRole } from "@/redux/slices/userdata";
import { useGetUserByUserId } from "@/query/user/queries";
import { resolveSessionUserId } from "@/lib/utils";

export default function Home() {
  const { data: session, status } = useSession();
  const dispatch = useDispatch<AppDispatch>();
  const { mutateAsync: getUserById } = useGetUserByUserId();
  const router = useRouter();

  const findUserData = async (userid: string) => {
    const userData = await getUserById(userid);
    console.log("Fetched User: ", userData);
    dispatch(loadCurrentUser(userData));
  }

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.replace('/signin');
      return;
    };
    if (session?.user?.is_super) {
      router.replace('/superadmin');
      return;
    }

    const userId = resolveSessionUserId(session);
    if (!userId) {
      router.replace('/signin');
      return;
    }
    findUserData(userId);
    if(Cookies.get('user_role')) {
      const userRole = JSON.parse(Cookies.get('user_role') || '');
      dispatch(loadUserRole(userRole));
      const userDomain = Cookies.get('user_domain') ? JSON.parse(Cookies.get('user_domain') || '') : null;
      if(userDomain){
        if(userRole?.role_name == 'BUSINESS_ADMIN') {
          router.replace('/admin');
          return;
        }
        router.replace('/staff');
        return;
      } else {
        Cookies.remove('user_role');
        router.replace('/select-roles');
        return;
      }
    } else {
      Cookies.remove('user_role');
      router.replace('/select-roles');
      return;
    }
  }, [session, status, router]);

  return (
    <main className="flex h-screen flex-col items-center justify-center p-24">
      <div className="flex flex-wrap items-start gap-1">
        <h1 className="text-[3em] font-black">TaskManager</h1>
        <Tooltip title="we are currently on our development stage, so please report any issues ASAP you face them. 😁"><Badge>Dev</Badge></Tooltip>
      </div>
      <h1 className="flex gap-1 items-center">Loading User Interfaces.. ( kindly reload if you not automatically routed ) <LoaderSpin size={40} /></h1>
    </main>
  );
}
