"use client"
import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, } from "@/components/ui/breadcrumb";
import { AlignStartVertical, Building2, EllipsisVertical, Eye, File, Files, InfoIcon, PencilRuler, Plus, StepForward, Trash, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAddBusinessAdmin, useEditBusinessAdmin, useGetBusinessById, useRemoveBusinessAdmin } from '@/query/business/queries';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/redux/store';
import { loadAdminBusiness, loadAdminBusinessAdmins, loadAdminBusinessDocs, loadAdminBusinessPlan } from '@/redux/slices/application';
import { Avatar, Popconfirm } from 'antd';
import { Popover, PopoverContent, PopoverTrigger, } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import LoaderSpin from '@/components/shared/LoaderSpin';
import { toast } from 'sonner';

const AdminPage = ({ params }: { params: any }) => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [businessInfo, setBusinessInfo] = useState<any>(null);
  const [businessPlan, setBusinessPlan] = useState<any>(null);
  const [businessAdmins, setBusinessAdmins] = useState<any[]>([]);
  const [businessDocs, setBusinessDocs] = useState<any[]>([]);

  // Unwrap the params promise
  const { adminid: adminId }: { adminid: string } = use(params);

  const { data: businessData, isLoading: loadingBusinessData } = useGetBusinessById(adminId);
  const { mutateAsync: addBusinessAdmin, isPending: addingNewAdmin } = useAddBusinessAdmin();
  const { mutateAsync: editBusinessAdmin, isPending: editingAdmin } = useEditBusinessAdmin();
  const { mutateAsync: removeBusinessAdmin, isPending: removingAdmin } = useRemoveBusinessAdmin();

  useEffect(() => {
    if (businessData?.data) {
      console.log(businessData?.data)
      setBusinessInfo(businessData?.data?.info);
      setBusinessPlan(businessData?.data?.plan);
      setBusinessAdmins(businessData?.data?.admins);
      setBusinessDocs(businessData?.data?.docs);
    }
  }, [businessData]);

  const handleCompleteBusiness = async () => {
    dispatch(loadAdminBusiness(businessData?.data?.info));
    dispatch(loadAdminBusinessPlan(businessData?.data?.plan));
    dispatch(loadAdminBusinessAdmins(businessData?.data?.admins));
    dispatch(loadAdminBusinessDocs(businessData?.data?.docs));
    router.push(`/superadmin/admins/add-admin/business`);
  }

  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [isEditAdmin, setIsEditAdmin] = useState(false);
  const [adminData, setAdminData] = useState<any>(null);

  const handleEditAdmin = (admin: any) => {
    setAdminData(admin);
    setIsEditAdmin(true);
    setAdminDialogOpen(true);
  }

  const handleAddAdminClick = () => {
    setIsEditAdmin(false);
    setAdminData(null);
    setAdminDialogOpen(true);
  }

  const handleAdminTypeChange = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    setAdminData({ ...adminData, [type]: e.target.value });
  }

  const handleAdminSubmit = async () => {
    const formData = new FormData();
    formData.append('body', JSON.stringify({
      _id: adminData?.user_id || '',
      admin_name: adminData?.admin_name || '',
      admin_email: adminData?.admin_email || '',
      admin_phone: adminData?.admin_phone || '',
      business_id: businessData?.data?.info?._id || '',
    }));
    console.log(adminData)
    if (isEditAdmin) {
      await editBusinessAdmin(formData);
      toast.success('Admin edited successfully.', {
        duration: 3000
      });
    } else {
      await addBusinessAdmin(formData);
      toast.success('Admin added successfully.', {
        duration: 3000
      });
    }
    setAdminDialogOpen(false);
    setAdminData(null);
  }

  const handleRemoveBusinessAdmin = async (adminId: string) => {
    const formData = new FormData();
    formData.append('body', JSON.stringify({ object_id: adminId }));
    await removeBusinessAdmin(formData);
    toast.success('Admin removed successfully.', {
      duration: 3000
    });
  }

  return (
    <div className="p-5 pb-10">
      <Breadcrumb className='mb-2'>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/superadmin/admins">Admin Management</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{businessInfo?.business_name || 'Business'}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      {(businessAdmins?.length === 0 || businessDocs?.length === 0 || !businessPlan) && <div className="bg-gradient-to-bl from-slate-950/50 to-cyan-950/50 p-3 rounded-lg my-2 flex items-center flex-wrap gap-2">
        <InfoIcon size={20} />
        <p>You have to complete the business details to make the business active.</p>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleCompleteBusiness} className='flex items-center gap-1 justify-center px-3 p-2 border-2 border-yellow-700 bg-gradient-to-bl from-slate-950/50 to-slate-900/50 rounded-lg cursor-pointer text-sm font-semibold'>
          <StepForward size={18} />
          <h1>Complete Now</h1>
        </motion.div>
      </div>}
      <div className="w-full flex flex-wrap">
        <div className="p-1 w-full lg:w-1/2">
          <div className="bg-slate-950/50 p-3 rounded-lg h-full">
            <h1 className='font-semibold text-sm flex items-center gap-2'> <Building2 size={18} /> Business Details</h1>
            <div className="mt-2">
              <h1 className='font-semibold text-lg'>{businessInfo?.business_name}</h1>
              <p className='rounded-lg text-sm text-slate-400'>{businessInfo?.business_email}</p>
              <p className='rounded-lg text-sm text-slate-400'>{businessInfo?.business_phone}</p>
              <p className='rounded-lg text-sm text-slate-400'>{businessInfo?.business_country ? `${businessInfo?.business_country}, ` : ''}{businessInfo?.business_province ? `${businessInfo?.business_province}, ` : ''}</p>
              <p className='rounded-lg text-sm text-slate-400'>{businessInfo?.business_city ? `${businessInfo?.business_city}, ` : ''}{businessInfo?.business_pin}</p>
            </div>
          </div>
        </div>
        <div className="p-1 w-full lg:w-1/2">
          {businessPlan ? <div className="bg-gradient-to-t from-slate-950/50 to-slate-900/50 p-3 rounded-lg h-full">
            <div className='flex items-center justify-between'>
              <h1 className='font-semibold text-sm flex items-center gap-2'> <AlignStartVertical size={18} /> Business Plan</h1>
              <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }} className='flex items-center gap-1 cursor-pointer bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-2 rounded-lg' onClick={handleCompleteBusiness}>
                <PencilRuler size={14} />
                <h1 className='text-xs font-semibold'>Change Plan</h1>
              </motion.div>
            </div>
            <div className="mt-2">
              <h1 className='font-semibold text-lg'>{businessPlan?.plan_id?.plan_name}</h1>
              <p className='rounded-lg text-sm text-slate-400'> Departments: <span className='font-semibold text-slate-200'>{businessPlan?.plan_id?.deps_count}</span></p>
              <p className='rounded-lg text-sm text-slate-400'> Staff: <span className='font-semibold text-slate-200'>{businessPlan?.plan_id?.staff_count}</span></p>
              <p className='rounded-lg text-sm text-slate-400'> Regions: <span className='font-semibold text-slate-200'>{businessPlan?.plan_id?.region_count}</span></p>
            </div>
          </div> :
            <div className="bg-gradient-to-t from-slate-950/50 to-slate-900/50 p-3 rounded-lg h-full">
              <h1 className='font-semibold text-sm flex items-center gap-2'> <AlignStartVertical size={18} /> Business Plan</h1>
              <div className="mt-2">
                <h1 className='font-semibold text-sm'>No plan assigned to business.</h1>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleCompleteBusiness} className='w-[200px] flex items-center border border-slate-800 hover:border-yellow-700 gap-1 justify-center px-3 p-2 mt-2 bg-gradient-to-bl from-slate-950/50 to-slate-900/50 rounded-lg cursor-pointer text-sm font-semibold'>
                  <StepForward size={18} />
                  <h1>Assign Now</h1>
                </motion.div>
              </div>
            </div>
          }
        </div>
      </div>
      <div className="w-full bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg m-1 lg:min-h-[30dvh] pb-10">
          <div className='w-full flex items-center justify-between'>
            <h1 className='font-semibold text-sm flex items-center gap-2'> <Users size={18} /> Business Admins</h1>
            <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }} onClick={handleAddAdminClick} className='w-[150px] flex items-center border border-slate-800 hover:border-yellow-700 gap-1 justify-center p-2 bg-gradient-to-bl from-slate-950/50 to-slate-900/50 rounded-lg cursor-pointer text-sm font-semibold'>
              <Plus size={18} />
              <h1 className='text-xs font-semibold'>Add Admin</h1>
            </motion.div>
          </div>
          {businessAdmins?.length === 0 && (
            <div className="mt-2 flex items-center justify-center">
              <p className="text-sm text-slate-400">No admins added.</p>
            </div>
          )}
          <div className="w-full flex flex-wrap">
            {businessAdmins?.map((admin: any) => (
              <div key={admin._id} className="w-full md:w-1/2 lg:w-1/3 p-1">
                <div className="bg-slate-950/50 p-3 rounded-lg relative">
                  <h1 className='font-semibold text-sm flex items-center gap-2'> <Avatar size={25} src={admin.admin_image || '/avatar.png'} /> {admin.admin_name}</h1>
                  <div className="mt-2">
                    <p className='rounded-lg text-sm text-slate-400'>{admin.admin_email}</p>
                    <p className='rounded-lg text-sm text-slate-400'>{admin.admin_phone}</p>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                        <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.09 }} className='absolute top-2 right-2 cursor-pointer'>
                            <EllipsisVertical size={20} />
                        </motion.div>
                    </PopoverTrigger>
                    <PopoverContent className='w-[100px] p-0 border border-slate-800 rounded-lg overflow-hidden'>
                        <div className='flex flex-col items-start gap-1 bg-black rounded-lg'>
                            <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }}
                                onClick={() => handleEditAdmin(admin)}
                                className='bg-slate-800/50 w-full p-1 py-2 text-yellow-500 cursor-pointer hover:text-yellow-700 flex items-center justify-start gap-1'
                            >
                                <PencilRuler size={16} />
                                <h1 className='text-xs font-semibold'>Edit</h1>
                            </motion.div>
                            <Popconfirm title="Are you sure to delete this plan?" onConfirm={() => handleRemoveBusinessAdmin(admin._id)}>
                                <div className='w-full'>
                                    <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }} className='bg-slate-800/50 w-full p-1 py-2 text-red-500 cursor-pointer hover:text-red-700 flex items-center justify-start gap-1'>
                                        <Trash size={16} />
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
          </div>
      </div>
      <div className="w-full bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 mt-2 rounded-lg m-1 lg:min-h-[20dvh] pb-10">
        <div className='flex items-center justify-between'>
          <h1 className='font-semibold text-sm flex items-center gap-2'> <Files size={18} /> Business Docs</h1>
          <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }} className='flex items-center gap-1 cursor-pointer bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-2 rounded-lg' onClick={handleCompleteBusiness}>
            <Plus size={14} />
            <h1 className='text-xs font-semibold'>Add Doc</h1>
          </motion.div>
        </div>
          {businessDocs?.length === 0 && (
            <div className="mt-2 flex items-center justify-center">
              <p className="text-sm text-slate-400">No docs added.</p>
            </div>
          )}
          <div className="w-full flex flex-wrap">
            {businessDocs?.map((doc: any) => (
              <div key={doc._id} className="w-full md:w-1/2 lg:w-1/4 p-1">
                <div className="bg-slate-950/50 p-3 rounded-lg flex items-center gap-2 justify-between">
                  <h1 className='font-semibold text-sm flex items-center gap-2'> <File size={25} /> {doc.doc_name}</h1>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => window.open(doc.doc_url, '_blank')} className='flex items-center gap-1 justify-center px-3 p-2 bg-gradient-to-bl from-slate-950/50 to-slate-900/50 rounded-lg cursor-pointer text-sm font-semibold'>
                    <Eye size={18} />
                  </motion.div>
                </div>
              </div>
            ))}
          </div>
      </div>

      <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
        <DialogContent className='lg:w-[450px] px-3 border border-slate-700'>
          <DialogHeader>
            <DialogTitle>{isEditAdmin ? 'Edit' : 'Add'} Admin</DialogTitle>
            <DialogDescription>{isEditAdmin ? 'Editing Admin will also reflect on the admin profile.' : 'New Admin will be added to the business.'}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <div className="">
              <Label className='text-xs font-semibold'>* Admin Name</Label>
              <Input value={adminData?.admin_name} onChange={(e) => handleAdminTypeChange(e, 'admin_name')} placeholder='admin name' />
            </div>
            <div className="">
              <Label className='text-xs font-semibold'>* Admin Email</Label>
              <Input value={adminData?.admin_email} onChange={(e) => handleAdminTypeChange(e, 'admin_email')} placeholder='admin email' />
            </div>
            <div className="">
              <Label className='text-xs font-semibold'>* Admin Phone</Label>
              <Input value={adminData?.admin_phone} onChange={(e) => handleAdminTypeChange(e, 'admin_phone')} placeholder='admin phone number' />
            </div>
          </div>
          <motion.div onClick={handleAdminSubmit} whileTap={{ scale: 0.98 }} className='bg-gradient-to-tr from-slate-900/70 to-slate-950/70 p-2 px-3 rounded-lg border border-slate-700 w-full flex items-center justify-center gap-2 mt-2 cursor-pointer hover:opacity-80'>
            {addingNewAdmin || editingAdmin ? (
              <>
                <LoaderSpin size={20} />
                <h1 className='text-sm font-semibold'>{isEditAdmin ? 'Editing...' : 'Adding...'}</h1>
              </>
            ) : (<>{isEditAdmin ? <PencilRuler size={20} /> : <Plus strokeWidth={3} size={20} />}
              <h1 className='text-sm font-semibold'>{isEditAdmin ? 'Edit' : 'Add'} Admin</h1></>)}
          </motion.div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdminPage