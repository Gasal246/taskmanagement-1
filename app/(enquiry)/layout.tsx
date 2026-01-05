import { auth } from "@/auth";
import React, { useEffect } from 'react'
import { redirect } from 'next/navigation';

import EnquiriesSidebar from '@/components/enquiries/EnquiriesSidebar';
import EnquiriesTopbar from '@/components/enquiries/EnquiriesTopbar';
import EnquiryMobileBottomBar from '@/components/enquiries/EnquiryMobileBottomBar';
import { cookies } from "next/headers";

const EnquiryLayout = async ({ children }: { children: React.ReactNode }) => {

  const session = await auth();
  if (!session) return redirect("/signin");

  const cookieStore = await Promise.resolve(cookies());
  const role = cookieStore.get("user_role")?.value;

  if (!role) redirect("/signin");

  return (
    <div className="w-full h-[100dvh] overflow-hidden flex relative">

      {/* LEFT SIDEBAR (Desktop only) */}
      <div className="hidden lg:block w-2/12 h-full border-r border-slate-700 bg-gradient-to-tr from-slate-950/50 to-slate-900/50">
        <EnquiriesSidebar />
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="w-full lg:w-10/12 h-full overflow-y-scroll overflow-x-hidden pb-20">
        <EnquiriesTopbar />
        {children}
      </div>

      {/* MOBILE BOTTOM BAR */}
      <div className="block lg:hidden w-full absolute bottom-0 p-0">
        <EnquiryMobileBottomBar />
      </div>

    </div>
  );
};

export default EnquiryLayout;
