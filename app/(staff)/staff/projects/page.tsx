"use client"
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useGetBusinessClients, useGetBusinessRegions, useGetStaffProjects } from '@/query/business/queries'
import { RootState } from '@/redux/store'
import { Space, DatePicker } from 'antd'
import { CalendarPlus, PanelsTopLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import Cookies from 'js-cookie';
import { toast } from 'sonner'
import { DEPARTMENT_TYPES } from '@/lib/constants'

const { RangePicker } = DatePicker;

const projectSections = [
  { value: 'current', label: 'Current Projects' },
  { value: 'previous', label: 'Previous Projects' },
  { value: 'waiting', label: 'Waiting For Approval' },
]

const domainWise = [
  { value: 'client', label: 'Client Wise' },
  { value: 'region', label: 'Region Wise' },
  { value: 'department', label: 'Department Type Wise' }
]

const StaffProjects = () => {
  const router = useRouter();
  const [selectedSection, setSelectedSection] = useState('waiting');
  const [selectedDomainWise, setSelectedDomainWise] = useState('');
  const [selectedDomainId, setSelectedDomainId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [domains, setDomains] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [role_id, setRole_id] = useState("");
  const [canAdd, setCanAdd] = useState(false);
  const [deptId, setDeptId] = useState("");
  const [filters, setFilters] = useState<Record<string, string | undefined>>({});
  const {data: projects, isLoading, refetch} = useGetStaffProjects(filters);
  const { mutateAsync: getRegions, isPending: loadingRegions } = useGetBusinessRegions();
  const { mutateAsync: getBusinessClients, isPending: loadingBusinessClients } = useGetBusinessClients();

  useEffect(()=>{
    console.log("projects: ", projects);
  }, [projects])

  useEffect(()=>{
    fetchDatas();
  },[]);

  const fetchDatas = async() => {
    try{
      const cookieData = Cookies.get("user_domain");
      const roleCookies = Cookies.get("user_role");
      if(!cookieData || !roleCookies) {
        return toast.error("Cookies Missing...");
      }
      const roleData = JSON.parse(roleCookies);
      const jsonData = JSON.parse(cookieData);
      console.log("role_id: ", roleData?._id);
      
      setRole_id(roleData?._id);
      setDeptId(jsonData?.department_id);
      setFilters({
        role_id: roleData?._id,
        org_id: jsonData?.department_id,
        section: selectedSection
      });
      setCanAdd(jsonData?.type == "sales" || false);
      const regionsRes = await getRegions({business_id: jsonData?.business_id});
      if(regionsRes.status == 200) setRegions(regionsRes?.data);
      const clientsRes = await getBusinessClients(jsonData?.business_id);
      if(clientsRes?.status == 200) setClients(clientsRes?.data);
      
    }
    catch(err){
      console.log("error on fetchDatas: ", err);
    }
  }
  
  const handleDomainWiseChange = (value: string) => {
    setSelectedDomainWise(value);

    switch(value){
      case 'region':
        setDomains(regions)
        break;
      case 'client':
        setDomains(clients)
        break;
      case 'department':
        setDomains(DEPARTMENT_TYPES);
        break;
    }
  }

  const handleDomainChange = (value: string) => {
    setSelectedDomainId(value);
  }

  const handleDateChange = (dates: any, dateStrings: [string, string]) => {
    setStartDate(dateStrings[0]);
    setEndDate(dateStrings[1]);
  }

  const handleSearchProjects = () => {
    setFilters({
      section: selectedSection,
      domainWise: selectedDomainWise,
      domainId: selectedDomainId,
      startDate: startDate,
      endDate: endDate,
      role_id: role_id,
      org_id: deptId
    })
  }

  const handleClearAll = () => {
    setSelectedSection('waiting');
    setSelectedDomainWise('');
    setSelectedDomainId('');
    setStartDate('');
    setEndDate('');
  }

  return (
    <div className='p-2 sm:p-4 max-w-full overflow-x-hidden'>
      {/* Header Section */}
      <div className='bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg mb-2 flex flex-col sm:flex-row justify-between items-start sm:items-center'>
        <h1 className='font-semibold text-sm text-slate-300 flex items-center gap-1 mb-2 sm:mb-0'>
          <PanelsTopLeft size={16} />Projects
        </h1>
        {canAdd && <Button className='flex items-center gap-1' onClick={() => router.push('/staff/projects/add')} >Add Project <CalendarPlus size={16} /></Button> }
        
        {startDate && endDate && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <p className="text-xs text-slate-400">From: {startDate}</p>
            <p className="text-xs text-slate-400">To: {endDate}</p>
          </div>
        )}
      </div>

      {/* Filter Section */}
      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg mb-4">
        <h1 className='font-semibold text-xs text-slate-400 px-2 mb-2'>Project Filtrations</h1>
        <div className='flex flex-col sm:flex-row flex-wrap gap-2'>
          <div className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.5rem)]">
            <Select value={selectedSection} onValueChange={setSelectedSection}>
              <SelectTrigger className={`${selectedSection ? 'text-slate-200' : 'text-slate-400'} text-xs h-9`}>
                <SelectValue placeholder="Select Projects" />
              </SelectTrigger>
              <SelectContent>
                {projectSections.map((item) => (
                  <SelectItem key={item.value} value={item.value} className="text-xs">
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.5rem)]">
            <Select value={selectedDomainWise} onValueChange={handleDomainWiseChange}>
              <SelectTrigger className={`${selectedDomainWise ? 'text-slate-200' : 'text-slate-400'} text-xs h-9`}>
                <SelectValue placeholder="Select Domain Wise" />
              </SelectTrigger>
              <SelectContent>
                {domainWise.map((item) => (
                  <SelectItem key={item.value} value={item.value} className="text-xs">
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.5rem)]">
            <Select value={selectedDomainId} onValueChange={handleDomainChange}>
              <SelectTrigger className={`${selectedDomainId ? 'text-slate-200' : 'text-slate-400'} text-xs h-9`}>
                <SelectValue placeholder="Select Domain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All</SelectItem>
                {domains.map((item: any) => (
                  <SelectItem key={item._id || item.value} value={item._id || item.value} className="text-xs">
                    {item.client_name || item.region_name || item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.5rem)]">
            <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg p-0.5 px-1">
              <Label className='text-xs text-slate-400 px-2'>Within Period</Label>
              <Space direction="vertical" size={12} style={{ width: '100%', border: 0 }}>
                <RangePicker 
                  onChange={handleDateChange} 
                  style={{ 
                    width: '100%', 
                    border: 0, 
                    backgroundColor: '#1d293d',
                    fontSize: '12px',
                  }} 
                  className='text-white h-9'
                  size="small"
                  popupStyle={{ 
                    width: '100%', 
                    maxWidth: '300px',
                    boxSizing: 'border-box',
                  }}
                  popupClassName="ant-picker-mobile-responsive"
                />
              </Space>
            </div>
          </div>
          <div className="w-full flex gap-2 justify-start">
            <Button onClick={handleClearAll} variant='ghost' className='text-xs h-9'>Clear All</Button>
            <Button onClick={handleSearchProjects} className='text-xs h-9'>Apply / Search</Button>
          </div>
        </div>
      </div>

      {/* Project List Section */}
      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg">
        <h1 className='font-semibold text-xs text-slate-400 px-2 mb-2'>Project List</h1>
        {projects?.data?.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No projects found</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {projects?.data?.map((project:any) => (
              <div 
                key={project?._id} 
                className="bg-slate-900/70 p-3 rounded-lg hover:bg-slate-900/90 transition-colors"
              >
                <h2 className="text-sm font-semibold text-slate-200">{project?.project_name}</h2>
                {/* <p className="text-xs text-slate-400">Client: {project.client}</p> */}
                <p className="text-xs text-slate-400 capitalize">Status: {project?.status}</p>
                <p className="text-xs text-slate-400">Period: {new Date(project?.start_date).toLocaleDateString()} to {new Date(project?.end_date).toLocaleDateString()}</p>
                <Button 
                  variant="link" 
                  className="text-xs text-blue-400 p-0 mt-2" 
                  onClick={() => router.push(`/staff/projects/${project?._id}`)}
                >
                  View Details
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default StaffProjects