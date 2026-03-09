import { auth } from "@/auth";
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminTopbar from '@/components/admin/AdminTopbar'
import AdminLayoutShell from "@/components/admin/AdminLayoutShell";
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
  
  return <AdminLayoutShell>{children}</AdminLayoutShell>
}

export default AdminLayout
