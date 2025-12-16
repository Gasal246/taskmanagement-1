/* eslint-disable react-hooks/exhaustive-deps */
"use client"
import LoaderSpin from "@/components/shared/LoaderSpin";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "antd";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect } from "react";
import Cookies from "js-cookie";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/redux/store";
import { loadCurrentUser, loadUserRole } from "@/redux/slices/userdata";
import { useGetUserByUserId } from "@/query/user/queries";

export default function Home() {
  const session: any = useSession();
  const dispatch = useDispatch<AppDispatch>();
  const { mutateAsync: getUserById } = useGetUserByUserId();

  const findUserData = async (userid: string) => {
    const userData = await getUserById(userid);
    console.log("Fetched User: ", userData);
    dispatch(loadCurrentUser(userData));
  }

  useEffect(() => {
    if (!session?.data) {
      redirect('/signin');
    };
    if (session?.data) {
      if (session?.data?.user?.is_super) {
        redirect('/superadmin');
      } else {
        findUserData(session?.data?.user?.id);
        if(Cookies.get('user_role')) {
          const userRole = JSON.parse(Cookies.get('user_role') || '');
          dispatch(loadUserRole(userRole));
          const userDomain = Cookies.get('user_domain') ? JSON.parse(Cookies.get('user_domain') || '') : null;
          if(userDomain){
            if(userRole?.role_name == 'BUSINESS_ADMIN') {
              redirect('/admin');
              return;
            }
            redirect('/staff');
            return;
          } else {
            Cookies.remove('user_role');
            redirect('/select-roles');
            return;
          }
        } else {
          Cookies.remove('user_role');
          redirect('/select-roles');
          return;
        }
      }
    }
  }, [session]);

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
