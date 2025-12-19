
"use client"
import React from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbLink } from '@/components/ui/breadcrumb'
import { Check, EllipsisVertical, FileText, Loader2, Plus, Trash2, Upload, UserPlus, X } from 'lucide-react'
import { useGetApplicationRoles } from '@/query/superadmin/query'
import { motion } from 'framer-motion';
import { Popover, PopoverContent, PopoverTrigger, } from "@/components/ui/popover"
import { Popconfirm } from 'antd';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from 'sonner'
import { useGetAreaLocations, useGetBusinessRegions, useGetBusinessSkills, useGetRegionAreas } from '@/query/business/queries'
import { useAddUserRegion, useAddUserRole, useGetUserCompleteProfile, useRemoveUserRole, useRemoveUserRegion, useAddUserArea, useRemoveUserArea, useAddUserSkill, useRemoveUserSkill, useAddUserDoc, useRemoveUserDoc, useAddUserLocation, useRemoveUserLocation } from '@/query/user/queries'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { storage } from '@/firebase/config'
import Image from 'next/image'
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button'

const AddBusinessStaffDetails = () => {
  const router = useRouter();
  const { businessStaff } = useSelector((state: RootState) => state.application);
  const { businessData } = useSelector((state: RootState) => state.user);
  const { data: rolesData } = useGetApplicationRoles();
  const { mutateAsync: getRegions } = useGetBusinessRegions();
  const { mutateAsync: getUserProfile, isPending: loadingUserProfile } = useGetUserCompleteProfile();
  const { mutateAsync: removeUserRegion } = useRemoveUserRegion();
  const { mutateAsync: addUserRegion } = useAddUserRegion();
  // const { mutateAsync: addUserRole } = useAddUserRole();
  // const { mutateAsync: removeUserRole } = useRemoveUserRole();
  const { mutateAsync: getAreas } = useGetRegionAreas();
  const { mutateAsync: addUserArea } = useAddUserArea();
  const { mutateAsync: removeUserArea } = useRemoveUserArea();
  const { mutateAsync: getSkills } = useGetBusinessSkills();
  const { mutateAsync: addUserSkill } = useAddUserSkill();
  const { mutateAsync: removeUserSkill } = useRemoveUserSkill();
  const { mutateAsync: addUserDoc } = useAddUserDoc();
  const { mutateAsync: removeUserDoc } = useRemoveUserDoc();
  const { mutateAsync: getLocations } = useGetAreaLocations();
  const { mutateAsync: addUserLocation } = useAddUserLocation();
  const { mutateAsync: removeUserLocation } = useRemoveUserLocation();

  // const [roles, setRoles] = React.useState<any[]>([]);
  // const [selectRoleOpen, setSelectRoleOpen] = React.useState(false);
  // const [currentSelectedRole, setCurrentSelectedRole] = React.useState<string>('');

  // const handleAddSelectedRole = async () => {
  //   if(!currentSelectedRole){
  //     toast.error('Please select a role.');
  //     return;
  //   }
  //   if(roles?.find((role: any) => role?.role_id == currentSelectedRole)){
  //     toast.error('Role already added.');
  //     return;
  //   }
  //   const formData = new FormData();
  //   formData.append('body', JSON.stringify({
  //     user_id: businessStaff?._id,
  //     role_id: currentSelectedRole
  //   }));
  //   const res = await addUserRole(formData);
  //   if(res?.status == 200){
  //     toast.success('Role added successfully.');
  //     handleGetCompleteProfile();
  //   } else {
  //     toast.error('Failed to add role.');
  //   }
  //   setCurrentSelectedRole('');
  //   setSelectRoleOpen(false);
  // }

  // const handleRemoveSelectedRole = async (URoleId: string /* UserRoleId */ ) => {
  //   const res = await removeUserRole(URoleId);
  //   if(res?.status == 200){
  //     toast.success('Role removed successfully.');
  //     handleGetCompleteProfile();
  //   } else {
  //     toast.error('Failed to remove role.');
  //   }
  // }

  const [regions, setRegions] = React.useState<any[]>([]);
  const [businessRegions, setBusinessRegions] = React.useState<any[]>([]);
  const [addRegionDialog, setAddRegionDialog] = React.useState(false);
  const [currentSelectedRegion, setCurrentSelectedRegion] = React.useState<string>('');

  const handleFetchBusinessRegions = async () => {
    const res = await getRegions({ business_id: businessData?._id });
    if(res?.status == 200){
      setBusinessRegions(res?.data);
    }
  }

  const handleAddRegion= async () => {
    if(!currentSelectedRegion){
      toast.error('Please select a region.');
      return;
    }
    if(regions?.find((region: any) => region?.region_id == currentSelectedRegion)){
      toast.error('Region already added.');
      return;
    }
    const formData = new FormData();
    formData.append('body', JSON.stringify({
      user_id: businessStaff?._id,
      region_id: currentSelectedRegion
    }));
    const res = await addUserRegion(formData);
    if(res?.status == 200){
      toast.success('Region added successfully.');
      await handleGetCompleteProfile();
    } else {
      toast.error('Failed to add region.');
    }
    setCurrentSelectedRegion('');
    setAddRegionDialog(false);
  }

  const handleRemoveRegion = async (URegid: string /* UserRegionID */ ) => {
    const res = await removeUserRegion(URegid);
    if(res?.status == 200){
      toast.success('Region removed successfully.');
      handleGetCompleteProfile();
    } else {
      toast.error('Failed to remove region.');
    }
  }

  const handleGetCompleteProfile = async () => {
    const response = await getUserProfile(businessStaff?._id || "");
    console.log(response)
    if(response?.status == 200){
      // setRoles(response?.user_roles);
      setRegions(response?.user_regions);
      if(response?.user_regions?.length > 0){
        handleFetchBusinessAreas(response?.user_regions?.map((region: any) => region?.region_id?._id));
      }
      setLocations(response?.user_locations);
      if(response?.user_areas?.length > 0){
        handleFetchBusinessLocations(response?.user_areas?.map((area: any) => area?.area_id?._id));
      }
      setAreas(response?.user_areas);
      setDocs(response?.user_docs);
      setSkills(response?.user_skills);
    } else {
      toast.error("Failed to fetch profile.")
    }
  }

  const [locations, setLocations] = React.useState<any[]>([]);
  const [businessLocations, setBusinessLocations] = React.useState<any[]>([]);
  const [addLocationDialog, setAddLocationDialog] = React.useState(false);
  const [currentSelectedLocation, setCurrentSelectedLocation] = React.useState<string>('');

  const handleFetchBusinessLocations = async (area_ids: string[]) => {
    if(!area_ids?.length){
      return;
    }
    const res = await getLocations({ area_ids });
    if(res?.status == 200){
      setBusinessLocations(res?.data);
    }
  }

  const handleAddLocation = async () => {
    if(!currentSelectedLocation){
      toast.error('Please select a location.');
      return;
    }
    if(locations?.find((location: any) => location?.location_id == currentSelectedLocation)){
      toast.error('Location already added.');
      return;
    }
    const formData = new FormData();
    formData.append('body', JSON.stringify({
      user_id: businessStaff?._id,
      location_id: currentSelectedLocation
    }));
    const res = await addUserLocation(formData);
    if(res?.status == 200){
      toast.success('Location added successfully.');
      handleGetCompleteProfile();
    } else {
      toast.error('Failed to add location.');
    }
    setCurrentSelectedLocation('');
    setAddLocationDialog(false);
  }

  const handleRemoveLocation = async (location_id: string) => {
    const res = await removeUserLocation(location_id);
    if(res?.status == 200){
      toast.success('Location removed successfully.');
      handleGetCompleteProfile();
    } else {
      toast.error('Failed to remove location.');
    }
  }

  const [areas, setAreas] = React.useState<any[]>([]);
  const [businessAreas, setBusinessAreas] = React.useState<any[]>([]);
  const [addAreaDialog, setAddAreaDialog] = React.useState(false);
  const [currentSelectedArea, setCurrentSelectedArea] = React.useState<string>('');

  const handleFetchBusinessAreas = async (region_ids: string[]) => {
    if(!region_ids?.length){
      toast.error('no areas fetched');
      return;
    }
    const res = await getAreas({ region_ids });
    if(res?.status == 200){
      setBusinessAreas(res?.data);
    }
  }

  const handleAddArea = async () => {
    if(!currentSelectedArea){
      toast.error('Please select an area.');
      return;
    }
    if(areas?.find((area: any) => area?.area_id == currentSelectedArea)){
      toast.error('Area already added.');
      return;
    }
    const formData = new FormData();
    formData.append('body', JSON.stringify({
      user_id: businessStaff?._id,
      area_id: currentSelectedArea
    }));
    const res = await addUserArea(formData);
    if(res?.status == 200){
      toast.success('Area added successfully.');
      handleGetCompleteProfile();
    } else {
      toast.error('Failed to add area.');
    }
    setCurrentSelectedArea('');
    setAddAreaDialog(false);
  }

  const handleRemoveArea = async (UAreaId: string) => {
    const res = await removeUserArea(UAreaId);
    if(res?.status == 200){
      toast.success('Area removed successfully.');
      handleGetCompleteProfile();
    } else {
      toast.error('Failed to remove area.');
    }
  }

  const [skills, setSkills] = React.useState<any[]>([]);
  const [businessSkills, setBusinessSkills] = React.useState<any[]>([]);
  const [addSkillDialog, setAddSkillDialog] = React.useState(false);
  const [currentSelectedSkill, setCurrentSelectedSkill] = React.useState<string>('');

  const handleFetchBusinessSkills = async () => {
    const res = await getSkills(businessData?._id);
    if(res?.status == 200){
      setBusinessSkills(res?.data);
    }
  }

  const handleAddSkill = async () => {
    if(!currentSelectedSkill){
      toast.error('Please select a skill.');
      return;
    }
    if(skills?.find((skill: any) => skill?.skill_id == currentSelectedSkill)){
      toast.error('Skill already added.');
      return;
    }
    const formData = new FormData();
    formData.append('body', JSON.stringify({
      user_id: businessStaff?._id,
      skill_id: currentSelectedSkill
    }));
    const res = await addUserSkill(formData);
    if(res?.status == 200){
      toast.success('Skill added successfully.');
      handleGetCompleteProfile();
    } else {
      toast.error('Failed to add skill.');
    }
    setCurrentSelectedSkill('');
    setAddSkillDialog(false);
  }

  const handleRemoveSkill = async (USkillId: string) => {
    const res = await removeUserSkill(USkillId);
    if(res?.status == 200){
      toast.success('Skill removed successfully.');
      handleGetCompleteProfile();
    } else {
      toast.error('Failed to remove skill.');
    }
  }

  const [docs, setDocs] = React.useState<any[]>([]);
  const [docFile, setDocFile] = React.useState<File | null>(null);
  const [docName, setDocName] = React.useState<string>('');
  const [docExpiry, setDocExpiry] = React.useState<string>('');
  const [docPreview, setDocPreview] = React.useState<string | null>(null);
  const [docType, setDocType] = React.useState<string>('');
  const [uploadingDoc, setUploadingDoc] = React.useState(false);
  const [docToDelete, setDocToDelete] = React.useState<any | null>(null);
  const [deleteDocDialogOpen, setDeleteDocDialogOpen] = React.useState(false);

  const MAX_DOC_SIZE = 5 * 1024 * 1024; // 5MB
  const isPdf = (type: string) => type?.toLowerCase().includes('pdf');
  const isImage = (type: string) => type?.startsWith('image/');
  const normalizeDocName = (name: string) => name.trim().replace(/\s+/g, ' ');
  const slugifyDocName = (name: string) =>
    normalizeDocName(name || 'file')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') || `file-${Date.now()}`;
  const getFileExtension = (file: File) => {
    const ext = file?.name?.split('.').pop();
    if (ext && ext.length < 8) return ext.toLowerCase();
    if (isPdf(file?.type)) return 'pdf';
    if (isImage(file?.type)) return file.type.split('/')[1];
    return 'bin';
  };
  const extractStoragePath = (url: string) => {
    try {
      const afterObject = url.split('/o/')[1];
      const encodedPath = afterObject?.split('?')[0];
      return encodedPath ? decodeURIComponent(encodedPath) : '';
    } catch (err) {
      return '';
    }
  };
  const resetDocForm = () => {
    if (docPreview) URL.revokeObjectURL(docPreview);
    setDocFile(null);
    setDocName('');
    setDocExpiry('');
    setDocPreview(null);
    setDocType('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) {
      setDocFile(null);
      setDocPreview(null);
      setDocType('');
      return;
    }
    const selectedType = selectedFile.type;
    if (!(isPdf(selectedType) || isImage(selectedType))) {
      toast.error('Only images or PDFs are allowed.');
      setDocFile(null);
      setDocPreview(null);
      setDocType('');
      return;
    }
    if (selectedFile.size > MAX_DOC_SIZE) {
      toast.error('File is too large (max 5MB).');
      setDocFile(null);
      setDocPreview(null);
      setDocType('');
      return;
    }
    setDocFile(selectedFile);
    setDocType(selectedType);
    if (!docName) {
      const inferredName = selectedFile.name.replace(/\.[^/.]+$/, '');
      setDocName(normalizeDocName(inferredName));
    }
    if (isImage(selectedType)) {
      const url = URL.createObjectURL(selectedFile);
      setDocPreview(url);
    } else {
      setDocPreview(null);
    }
  };

  const handleAddDocument = async () => {
    if (uploadingDoc) return;
    const cleanedName = normalizeDocName(docName || docFile?.name || '');
    if (!docFile || !cleanedName || !docExpiry) {
      toast.error('Please provide name, expiry and a file.');
      return;
    }
    if (!businessStaff?._id) {
      toast.error('Missing staff id. Please reopen the staff profile.');
      return;
    }
    const alreadyExists = docs.some((d: any) => d?.doc_name?.toLowerCase() === cleanedName.toLowerCase());
    if (alreadyExists) {
      toast.error('A document with that name already exists.');
      return;
    }

    const extension = getFileExtension(docFile);
    const safeName = slugifyDocName(cleanedName);
    const storagePath = `${businessStaff?._id}/docs/${safeName}/file.${extension}`;
    const storageRef = ref(storage, storagePath);
    const optimisticId = `temp-${Date.now()}`;
    const optimisticDoc = {
      _id: optimisticId,
      doc_name: cleanedName,
      doc_url: docPreview || '',
      expire_date: docExpiry,
      doc_type: docType || docFile.type,
      storage_path: storagePath,
      optimistic: true,
    };

    setUploadingDoc(true);
    setDocs((prev) => [optimisticDoc, ...prev]);
    try {
      await uploadBytes(storageRef, docFile);
      const docUrl = await getDownloadURL(storageRef);

      const formData = new FormData();
      formData.append('body', JSON.stringify({
        user_id: businessStaff?._id,
        doc_name: cleanedName,
        expire_date: docExpiry,
        doc_url: docUrl,
        doc_type: docType || docFile.type,
        storage_path: storagePath,
      }));
      const res = await addUserDoc(formData);
      if(res?.status == 200){
        toast.success('Document added successfully.');
        await handleGetCompleteProfile();
      } else {
        setDocs((prev) => prev.filter((doc: any) => doc._id !== optimisticId));
        await deleteObject(storageRef);
        toast.error('Failed to add document.');
      }
    } catch (error) {
      console.log(error);
      setDocs((prev) => prev.filter((doc: any) => doc._id !== optimisticId));
      try {
        await deleteObject(storageRef);
      } catch (err) {
        console.log(err);
      }
      toast.error('Something went wrong while uploading.');
    } finally {
      resetDocForm();
      setUploadingDoc(false);
    }
  }

  const handleRemoveDoc = async (doc: any) => {
    if(!doc?._id) return;
    const previousDocs = [...docs];
    setDocs((prev) => prev.filter((item: any) => item?._id !== doc?._id));

    const pathFromUrl = doc?.storage_path || extractStoragePath(doc?.doc_url || '');
    try {
      const res = await removeUserDoc(doc?._id);
      if(res?.status != 200){
        setDocs(previousDocs);
        toast.error('Failed to remove document.');
        return;
      }

      if (pathFromUrl) {
        const storageRef = ref(storage, pathFromUrl);
        await deleteObject(storageRef);
      }
      toast.success('Document removed successfully.');
    } catch (error) {
      console.log(error);
      setDocs(previousDocs);
      toast.error('Failed to remove document.');
    }
  }

  const confirmRemoveDoc = (doc: any) => {
    setDocToDelete(doc);
    setDeleteDocDialogOpen(true);
  };

  React.useEffect(() => {
    if(businessStaff){
      handleFetchBusinessRegions();
      handleGetCompleteProfile();
      handleFetchBusinessSkills();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessStaff]);

  return (
    <div className='p-5 pb-10'>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => router.back()}>staff</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>staff details</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="bg-gradient-to-tr from-slate-900/60 to-slate-950/60 p-3 rounded-lg mt-2">
        <h1 className="font-semibold text-sm text-slate-300 flex items-center gap-1"><UserPlus size={16} /> Business Staff Details</h1>
      </div>
      <div className="bg-gradient-to-tr from-slate-950/60 to-slate-900/60 p-3 rounded-lg mt-2">
        {/* <h1 className="font-semibold text-xs text-slate-300 flex items-center gap-1">Select User Roles</h1>
        <div className="flex flex-wrap">
          {roles?.map((role: any) => (
            <div className="w-full lg:w-3/12 p-1" key={role._id}>
            <div className="bg-gradient-to-tr from-slate-900/60 to-slate-950/60 p-3 rounded-lg relative">
              <h1 className="font-semibold text-xs text-slate-300 flex items-center gap-1">{role?.role_id?.role_name}</h1>
              <Popover>
                <PopoverTrigger asChild>
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.98 }}
                    className='absolute right-2 top-1 hover:bg-slate-700/50 p-1 rounded-full cursor-pointer'
                  >
                    <EllipsisVertical size={18} />
                  </motion.div>
                </PopoverTrigger>
                <PopoverContent className='w-[100px] p-0 border border-slate-800 rounded-lg overflow-hidden'>
                  <div className='flex flex-col items-start gap-1 bg-black rounded-lg'>
                    <Popconfirm title="Are you sure to delete this role?" onConfirm={() => handleRemoveSelectedRole(role?._id)}>
                      <div className='w-full'>
                        <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }} className='bg-slate-800/50 w-full p-1 py-2 text-red-500 cursor-pointer hover:text-red-700 flex items-center justify-center gap-1'>
                          <Trash2 size={14} />
                          <h1 className='text-xs font-semibold'>Delete</h1>
                        </motion.div>
                      </div>
                    </Popconfirm>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          ))}
          <div className="w-full lg:w-3/12 p-1">
            <motion.div 
              whileTap={{ scale: 0.98 }} 
              whileHover={{ scale: 1.02 }} 
              onClick={() => setSelectRoleOpen(true)}
              className="bg-gradient-to-tr from-slate-900/60 to-slate-950/60 group p-3 rounded-lg flex items-center gap-1 justify-center cursor-pointer border border-slate-700 hover:border-cyan-800">
              <Plus className="group-hover:text-cyan-500" size={16} />
              <h1 className="font-semibold text-xs text-slate-300">Assign Role</h1>
            </motion.div>
          </div>
        </div> */}



        <h1 className="font-semibold text-xs text-slate-300 flex items-center gap-1 mt-3">Select Staff Regions</h1>
        <div className="flex flex-wrap">
          {regions?.map((region: any) => (
            <div className="w-full lg:w-3/12 p-1" key={region?._id}>
              <div className="bg-gradient-to-tr from-slate-900/60 to-slate-950/60 p-3 rounded-lg relative">
                <h1 className="font-semibold text-xs text-slate-300 flex items-center gap-1">{region?.region_id?.region_name}</h1>
                <Popover>
                  <PopoverTrigger asChild>
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.98 }}
                      className='absolute right-2 top-1 hover:bg-slate-700/50 p-1 rounded-full cursor-pointer'
                    >
                      <EllipsisVertical size={18} />
                    </motion.div>
                  </PopoverTrigger>
                  <PopoverContent className='w-[100px] p-0 border border-slate-800 rounded-lg overflow-hidden'>
                    <div className='flex flex-col items-start gap-1 bg-black rounded-lg'>
                      <Popconfirm title="Are you sure to delete this region?" onConfirm={() => handleRemoveRegion(region?._id)}>
                        <div className='w-full'>
                          <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }} className='bg-slate-800/50 w-full p-1 py-2 text-red-500 cursor-pointer hover:text-red-700 flex items-center justify-center gap-1'>
                            <Trash2 size={14} />
                            <h1 className='text-xs font-semibold'>Delete</h1>
                          </motion.div>
                        </div>
                      </Popconfirm>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          ))}
          <div className="w-full lg:w-3/12 p-1">
            <motion.div
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => setAddRegionDialog(true)}
              className="bg-gradient-to-tr from-slate-900/60 to-slate-950/60 group p-3 rounded-lg flex items-center gap-1 justify-center cursor-pointer border border-slate-700 hover:border-cyan-800">
              <Plus className="group-hover:text-cyan-500" size={16} />
              <h1 className="font-semibold text-xs text-slate-300">Assign Region</h1>
            </motion.div>
          </div>
        </div>



        {regions?.length > 0 && <h1 className="font-semibold text-xs text-slate-300 flex items-center gap-1 mt-3">Select Staff Areas</h1>}
        {regions?.length > 0 && <div className="flex flex-wrap">
          {areas?.map((area: any) => (
            <div className="w-full lg:w-3/12 p-1" key={area?._id}>
              <div className="bg-gradient-to-tr from-slate-900/60 to-slate-950/60 p-3 rounded-lg relative">
                <h1 className="font-semibold text-xs text-slate-300 flex items-center gap-1">{area?.area_id?.area_name}</h1>
                <Popover>
                  <PopoverTrigger asChild>
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.98 }}
                      className='absolute right-2 top-1 hover:bg-slate-700/50 p-1 rounded-full cursor-pointer'
                    >
                      <EllipsisVertical size={18} />
                    </motion.div>
                  </PopoverTrigger>
                  <PopoverContent className='w-[100px] p-0 border border-slate-800 rounded-lg overflow-hidden'>
                    <div className='flex flex-col items-start gap-1 bg-black rounded-lg'>
                      <Popconfirm title="Are you sure to delete this area?" onConfirm={() => handleRemoveArea(area?._id)}>
                        <div className='w-full'>
                          <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }} className='bg-slate-800/50 w-full p-1 py-2 text-red-500 cursor-pointer hover:text-red-700 flex items-center justify-center gap-1'>
                            <Trash2 size={14} />
                            <h1 className='text-xs font-semibold'>Delete</h1>
                          </motion.div>
                        </div>
                      </Popconfirm>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          ))}
          <div className="w-full lg:w-3/12 p-1">
            <motion.div
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => setAddAreaDialog(true)}
              className="bg-gradient-to-tr from-slate-900/60 to-slate-950/60 group p-3 rounded-lg flex items-center gap-1 justify-center cursor-pointer border border-slate-700 hover:border-cyan-800">
              <Plus className="group-hover:text-cyan-500" size={16} />
              <h1 className="font-semibold text-xs text-slate-300">Assign Areas</h1>
            </motion.div>
          </div>
        </div>}


        {areas?.length > 0 && <h1 className="font-semibold text-xs text-slate-300 flex items-center gap-1 mt-3">Select Staff Locations</h1>}
        {areas?.length > 0 && <div className="flex flex-wrap">
          {locations?.map((location: any) => (
            <div className="w-full lg:w-3/12 p-1" key={location?._id}>
              <div className="bg-gradient-to-tr from-slate-900/60 to-slate-950/60 p-3 rounded-lg relative">
                <h1 className="font-semibold text-xs text-slate-300 flex items-center gap-1">{location?.location_id?.location_name}</h1>
                <Popover>
                  <PopoverTrigger asChild>
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.98 }}
                      className='absolute right-2 top-1 hover:bg-slate-700/50 p-1 rounded-full cursor-pointer'
                    >
                      <EllipsisVertical size={18} />
                    </motion.div>
                  </PopoverTrigger>
                  <PopoverContent className='w-[100px] p-0 border border-slate-800 rounded-lg overflow-hidden'>
                    <div className='flex flex-col items-start gap-1 bg-black rounded-lg'>
                      <Popconfirm title="Are you sure to delete this location?" onConfirm={() => handleRemoveLocation(location?._id)}>
                        <div className='w-full'>
                          <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }} className='bg-slate-800/50 w-full p-1 py-2 text-red-500 cursor-pointer hover:text-red-700 flex items-center justify-center gap-1'>
                            <Trash2 size={14} />
                            <h1 className='text-xs font-semibold'>Delete</h1>
                          </motion.div>
                        </div>
                      </Popconfirm>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          ))}
          <div className="w-full lg:w-3/12 p-1">
            <motion.div
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => setAddLocationDialog(true)}
              className="bg-gradient-to-tr from-slate-900/60 to-slate-950/60 group p-3 rounded-lg flex items-center gap-1 justify-center cursor-pointer border border-slate-700 hover:border-cyan-800">
              <Plus className="group-hover:text-cyan-500" size={16} />
              <h1 className="font-semibold text-xs text-slate-300">Assign Location</h1>
            </motion.div>
          </div>
        </div>}

        <h1 className="font-semibold text-xs text-slate-300 flex items-center gap-1 mt-3">Select Staff Skills</h1>
        <div className="flex flex-wrap">
          {skills?.map((skill: any) => (
            <div className="w-full lg:w-3/12 p-1" key={skill?._id}>
              <div className="bg-gradient-to-tr from-slate-900/60 to-slate-950/60 p-3 rounded-lg relative">
                <h1 className="font-semibold text-xs text-slate-300 flex items-center gap-1">{skill?.skill_id?.skill_name}</h1>
                <Popover>
                  <PopoverTrigger asChild>
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.98 }}
                      className='absolute right-2 top-1 hover:bg-slate-700/50 p-1 rounded-full cursor-pointer'
                    >
                      <EllipsisVertical size={18} />
                    </motion.div>
                  </PopoverTrigger>
                  <PopoverContent className='w-[100px] p-0 border border-slate-800 rounded-lg overflow-hidden'>
                    <div className='flex flex-col items-start gap-1 bg-black rounded-lg'>
                      <Popconfirm title="Are you sure to delete this region?" onConfirm={() => handleRemoveSkill(skill?._id)}>
                        <div className='w-full'>
                          <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }} className='bg-slate-800/50 w-full p-1 py-2 text-red-500 cursor-pointer hover:text-red-700 flex items-center justify-center gap-1'>
                            <Trash2 size={14} />
                            <h1 className='text-xs font-semibold'>Delete</h1>
                          </motion.div>
                        </div>
                      </Popconfirm>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          ))}
          <div className="w-full lg:w-3/12 p-1">
            <motion.div
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => setAddSkillDialog(true)}
              className="bg-gradient-to-tr from-slate-900/60 to-slate-950/60 group p-3 rounded-lg flex items-center gap-1 justify-center cursor-pointer border border-slate-700 hover:border-cyan-800">
              <Plus className="group-hover:text-cyan-500" size={16} />
              <h1 className="font-semibold text-xs text-slate-300">Assign Skill</h1>
            </motion.div>
          </div>
        </div>



        <div className="mt-3">
          <div className="bg-gradient-to-tr from-slate-950/60 to-slate-900/60 p-4 rounded-lg border border-slate-800/70">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <h1 className="font-semibold text-xs text-slate-300 flex items-center gap-2">
                  <FileText size={16} /> Staff Documents
                </h1>
                <p className="text-[11px] text-slate-400">Images or PDFs only • Max 5MB • Names must be unique</p>
              </div>
              {uploadingDoc && (
                <div className="flex items-center gap-1 text-[11px] text-cyan-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
                </div>
              )}
            </div>

            <div className="grid gap-4 mt-4 lg:grid-cols-3">
              <div className="bg-black/30 border border-slate-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-slate-800/60 rounded-md">
                    <Upload className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-200 font-semibold">Add a document</p>
                    <p className="text-[11px] text-slate-400">Files save to this staff member’s bucket.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-[11px]">Document Name</Label>
                    <Input
                      placeholder="e.g. Passport front"
                      value={docName}
                      onChange={(e) => setDocName(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Expiry Date</Label>
                    <Input
                      type="date"
                      value={docExpiry}
                      onChange={(e) => setDocExpiry(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">File (image or PDF, max 5MB)</Label>
                    <label className="mt-1 block border border-dashed border-slate-700 rounded-lg p-3 bg-slate-900/40 hover:border-cyan-700 transition cursor-pointer">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs text-slate-200">
                          <Upload size={14} className="text-cyan-400" />
                          <span className="truncate">{docFile ? docFile.name : 'Choose or drop a file'}</span>
                        </div>
                        {docFile && <span className="text-[11px] text-slate-400">{(docFile.size/1024/1024).toFixed(2)} MB</span>}
                      </div>
                      <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileChange} />
                    </label>
                  </div>

                  {docPreview && (
                    <div className="rounded-md border border-slate-800 overflow-hidden bg-slate-900/60">
                      <Image
                        src={docPreview}
                        alt="Selected document preview"
                        width={400}
                        height={220}
                        className="w-full h-40 object-cover"
                      />
                    </div>
                  )}
                  {!docPreview && docFile && (isPdf(docType || docFile.type)) && (
                    <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/50 border border-slate-800 rounded-md p-2">
                      <FileText className="h-4 w-4 text-amber-300" />
                      <span>PDF ready to upload</span>
                    </div>
                  )}

                  <Button
                    onClick={handleAddDocument}
                    disabled={uploadingDoc}
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-xs"
                  >
                    {uploadingDoc ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" /> Upload document
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="flex flex-wrap">
                  {docs?.length === 0 && (
                    <div className="w-full p-4 border border-dashed border-slate-800/80 rounded-lg text-center text-xs text-slate-400 bg-slate-900/40">
                      No documents added yet.
                    </div>
                  )}
                  {docs?.map((doc: any) => {
                    const type = doc?.doc_type || doc?.file_type || '';
                    const docIsPdf = isPdf(type) || doc?.doc_url?.toLowerCase()?.includes('.pdf');
                    const docIsImage = isImage(type) || (!docIsPdf && !type);
                    return (
                      <div className="w-full md:w-1/2 xl:w-1/3 p-1" key={doc?._id || doc?.doc_name}>
                        <div className="bg-gradient-to-tr from-slate-900/60 to-slate-950/60 border border-slate-800 rounded-lg overflow-hidden relative">
                          <button
                            onClick={() => confirmRemoveDoc(doc)}
                            className="absolute right-2 top-2 z-10 bg-black/60 hover:bg-red-900/60 text-slate-200 hover:text-white rounded-full p-1"
                            aria-label="Remove document"
                          >
                            <X size={14} />
                          </button>
                          <div className="h-32 bg-slate-950 flex items-center justify-center relative overflow-hidden">
                            {docIsImage && doc?.doc_url ? (
                              <Image
                                src={doc?.doc_url}
                                alt={doc?.doc_name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center text-slate-300 text-xs gap-1">
                                <FileText className="h-6 w-6 text-amber-300" />
                                <span>PDF file</span>
                              </div>
                            )}
                          </div>
                          <div className="p-3 text-xs text-slate-200 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold truncate" title={doc?.doc_name}>{doc?.doc_name}</p>
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                                {docIsPdf ? 'PDF' : 'Image'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-400">
                              <span>{doc?.expire_date ? new Date(doc?.expire_date).toLocaleDateString() : 'No expiry set'}</span>
                              {doc?.doc_url && <a className="text-cyan-400 hover:text-cyan-300 font-medium" href={doc?.doc_url} target="_blank" rel="noreferrer">Open</a>}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
        
      </div>


      

      {/* Select Role Dialog
      <Dialog open={selectRoleOpen} onOpenChange={setSelectRoleOpen}>
        <DialogContent className="lg:w-[450px]">
          <DialogHeader>
            <DialogTitle>Select User Roles</DialogTitle>
            <DialogDescription>Select user roles for this business staff.</DialogDescription>
          </DialogHeader>
          <div className="">
            {rolesData?.data?.map((role: any) => (
              <motion.div 
                key={role?._id}
                whileTap={{ scale: 0.98 }} 
                whileHover={{ scale: 1.02 }}  
                onClick={() => setCurrentSelectedRole(role?.role_name)}
                className="bg-gradient-to-tr from-slate-800/60 to-slate-900/60 p-3 hover:border-cyan-500 border border-slate-700 select-none cursor-pointer rounded-lg mb-1.5 relative">
                <h1 className="font-semibold text-xs text-slate-300 flex items-center gap-1">{role?.role_name}</h1>
                {currentSelectedRole === role?.role_name && <div className="absolute right-2 top-1.5"><Check className="text-cyan-600" strokeWidth={3} size={17} /> </div>}

              </motion.div>
            ))}
            <motion.div
              whileTap={{ scale: 0.98 }} 
              whileHover={{ scale: 1.02 }}
              onClick={handleAddSelectedRole}
              className="bg-gradient-to-tr from-slate-700/50 to-slate-800/50 p-3 hover:border-cyan-500 border border-slate-700 select-none cursor-pointer rounded-lg mt-3 flex items-center gap-1 justify-center">
              <Plus size={16} />
              <h1 className="font-semibold text-sm text-slate-300 flex items-center gap-1">Add New Role</h1>
            </motion.div>
          </div>
        </DialogContent>
      </Dialog> */}

      {/* Add Region Dialog */}
      <Dialog open={addRegionDialog} onOpenChange={setAddRegionDialog}>
        <DialogContent className="lg:w-[450px] max-h-[calc(100vh-200px)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Region</DialogTitle>
            <DialogDescription>Add a new region for this business staff.</DialogDescription>
          </DialogHeader>
          <div className="">
            {businessRegions?.length === 0 && (
              <div className="flex items-center justify-center h-[10vh]">
                <h1 className="text-xs font-medium text-slate-300">No regions added.</h1>
              </div>
            )}
            {businessRegions?.map((region: any) => (
              <motion.div
                key={region?._id}
                whileTap={{ scale: 0.98 }} 
                whileHover={{ scale: 1.02 }}  
                onClick={() => setCurrentSelectedRegion(region?._id)}
                className="bg-gradient-to-tr from-slate-800/60 to-slate-900/60 p-3 hover:border-cyan-500 border border-slate-700 select-none cursor-pointer rounded-lg mb-1.5 relative">
              <h1 className="font-semibold text-xs text-slate-300 flex items-center gap-1">{region?.region_name}</h1>
              {currentSelectedRegion === region?._id && <div className="absolute right-2 top-1.5"><Check className="text-cyan-600" strokeWidth={3} size={17} /> </div>}
            </motion.div>
            ))}
            <motion.div
              whileTap={{ scale: 0.98 }} 
              whileHover={{ scale: 1.02 }}
              onClick={handleAddRegion}
              className="bg-gradient-to-tr from-slate-700/50 to-slate-800/50 p-3 hover:border-cyan-500 border border-slate-700 select-none cursor-pointer rounded-lg mt-3 flex items-center gap-1 justify-center">
              <Plus size={16} />
              <h1 className="font-semibold text-sm text-slate-300 flex items-center gap-1">Add New Region</h1>
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Area Dialog */}
      <Dialog open={addAreaDialog} onOpenChange={setAddAreaDialog}>
        <DialogContent className="lg:w-[450px] max-h-[calc(100vh-200px)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Area</DialogTitle>
            <DialogDescription>Areas shown are listed based on assigned regions.</DialogDescription>
          </DialogHeader>
          <div className="">
            {businessAreas?.length === 0 && (
              <div className="flex items-center justify-center h-[10vh]">
                <h1 className="text-xs font-medium text-slate-300">No areas added.</h1>
              </div>
            )}
            {businessAreas?.map((area: any) => (
              <motion.div
                key={area?._id}
                whileTap={{ scale: 0.98 }} 
                whileHover={{ scale: 1.02 }}  
                onClick={() => setCurrentSelectedArea(area?._id)}
                className="bg-gradient-to-tr from-slate-800/60 to-slate-900/60 p-3 hover:border-cyan-500 border border-slate-700 select-none cursor-pointer rounded-lg mb-1.5 relative">
              <h1 className="font-semibold text-xs text-slate-300 flex items-center gap-1">{area?.area_name}</h1>
              {currentSelectedArea === area?._id && <div className="absolute right-2 top-1.5"><Check className="text-cyan-600" strokeWidth={3} size={17} /> </div>}
            </motion.div>
            ))}
            <motion.div
              whileTap={{ scale: 0.98 }} 
              whileHover={{ scale: 1.02 }}
              onClick={handleAddArea}
              className="bg-gradient-to-tr from-slate-700/50 to-slate-800/50 p-3 hover:border-cyan-500 border border-slate-700 select-none cursor-pointer rounded-lg mt-3 flex items-center gap-1 justify-center">
              <Plus size={16} />
              <h1 className="font-semibold text-sm text-slate-300 flex items-center gap-1">Add New Area</h1>
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Location Dialog */}
      <Dialog open={addLocationDialog} onOpenChange={setAddLocationDialog}>
        <DialogContent className="lg:w-[450px] max-h-[calc(100vh-200px)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Location</DialogTitle>
            <DialogDescription>Locations shown are listed based on assigned areas.</DialogDescription>
          </DialogHeader>
          <div className="">
            {businessLocations?.length === 0 && (
              <div className="flex items-center justify-center h-[10vh]">
                <h1 className="text-xs font-medium text-slate-300">No locations added.</h1>
              </div>
            )}
            {businessLocations?.map((location: any) => (
              <motion.div
                key={location?._id}
                whileTap={{ scale: 0.98 }} 
                whileHover={{ scale: 1.02 }}  
                onClick={() => setCurrentSelectedLocation(location?._id)}
                className="bg-gradient-to-tr from-slate-800/60 to-slate-900/60 p-3 hover:border-cyan-500 border border-slate-700 select-none cursor-pointer rounded-lg mb-1.5 relative">
              <h1 className="font-semibold text-xs text-slate-300 flex items-center gap-1">{location?.location_name}</h1>
              {currentSelectedLocation === location?._id && <div className="absolute right-2 top-1.5"><Check className="text-cyan-600" strokeWidth={3} size={17} /> </div>}
            </motion.div>
            ))}
            <motion.div
              whileTap={{ scale: 0.98 }} 
              whileHover={{ scale: 1.02 }}
              onClick={handleAddLocation}
              className="bg-gradient-to-tr from-slate-700/50 to-slate-800/50 p-3 hover:border-cyan-500 border border-slate-700 select-none cursor-pointer rounded-lg mt-3 flex items-center gap-1 justify-center">
              <Plus size={16} />
              <h1 className="font-semibold text-sm text-slate-300 flex items-center gap-1">Add New Location</h1>
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Skill Dialog */}
      <Dialog open={addSkillDialog} onOpenChange={setAddSkillDialog}>
        <DialogContent className="lg:w-[450px] max-h-[calc(100vh-200px)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Skill</DialogTitle>
            <DialogDescription>Select any of the business skill to add.</DialogDescription>
          </DialogHeader>
          <div className="pb-14">
            {businessSkills?.length === 0 && (
              <div className="flex items-center justify-center h-[10vh]">
                <h1 className="text-xs font-medium text-slate-300">No skills added.</h1>
              </div>
            )}
            {businessSkills?.map((skill: any) => (
              <motion.div
                key={skill?._id}
                whileTap={{ scale: 0.98 }} 
                whileHover={{ scale: 1.02 }}  
                onClick={() => setCurrentSelectedSkill(skill?._id)}
                className="bg-gradient-to-tr from-slate-800/60 to-slate-900/60 p-3 hover:border-cyan-500 border border-slate-700 select-none cursor-pointer rounded-lg mb-1.5 relative">
              <h1 className="font-semibold text-xs text-slate-300 flex items-center gap-1">{skill?.skill_name}</h1>
              {currentSelectedSkill === skill?._id && <div className="absolute right-2 top-1.5"><Check className="text-cyan-600" strokeWidth={3} size={17} /> </div>}
            </motion.div>
            ))}
          </div>
          <div className="sticky bottom-0 left-0 right-0 bg-slate-900/80 backdrop-blur-sm border-t border-slate-800 p-2">
            <motion.div
              whileTap={{ scale: 0.98 }} 
              whileHover={{ scale: 1.02 }}
              onClick={handleAddSkill}
              className="bg-gradient-to-tr from-slate-700/50 to-slate-800/50 p-3 hover:border-cyan-500 border border-slate-700 select-none cursor-pointer rounded-lg flex items-center gap-1 justify-center">
              <Plus size={16} />
              <h1 className="font-semibold text-sm text-slate-300 flex items-center gap-1">Add New Skill</h1>
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDocDialogOpen} onOpenChange={setDeleteDocDialogOpen}>
        <DialogContent className="max-w-sm max-h-[calc(100vh-200px)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Remove document?</DialogTitle>
            <DialogDescription>This will delete the file from storage and records.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setDeleteDocDialogOpen(false); setDocToDelete(null); }}>Cancel</Button>
            <Button variant="destructive" onClick={() => { if(docToDelete) handleRemoveDoc(docToDelete); setDeleteDocDialogOpen(false); setDocToDelete(null); }}>Remove</Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}

export default AddBusinessStaffDetails
