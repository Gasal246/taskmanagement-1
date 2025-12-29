"use client"
import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select"
import { useRouter } from 'next/navigation';
import { CalendarPlus, PanelsTopLeft } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { DatePicker, Space } from 'antd';
import { Button } from '@/components/ui/button';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { useSession } from 'next-auth/react';
import { useGetBusinessClients, useGetBusinessRegions, useGetProjects, useGetRegionComplete } from '@/query/business/queries';
import { DEPARTMENT_TYPES } from '@/lib/constants';
import LoaderSpin from '@/components/shared/LoaderSpin';
const { RangePicker } = DatePicker;

const projectSections = [
  { value: 'all', label: 'All Projects' },
  { value: 'current', label: 'Current Projects' },
  { value: 'previous', label: 'Previous Projects' },
  { value: 'waiting', label: 'Waiting For Approval' },
  
]

const domainWise = [
  { value: 'client', label: 'Client Wise' },
  { value: 'region', label: 'Region Wise' },
  {value: 'department', label: 'Department Type Wise'}
]

const ProjectsPage = () => {
  const router = useRouter();
  const { mutateAsync: getRegions, isPending: loadingRegions } = useGetBusinessRegions();
  const { mutateAsync: getBusinessClients, isPending: loadingBusinessClients } = useGetBusinessClients();
  const { mutateAsync: fetchCompleteRegion, isPending: loadingCompleteRegion } = useGetRegionComplete();
  const { data: session }: any = useSession();
  const [selectedSection, setSelectedSection] = useState('waiting');
  const [selectedDomainWise, setSelectedDomainWise] = useState('');
  const [selectedDomainId, setSelectedDomainId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [canAdd, setCanAdd] = useState(false);
  const { businessData } = useSelector((state: RootState) => state.user);
  const [domains, setDomains] = useState<any[]>([]);
  const [isRegion, setIsRegion] = useState<boolean>(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [filters, setFilters] = useState<Record<string, string | undefined>>({});
  const {data: projects, isLoading, refetch} = useGetProjects(filters);

  const handleDateChange = (dates: any, dateStrings: any) => {
    setStartDate(dateStrings[0]);
    setEndDate(dateStrings[1]);
  };

  useEffect(() => {
    setFilters({business_id: businessData?._id, section: selectedSection});
    refetch();
  }, []);

  const handleClearAll = () => {
    setStartDate('');
    setEndDate('');
    setSelectedSection('');
    setSelectedDomainWise('');
    setSelectedDomainId('');
    setFilters({business_id: businessData?._id});
  }

  const handleDomainWiseChange = async(value: string) => {
    setSelectedDomainWise(value);
    
    switch(value){
      case 'region':
        if(businessData?._id){
          const res:any = await getRegions({business_id:businessData?._id})
            if(res?.status == 200){
              setDomains(res?.data);
            }
        }
        break;
      case 'client':
        setIsRegion(false);
        if(businessData?._id){
          const res:any = await getBusinessClients(businessData?._id)
            if(res?.status == 200){
              console.log(res?.data);
              setDomains(res?.data);
              
            }
        }
        break;
      case 'department':
        setIsRegion(false);
        setDomains(DEPARTMENT_TYPES);
    }
  }

  const handleDomainChange = async(value:string) => {
    setSelectedDomainId(value);
    
    if(selectedDomainWise == 'region'){
      setIsRegion(true);
      const res:any = await fetchCompleteRegion(value);
      if(res?.status == 200){
        console.log(res?.data);
        
        setDepartments(res?.data?.departments || []);
        setAreas(res?.data?.areas || []);
    } else {
      //add the client id to the filter
      setIsRegion(false);
    }
  }
}

  useEffect(()=>{
    if(businessData){
      setCanAdd(businessData?.admins?.some((x:any) => x.user_id == session?.user?.id));

    }
  }, [])

  const handleSearchProjects = async() => {
    try{
      setFilters({
      business_id: businessData?._id,
      section: selectedSection,
      domainWise: selectedDomainWise,
      domainId: selectedDomainId,
      department: selectedDomainWise === "region" ? selectedDepartment : "",
      area: selectedDomainWise === "region" ? selectedArea : "",
      startDate,
      endDate,
    });

    //refetch(); 
    //console.log("Filters applied:", projects);
    
    } catch(err){
      console.log(err);
    }
}

useEffect(() => {
  console.log("Projects data updated:", projects);
}, [projects]);
  

  // get business - regions, departments, areas, regions and clients, according to selected domain wise.

  return (
    <div className='p-4 pb-20'>
      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg mb-2 flex justify-between items-center">
        <h1 className='font-semibold text-sm text-slate-300 flex items-center gap-1'><PanelsTopLeft size={16} /> Business Projects</h1>
        {canAdd && <Button className='flex items-center gap-1' onClick={() => router.push('/admin/projects/add')} >Add Project <CalendarPlus size={16} /></Button> }
      <Button className='flex items-center gap-1' onClick={() => router.push('/admin/projects/add')} >Add Project <CalendarPlus size={16} /></Button>
        {startDate && endDate && (
          <div className="flex items-center gap-2">
            <p className="text-xs text-slate-400">From: {startDate}</p>
            <p className="text-xs text-slate-400">To: {endDate}</p>
          </div>
        )}
      </div>
      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg min-h-[13vh] mb-2">
        <h1 className='font-semibold text-xs text-slate-400 px-2'>Project Filtrations</h1>
        <div className='flex flex-wrap'>
          <div className="w-full lg:w-4/12 p-1">
            <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50  rounded-lg">
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger className={`${selectedSection ? 'text-slate-200' : 'text-slate-400'}`}>
                  <SelectValue placeholder="Select Projects"/>
                </SelectTrigger>
                <SelectContent>
                  {projectSections.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="w-full lg:w-4/12 p-1">
            <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50  rounded-lg">
              <Select value={selectedDomainWise} onValueChange={handleDomainWiseChange}>
                <SelectTrigger className={`${selectedDomainWise ? 'text-slate-200' : 'text-slate-400'}`}>
                  <SelectValue placeholder="Select Domain Wise" />
                </SelectTrigger>
                <SelectContent>
                  {domainWise.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="w-full lg:w-4/12 p-1">
            <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg">
              <Select value={selectedDomainId} onValueChange={handleDomainChange}>
                <SelectTrigger className={`${selectedDomainId ? 'text-slate-200' : 'text-slate-400'}`}>
                  <SelectValue placeholder="Select Domain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {domains.map((item:any) => (
                    <SelectItem key={item._id || item.value} value={item._id || item.value}>
                      {item.client_name || item.region_name || item.label }
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isRegion && (
            <>
            <div className="w-full lg:w-4/12 p-1">
            <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg">
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className={`${selectedDomainId ? 'text-slate-200' : 'text-slate-400'}`}>
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {departments.map((item:any) => (
                    <SelectItem key={item._id} value={item._id}>
                      {item.dep_name }
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="w-full lg:w-4/12 p-1">
            <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg">
              <Select value={selectedArea} onValueChange={setSelectedArea}>
                <SelectTrigger className={`${selectedDomainId ? 'text-slate-200' : 'text-slate-400'}`}>
                  <SelectValue placeholder="Select Area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {areas.map((item:any) => (
                    <SelectItem key={item._id} value={item._id}>
                      {item.area_name }
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
            </>

          
          )}
          <div className="w-full lg:w-4/12 p-1">
            <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg p-0.5 px-1">
              <Label className='text-xs text-slate-400 px-2'>Within Period</Label>
              <Space direction="vertical" size={12} style={{ width: '100%', border: 0 }} className='placeholder:text-white'>
                <RangePicker onChange={handleDateChange} style={{ backgroundColor: '#1d293d', width: '100%', border: 0 }} className='text-white' />
              </Space>
            </div>
          </div>
          <div className="w-full lg:w-4/12 p-1 flex gap-2 justify-start items-end">
            <Button onClick={handleClearAll} variant='ghost' className='text-xs mt-6'>Clear All</Button>
            <Button onClick={handleSearchProjects} className='text-xs mt-6'>Apply / Search</Button>
          </div>
        </div>
      </div>
      <div className="bg-slate-900/50 p-4 rounded-xl shadow-sm min-h-[13vh]">
  <h1 className="font-semibold text-sm text-slate-300 flex items-center gap-2 mb-3">
    <PanelsTopLeft size={16} /> Business Projects
  </h1>

  {isLoading && (
    <div className="flex items-center justify-center w-full h-[15vh]">
              <LoaderSpin size={20} title="Loading Projects...." />
            </div>
  )}

  {projects?.length === 0 && !isLoading && (
    <p className="text-xs text-slate-500 italic">No projects found.</p>
  )}

  <div className="space-y-2">
    {projects?.map((proj: any) => (
      <div
        key={proj._id}
        className="p-3 border border-slate-700 rounded-lg hover:bg-slate-800/60 transition cursor-pointer"
        onClick={() => router.push(`/admin/projects/${proj._id}`)}
      >
        <h2 className="text-md font-medium text-slate-200 truncate">
          {proj.project_name}
        </h2>
        <div className="flex items-center gap-2 mt-1 text-xs">
  {/* Status Tag */}
  <span
    className={`
      px-2 py-1 rounded-md capitalize
      ${
        proj.status === "completed"
          ? "bg-green-100 text-green-700"
          : proj.status === "in-progress"
          ? "bg-yellow-100 text-yellow-700"
          : proj.status === "pending"
          ? "bg-red-100 text-red-700"
          : "bg-gray-100 text-gray-600"
      }
    `}
  >
    {proj.status}
  </span>

  {/* Date Tag */}
  <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600">
    Start:{" "}
    {proj.start_date
      ? new Date(proj.start_date).toLocaleDateString()
      : "N/A"}{" "}
    • End:{" "}
    {proj.end_date
      ? new Date(proj.end_date).toLocaleDateString()
      : "N/A"}
  </span>
</div>

      </div>
    ))}
  </div>
</div>

    </div>
  )
}

export default ProjectsPage