import { getServerSession } from 'next-auth';
import React from 'react'
import { authOptions } from '../api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
//import axiosInstance from '@/query/server/axiosInstace';
import StaffSidebar from '@/components/staff/Sidebar';
import StaffTopbar from '@/components/staff/Topbar';
import MobileBottomBar from '@/components/staff/MobileBottomBar';

// export const generateMetadata = async () => {
//   const session: any = await getServerSession(authOptions)
//   const res = await axiosInstance.get(`/api/users/get-id/${session?.user?.id}`);
//   return {
//     title: `TM | ${res?.data?.Name}`
//   }
// }

const AdminLayout = async ({ children }: {
  children: React.ReactNode
}) => {
  const session = await getServerSession(authOptions)
  if (!session) {
    return redirect('/signin')
  }

  return (
    <div className='w-full h-[100dvh] overflow-hidden flex relative'>
      <div className="hidden lg:block w-2/12 h-full border-r border-slate-700">
        <StaffSidebar />
      </div>
      <div className="w-full lg:w-10/12 h-full overflow-y-scroll overflow-x-hidden pb-20">
        <StaffTopbar />
        {children}
      </div>
      <div className="block lg:hidden w-full absolute bottom-0 p-0">
        <MobileBottomBar />
        {/* <div className="bg-black p-20 w-full"></div> */}
      </div>
    </div>
  )
}

export default AdminLayout