"use client"
import { AreaChart, BellElectric, Contact, Globe2, LandPlot } from 'lucide-react';
import { useSession } from 'next-auth/react';
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation';
import { useGetUserDetails } from '@/query/business/queries';
import Cookies from 'js-cookie';
import { toast } from 'sonner';

const StaffHome = () => {
  const router = useRouter();
  const { data: session }: any = useSession();
  const { mutateAsync: GetuserData, isPending: userLoading } = useGetUserDetails();
  const [region, setRegion] = useState("");
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState("");
  const [area, setArea] = useState("");
  const [username, setUserName] = useState("");
  const [userData, setUserData] = useState<any>(null);
  // const { data: taskAnalytics, isLoading: loadingTaskAnalytics } = useGetAllTaskAnalytics(session?.user?.id);
  // const { data: projectAnalytics, isLoading: loadingProjectAnalytics } = useGetAllProjectAnalytics(session?.user?.id, 'all');

  // useEffect(() => {
  //   if(taskAnalytics || projectAnalytics){
  //     console.log(taskAnalytics);
  //     console.log(projectAnalytics);
  //   }
  // }, [taskAnalytics, projectAnalytics])
 

  useEffect(()=> {
    readCookies()
  }, []);

  const readCookies = async() => {
    try{
      const cookieData = Cookies.get("user_domain");
      const userRoleCookie = Cookies.get("user_role");
      if(!cookieData){
        return toast.error("Cookies not found...");
      }
      if(!userRoleCookie){
        return toast.error("Role Cookies not found...");
      }
      const jsonData = JSON.parse(cookieData);
      const roleData = JSON.parse(userRoleCookie);

      let org_id:string = "";
      console.log("user_role: ", roleData?.role_name);
      
      switch(roleData?.role_name){
        case "REGION_HEAD":
          org_id = jsonData?.region_id;
          break;
        case "REGION_STAFF":
          org_id = jsonData?.region_id;
          break;
        case "AREA_HEAD":
          org_id = jsonData?.area_id;
          break;
        case "AREA_STAFF":
          org_id = jsonData?.area_id;
          break;
        case "LOCATION_HEAD":
          org_id = jsonData?.location_id;
          break;
        case "LOCATION_STAFF":
          org_id = jsonData?.location_id;
          break;
        case "REGION_DEP_HEAD":
          org_id = jsonData?.department_id;
          break;
        case "REGION_DEP_STAFF":
          org_id = jsonData?.department_id;
          break;
        case "AREA_DEP_HEAD":
          org_id = jsonData?.department_id;
          break;
        case "AREA_DEP_STAFF":
          org_id = jsonData?.department_id;
          break;
        case "LOCATION_DEP_HEAD":
          org_id = jsonData?.department_id;
          break;
        case "LOCATION_DEP_STAFF":
          org_id = jsonData?.department_id;
          break;
      }
      console.log("org_id: ", org_id);
      
      const role_id = roleData?._id;
      const res = await GetuserData({role_id, org_id});
      console.log("res: ", res);
      if(res?.status != 200){
        return toast.error(res?.message || "Couldn't fetch user data");
      }
      setUserData(res?.data);
      
    }catch(err){
      console.log("error while reading cookies: ", err);
      return toast.error("error while reading cookies");
    }
  }

  return (
    <div className='p-4'>
      <div className="flex justify-between p-3 bg-slate-950/50 rounded-lg mb-3 items-center flex-wrap">
        <h1>Hi, {userData?.user_name?.name}!</h1>
        <div className="flex gap-2 flex-wrap">
          <div className='border border-slate-700 rounded-lg p-1 px-2'>
            <h1 className='text-xs font-medium flex items-center gap-1'><BellElectric size={14} /> Department</h1>
            <h2 className='text-xs text-slate-300 text-center'>{userData?.dep_name ? userData?.dep_name : 'Not added to any department'}</h2>
          </div>
          <div className='border border-slate-700 rounded-lg p-1 px-2'>
            <h1 className='text-xs font-medium flex items-center gap-1'><Contact size={14} /> Role</h1>
            <h2 className='text-xs text-slate-300 capitalize text-center'>{userData?.role ? userData?.role : 'Staff'}</h2>
          </div>
          <div className='border border-slate-700 rounded-lg p-1 px-2'>
            <h1 className='text-xs font-medium flex items-center gap-1'><Globe2 size={14} /> Region</h1>
            <h2 className='text-xs text-slate-300 text-center'>{userData?.region_name ? userData?.region_name : 'No Region Added'}</h2>
          </div>
          <div className='border border-slate-700 rounded-lg p-1 px-2'>
            <h1 className='text-xs font-medium flex items-center gap-1'><LandPlot size={14} /> Area</h1>
            <h2 className='text-xs text-slate-300 text-center'>{userData?.area_name ? userData?.area_name : 'No Area Added'}</h2>
          </div>
        </div>
      </div>
      <div className="bg-slate-950/50 p-3 rounded-lg flex gap-1 justify-between mb-3 lg:flex-nowrap flex-wrap">
        <div onClick={() => router.push(`/staff/tasks`)} className="bg-slate-950/50 p-2 px-3 rounded-lg w-full lg:w-1/2 border hover:border-slate-700 border-slate-900 select-none cursor-pointer">
          <h1 className='text-sm font-medium mb-1'>Tasks</h1>
          <div className="flex gap-2">
            {/* <h1 className={`lg:w-32 text-xs font-semibold p-1 px-3 border ${taskAnalytics?.unreadedTasks > 0 ? 'border-slate-500 text-slate-300' : 'border-slate-700 text-slate-400'} rounded-lg`}>New: {taskAnalytics?.unreadedTasks}</h1>
            <h1 className={`lg:w-32 text-xs font-semibold p-1 px-3 border ${taskAnalytics?.acceptedTasks > 0 ? 'border-slate-500 text-slate-300' : 'border-slate-700 text-slate-400'} rounded-lg`}>Ongoing: {taskAnalytics?.acceptedTasks}</h1>
            <h1 className={`lg:w-32 text-xs font-semibold p-1 px-3 border ${taskAnalytics?.completedTasks > 0 ? 'border-slate-500 text-slate-300' : 'border-slate-700 text-slate-400'} rounded-lg`}>Completed: {taskAnalytics?.completedTasks}</h1> */}
          </div>
        </div>
        <div onClick={() => router.push(`/staff/projects`)} className="bg-slate-950/50 p-2 px-3 rounded-lg w-full lg:w-1/2 border hover:border-slate-700 border-slate-900 select-none cursor-pointer">
          <h1 className='text-sm font-medium mb-1'>Projects</h1>
          <div className="flex gap-2">
            {/* <h1 className={`lg:w-32 text-xs font-semibold p-1 px-3 border ${projectAnalytics?.unopendedProjects?.length > 0 ? 'border-slate-500 text-slate-300' : 'border-slate-700 text-slate-400'} rounded-lg`}>New: {projectAnalytics?.unopendedProjects?.length || 0}</h1>
            <h1 className={`lg:w-32 text-xs font-semibold p-1 px-3 border ${projectAnalytics?.approvedProjectIds?.length > 0 ? 'border-slate-500 text-slate-300' : 'border-slate-700 text-slate-400'} rounded-lg`}>Ongoing: {projectAnalytics?.approvedProjectIds?.length || 0}</h1>
            <h1 className={`lg:w-32 text-xs font-semibold p-1 px-3 border ${projectAnalytics?.completedProjectIds?.length > 0 ? 'border-slate-500 text-slate-300' : 'border-slate-700 text-slate-400'} rounded-lg`}>Completed: {projectAnalytics?.completedProjectIds?.length || 0}</h1> */}
          </div>
        </div>
      </div>
      <div className='w-full mt-3 bg-slate-950/50 p-3 pb-5 rounded-lg'>
        <h1 className='text-sm font-medium gap-1 items-center flex text-cyan-500 mb-2'><AreaChart size={18} /> Analytics</h1>
          {/* {userData && <ProjectsCompletedAndPending currentUser={userData} />}
        <div className="grid lg:grid-cols-2 grid-cols-1 gap-2 w-full mt-2">
          {userData && <TaskAnalysis currentUser={userData} /> }
          {userData && <ProjectAnalysisPi currentUser={userData} /> }
          {userLoading && <Skeleton className='w-full h-[300px]' />}
        </div> */}
      </div>
    </div>
  )
}

export default StaffHome