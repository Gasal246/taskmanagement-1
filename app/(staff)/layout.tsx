import { auth } from "@/auth";
import React from 'react'
import { redirect } from 'next/navigation';
//import axiosInstance from '@/query/server/axiosInstace';
import StaffSidebar from '@/components/staff/Sidebar';
import StaffTopbar from '@/components/staff/Topbar';
import MobileBottomBar from '@/components/staff/MobileBottomBar';

// export const generateMetadata = async () => {
//   const session: any = await auth()
//   const res = await axiosInstance.get(`/api/users/get-id/${session?.user?.id}`);
//   return {
//     title: `TM | ${res?.data?.Name}`
//   }
// }

const AdminLayout = async ({ children }: {
  children: React.ReactNode
}) => {
  const session = await auth()
  if (!session) {
    return redirect('/signin')
  }

  const layoutStyle = process.env.LAYOUT_STYLE ?? process.env.NEXT_PUBLIC_LAYOUT_STYLE ?? "modern";
  const useClassicLayout = layoutStyle === "classic";

  if (useClassicLayout) {
    return (
      <div className='w-full h-[100dvh] overflow-hidden flex relative'>
        <div className="hidden lg:block w-2/12 h-full border-r border-slate-700">
          <StaffSidebar variant="classic" />
        </div>
        <div className="w-full lg:w-10/12 h-full overflow-y-scroll overflow-x-hidden pb-20">
          <StaffTopbar variant="classic" />
          {children}
        </div>
        <div className="block lg:hidden w-full absolute bottom-0 p-0">
          <MobileBottomBar variant="classic" />
          {/* <div className="bg-black p-20 w-full"></div> */}
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 left-[-15%] h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-[-10%] h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.08),_transparent_45%)]" />
      </div>
      <div className="relative z-10 flex h-[100dvh] min-h-0 flex-col overflow-hidden lg:flex-row">
        <aside className="hidden w-[240px] border-r border-slate-800/60 bg-slate-950/70 backdrop-blur lg:flex">
          <div className="w-full px-2 pb-6 pt-5">
            <StaffSidebar />
          </div>
        </aside>
        <div className="flex h-[100dvh] min-h-0 flex-1 flex-col overflow-hidden">
          <div className="sticky top-0 z-20 border-b border-slate-800/60 bg-slate-950/70 backdrop-blur">
            <StaffTopbar />
          </div>
          <main className="flex-1 min-h-0 overflow-y-auto px-4 pb-24 pt-4 md:px-6">
            <div className="mx-auto w-full max-w-[1200px]">
              {children}
            </div>
          </main>
        </div>
        <div className="fixed bottom-4 left-1/2 z-30 w-[calc(100%-2rem)] -translate-x-1/2 lg:hidden">
          <MobileBottomBar />
        </div>
      </div>
    </div>
  )
}

export default AdminLayout
