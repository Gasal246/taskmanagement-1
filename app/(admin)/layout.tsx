import { auth } from "@/auth";
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminTopbar from '@/components/admin/AdminTopbar'
import { Metadata } from 'next';
import React from 'react'
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: "Taskmanager | Admin",
  description: "A site by Wideline IT solutions, Designed to simplify task and staff management in a business environment. Built with ease of use in mind, it allows teams to seamlessly assign, track, and complete tasks while keeping all staff data organized in one central hub. Each employee has a unique profile showcasing their roles, task history, and performance metrics. Managers can monitor task progress, set priorities, and identify bottlenecks at a glance.",
};

const AdminLayout = async ({ children }: {
  children: React.ReactNode
}) => {
  const session: any = await auth()
  if (!session) {
    return redirect('/signin')
  }

  const layoutStyle = process.env.LAYOUT_STYLE ?? process.env.NEXT_PUBLIC_LAYOUT_STYLE ?? "modern";
  const useClassicLayout = layoutStyle === "classic";

  if (useClassicLayout) {
    return (
      <div className='w-full h-screen overflow-y-hidden'>
        <AdminTopbar variant="classic" />
        <div className="flex mt-16 fixed w-full h-[calc(100vh-4rem)]">
          <div className="w-2/12"><AdminSidebar variant="classic" /></div>
          <div className="w-10/12 overflow-x-hidden overflow-y-scroll scroll-smooth">{children}</div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="relative h-[100dvh] w-full overflow-hidden text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 right-[-10%] h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-[-15%] h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.08),_transparent_45%)]" />
      </div>
      <div className="relative z-10 grid h-[100dvh] min-h-0 grid-cols-1 md:grid-cols-[220px_1fr] lg:grid-cols-[260px_1fr]">
        <aside className="border-b border-slate-800/60 bg-slate-950/70 backdrop-blur md:border-b-0 md:border-r">
          <div className="px-4 pt-5 pb-3 text-[10px] uppercase tracking-[0.35em] text-slate-500">
            Admin Workspace
          </div>
          <div className="overflow-y-auto px-2 pb-6 md:h-[calc(100dvh-3.25rem)]">
            <AdminSidebar />
          </div>
        </aside>
        <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden">
          <div className="sticky top-0 z-20 border-b border-slate-800/60 bg-slate-950/70 backdrop-blur">
            <AdminTopbar />
          </div>
          <main className="flex-1 min-h-0 overflow-y-auto px-4 pb-10 pt-4 md:px-6">
            <div className="mx-auto w-full max-w-[1400px]">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default AdminLayout
