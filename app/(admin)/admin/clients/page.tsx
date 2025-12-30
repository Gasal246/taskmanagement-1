"use client"
import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Check, MoveRight, PencilRuler, Plus, Trash2 } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { motion } from 'framer-motion';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog"
import { toast } from 'sonner';
import { useAddBusinessClient, useAddBusinessClientArea, useAddBusinessClientContact, useAddBusinessClientRegion, useGetBusinessClientCompleteDataById, useGetBusinessClients, useGetBusinessRegions, useGetRegionAreas, useRemoveBusinessClient, useRemoveBusinessClientArea, useRemoveBusinessClientContact, useRemoveBusinessClientRegion, useUpdateBusinessClient } from '@/query/business/queries';
import LoaderSpin from '@/components/shared/LoaderSpin';
import { Input } from '@/components/ui/input';
import { formatDateTiny } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select"
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const client_categories = [
  { value: 'government', label: 'Government' },
  { value: 'enterprise', label: 'Enterprise' },
  { value: 'sme', label: 'SME' },
  { value: 'startup', label: 'Startup' },
];

const client_industries = [
  { value: 'retail', label: 'Retail' },
  { value: 'service', label: 'Service' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'banking', label: 'Banking' },
  { value: 'education', label: 'Education' },
  { value: 'manufacturing', label: 'Manufacturing' },
];

const client_business_types = [
  { value: 'b2b', label: 'B2B' },
  { value: 'government', label: 'Government' },
  { value: 'non-profit', label: 'Non-Profit' },
  { value: 'private', label: 'Private' },
];

const ClientsPage = () => {
  const router = useRouter();
  const { businessData } = useSelector((state: RootState) => state.user);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [businessRegions, setBusinessRegions] = React.useState<any[]>([]);
  const [businessAreas, setBusinessAreas] = React.useState<any[]>([]);
  const [deleteName, setDeleteName] = React.useState(''); // region name, area name or contact name
  const [deleteId, setDeleteId] = React.useState(''); // region id, area id or contact id
  const [deleteType, setDeleteType] = React.useState<'region' | 'area' | 'contact' | ''>('');
  const [isEdit, setIsEdit] = React.useState(false);
  const [businessClients, setBusinessClients] = React.useState<any[]>([]);
  const [clientData, setClientData] = React.useState<any>(null);
  const [client_regions, setClientRegions] = React.useState<any[]>([]);
  const [client_areas, setClientAreas] = React.useState<any[]>([]);
  const [client_contacts, setClientContacts] = React.useState<any[]>([]);
  const [clientName, setClientName] = React.useState('');
  const [shortName, setShortName] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [industry, setIndustry] = React.useState('');
  const [businessType, setBusinessType] = React.useState('');
  const [taxVatNumber, setTaxVatNumber] = React.useState('');
  const [companyAddress, setCompanyAddress] = React.useState('');
  const [billingAddress, setBillingAddress] = React.useState('');

  const { mutateAsync: getRegions } = useGetBusinessRegions();
  const { mutateAsync: getAreas } = useGetRegionAreas();
  const { mutateAsync: getBusinessClients, isPending: loadingBusinessClients } = useGetBusinessClients();
  const { mutateAsync: addBusinessClient } = useAddBusinessClient();
  const { mutateAsync: getBusinessClientCompleteDataById, isPending: loadingClientComplete } = useGetBusinessClientCompleteDataById();
  const { mutateAsync: addClientRegion } = useAddBusinessClientRegion();
  const { mutateAsync: addClientArea } = useAddBusinessClientArea();
  const { mutateAsync: addClientContact } = useAddBusinessClientContact();
  const { mutateAsync: removeClientRegion } = useRemoveBusinessClientRegion();
  const { mutateAsync: removeClientArea } = useRemoveBusinessClientArea();
  const { mutateAsync: removeClientContact } = useRemoveBusinessClientContact();
  const { mutateAsync: removeBusinessClient, isPending: removingClient } = useRemoveBusinessClient();
  const { mutateAsync: updateBusinessClient, isPending: updatingClient } = useUpdateBusinessClient();

  const handleFetchBusinessClients = async () => {
    const res = await getBusinessClients(businessData?._id);
    if (res?.status == 200) {
      setBusinessClients(res?.data);
    }
  }

  const handleFetchBusinessRegions = async () => {
    const res = await getRegions({ business_id: businessData?._id });
    if (res?.status == 200) {
      setBusinessRegions(res?.data);
    }
  }

  const handleFetchBusinessAreas = async (region_ids: string[]) => {
    if (!region_ids?.length) {
      return;
    }
    const res = await getAreas({ region_ids });
    if (res?.status == 200) {
      setBusinessAreas(res?.data);
    }
  }

  useEffect(() => {
    if (!businessData) {
      router.replace('/admin')
    }
    if (businessData?._id) {
      handleFetchBusinessClients()
      handleFetchBusinessRegions()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessData]);

  const closeSheet = () => {
    setIsSheetOpen(false);
    setIsDeleteDialogOpen(false);
    setClientData(null);
    setClientRegions([]);
    setClientAreas([]);
    setClientContacts([]);
    setOpenAddRegionOrAreaDialog(false);
    setAddContactDialog(false);
    setCategory('');
    setIndustry('');
    setBusinessType('');
    setClientName('');
  }

  const [openAddRegionOrAreaDialog, setOpenAddRegionOrAreaDialog] = React.useState(false);
  const [addRegionOrAreaType, setAddRegionOrAreaType] = React.useState<'region' | 'area' | ''>('');
  const [currentSelectedRegion, setCurrentSelectedRegion] = React.useState('');
  const [regionAreaSearch, setRegionAreaSearch] = React.useState('');
  const regionAreaSearchTerm = regionAreaSearch.trim().toLowerCase();
  const filteredClientRegions = businessRegions.filter((region: any) => {
    const name = region?.region_name || '';
    return name.toLowerCase().includes(regionAreaSearchTerm);
  });
  const filteredClientAreas = businessAreas.filter((area: any) => {
    const name = area?.area_name || '';
    return name.toLowerCase().includes(regionAreaSearchTerm);
  });
  const handleClickAddClientRegion = () => {
    setRegionAreaSearch('');
    setOpenAddRegionOrAreaDialog(true)
    setAddRegionOrAreaType('region')
  }

  const handleAddRegion = async () => {
    if (!currentSelectedRegion) {
      return toast.error('Please select a region first')
    }
    const formData = new FormData();
    formData.append('body', JSON.stringify({ client_id: clientData?.id, region_id: currentSelectedRegion }));
    const res = await addClientRegion(formData);
    if (res?.status == 200) {
      toast.success('Region added successfully');
      setOpenAddRegionOrAreaDialog(false);
      setCurrentSelectedRegion('');
      handleFetchBusinessClients();
      handleFetchCompleteData(res?.data?.client_id);
    }
  }

  const [currentSelectedArea, setCurrentSelectedArea] = React.useState('');
  const handleClickAddClientArea = () => {
    setRegionAreaSearch('');
    setOpenAddRegionOrAreaDialog(true)
    setAddRegionOrAreaType('area')
  }

  const handleAddArea = async () => {
    if (!currentSelectedArea) {
      return toast.error('Please select an area first')
    }
    const formData = new FormData();
    formData.append('body', JSON.stringify({ client_id: clientData?.id, area_id: currentSelectedArea }));
    const res = await addClientArea(formData);
    if (res?.status == 200) {
      toast.success('Area added successfully');
      setOpenAddRegionOrAreaDialog(false);
      setCurrentSelectedArea('');
      handleFetchBusinessClients();
      handleFetchCompleteData(res?.data?.client_id);
    }
  }

  const [addContactDialog, setAddContactDialog] = React.useState(false);
  const [contactName, setContactName] = React.useState('');
  const [designation, setDesignation] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');

  const handleClickAddClientContact = () => {
    setAddContactDialog(true);
  }

  const handleAddClientContact = async () => {
    if(!contactName || !designation || !email || !phone) {
      return toast.error('Please fill all the fields')
    }
    const formData = new FormData();
    formData.append('body', JSON.stringify({ client_id: clientData?.id, contact_name: contactName, designation, email, phone }));
    const res = await addClientContact(formData);
    if (res?.status == 200) {
      toast.success('Contact added successfully');
      setAddContactDialog(false);
      setContactName('');
      setDesignation('');
      setEmail('');
      setPhone('');
      handleFetchCompleteData(res?.data?.client_id);
    }
  }
  const handleFetchCompleteData = async (client_id: string) => {
    const res = await getBusinessClientCompleteDataById(client_id);
    console.log("Client : ", res);
    if (res?.status == 200) {
      setClientData({ client_name: res?.data?.client_name, id: res?.data?.id, category: res?.data?.category, industry: res?.data?.industry, business_type: res?.data?.business_type, short_name: res?.data?.short_name, tax_number: res?.data?.tax_number, company_address: res?.data?.company_address, billing_address: res?.data?.billing_address });
      setClientRegions(res?.data?.regions);
      if(res?.data?.regions?.length > 0) {
        handleFetchBusinessAreas(res?.data?.regions?.map((region: any) => region?.region_id)); // fetching business areas of client regions.
      }
      setClientAreas(res?.data?.areas);
      setClientContacts(res?.data?.contacts);
      setIsSheetOpen(true);
    }
  }

  const [isAddClientDialogOpen, setIsAddClientDialogOpen] = React.useState(false);

  const handleAddClient = async () => {
    if(!clientName || !category || !industry || !businessType || !shortName || !taxVatNumber || !companyAddress || !billingAddress) {
      return toast.error('Please fill all the fields')
    }
    const formData = new FormData();
    formData.append('body', JSON.stringify({ business_id: businessData?._id, client_name: clientName, category, industry, business_type: businessType, short_name: shortName, tax_number: taxVatNumber, company_address: companyAddress, billing_address: billingAddress }))
    const res = await addBusinessClient(formData);
    if (res?.status == 200) {
      closeSheet();
      toast.success('Client added successfully');
      setIsAddClientDialogOpen(false)
      setClientName('');
      setClientData(res?.data);
      handleFetchCompleteData(res?.data?._id);
      handleFetchBusinessClients()
    }
  }

  const handleClickUpdateClient = () => {
    if(!clientData) {
      return toast.error("Client data is missing.");
    }
    setClientName(clientData?.client_name);
    setCategory(clientData?.category);
    setIndustry(clientData?.industry);
    setBusinessType(clientData?.business_type);
    setShortName(clientData?.short_name);
    setTaxVatNumber(clientData?.tax_number);
    setCompanyAddress(clientData?.company_address);
    setBillingAddress(clientData?.billing_address);
    setIsEdit(true);
    setIsAddClientDialogOpen(true);
  }

  const handleUpdateClient = async () => {
    console.log("Client Data : ", {
      clientName,
      category,
      industry,
      businessType,
      shortName,
      taxVatNumber,
      companyAddress,
      billingAddress
    });
    if(!clientName || !category || !industry || !businessType || !shortName || !taxVatNumber || !companyAddress || !billingAddress) {
      return toast.error('Please fill all the fields')
    }
    const formData = new FormData();
    formData.append('body', JSON.stringify({ client_id: clientData?.id, client_name: clientName, category, industry, business_type: businessType, short_name: shortName, tax_number: taxVatNumber, company_address: companyAddress, billing_address: billingAddress }))
    const res = await updateBusinessClient(formData);
    if (res?.status == 200) {
      closeSheet();
      toast.success('Client updated successfully');
      setIsAddClientDialogOpen(false)
      setClientName('');
      setClientData(res?.data);
      handleFetchCompleteData(res?.data?._id);
      handleFetchBusinessClients()
    }
  }

  const handleClickDelete = (type: 'region' | 'area' | 'contact', name: string, id: string) => {
    setDeleteId(id);
    setDeleteType(type);
    setDeleteName(name);
    setIsDeleteDialogOpen(true);
  }

  const handleDelete = async () => {
    if(!deleteId) {
      return toast.error("Nothing selected for deleting.", { description: "Delete ID is missing." });
    }
    let res;
    switch(deleteType) {
      case 'region': {
        res = await removeClientRegion(deleteId);
        if(res?.status == 200) {
          handleFetchCompleteData(res?.data?.client_id);
        }
      }; break;
      case 'area': {
        res = await removeClientArea(deleteId);
        if(res?.status == 200) {
          handleFetchCompleteData(res?.data?.client_id);
        }
      }; break;
      case 'contact': {
        res = await removeClientContact(deleteId);
        if(res?.status == 200) {
          handleFetchCompleteData(res?.data?.client_id);
        }
      }; break;
      default: break;
    }
    if(res?.status == 200) {
      toast.success(res?.message);
      setDeleteId('');
      setDeleteType('');
      setDeleteName('');
      setIsDeleteDialogOpen(false);
    } else {
      toast.error(res?.message || "Failed to delete.");
    }
  }

  const [isDeleteClientDialogOpen, setIsDeleteClientDialogOpen] = React.useState(false);
  const confirmClientDelete = () => {
    setIsDeleteClientDialogOpen(true);
  }
  const handleDeleteClient = async () => {
    if(!clientData?.id) {
      return toast.error("Client ID is missing.");
    }
    const res = await removeBusinessClient(clientData?.id);
    if(res?.status == 200) {
      toast.success(res?.message);
      closeSheet();
      handleFetchBusinessClients();
      setIsDeleteClientDialogOpen(false);
    } else {
      toast.error(res?.message || "Failed to delete.");
    }
  }

  return (
    <div className='p-4 pb-10'>
      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg mb-2">
        <h1 className='font-medium text-md text-slate-300 flex items-center gap-1'> <Building2 size={16} /> Business Clients</h1>
      </div>
      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg min-h-[40vh]">
        <div className="flex justify-between items-center">
          <h1 className='font-medium text-sm text-slate-300 flex items-center gap-1'> <Building2 size={14} /> Clients List</h1>
          <motion.div onClick={() => setIsAddClientDialogOpen(true)} whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }} className='bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-2 px-3 rounded-lg border border-slate-700 hover:border-cyan-600 cursor-pointer flex items-center gap-1 justify-center'>
            <Plus size={14} strokeWidth={2} className='text-slate-400 group-hover:text-cyan-600' />
            <h1 className='font-medium text-xs text-slate-300 flex items-center gap-1'>Add Client</h1>
          </motion.div>
        </div>
        <div className="flex flex-wrap">
          {!loadingBusinessClients && businessClients?.length === 0 && (
            <div className="flex items-center justify-center w-full h-[15vh]">
              <h1 className="text-xs text-slate-400">No Clients Added.</h1>
            </div>
          )}
          {loadingBusinessClients && (
            <div className="flex items-center justify-center w-full h-[15vh]">
              <LoaderSpin size={20} title="Loading Clients..." />
            </div>
          )}
          {businessClients?.map((client: any) => <div className="w-full lg:w-4/12 p-1" key={client?._id}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 p-2 px-3 rounded-lg border-slate-700 border select-none hover:border-cyan-700 cursor-pointer group flex items-center gap-1 justify-between"
              onClick={() => handleFetchCompleteData(client?._id)}
            >
              <h1 className='font-medium text-sm text-slate-300 flex items-center gap-1'>
                {client?.client_name}
              </h1>

              <motion.div
                initial={{ x: -20, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className='hidden group-hover:block group-focus:block'
              >
                <MoveRight size={20} strokeWidth={2} className='text-yellow-500 group-focus:text-cyan-500' />
              </motion.div>
            </motion.div>
          </div>)}
        </div>
      </div>

      {/* COMPLETE BUSINESS CLIENT PREVIEW */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className='min-w-full lg:min-w-[600px] border-cyan-900 px-2'>
          <SheetHeader className='p-2'>
            <SheetTitle>
              <div>
                <h1 className='font-medium text-xl text-slate-300'>{clientData?.client_name}</h1>
                <h1 className='font-medium text-sm text-slate-400 flex items-center gap-1'>{clientData?.short_name}</h1>
              </div>
            </SheetTitle>
            <SheetDescription>Client Since <span className='text-cyan-700'>{formatDateTiny(clientData?.created_at)}</span>, you can also make changes to client data or delete it in this preview.</SheetDescription>
          </SheetHeader>

          <div className='p-4 w-full h-[calc(100vh-200px)] overflow-y-scroll border-2 border-dashed rounded-lg border-slate-800'>
            {loadingClientComplete && <div className="w-full h-[50vh] flex items-center justify-center">
              <LoaderSpin size={50} title="Loading Client Data.." />
            </div>}

            {!loadingClientComplete && <div className='mb-4 space-y-2'>
              <h1 className='font-medium text-xs text-slate-400 flex items-center gap-1'>Client Details</h1>
              <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 p-2 px-3 rounded-lg border-slate-700 border select-none flex items-center gap-1 justify-between">
                <h1 className='capitalize text-sm text-slate-300'>{clientData?.business_type || '-'}</h1>
                <h1 className='font-medium text-xs text-slate-400 flex items-center gap-1'>Business Type</h1>
              </div>
              <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 p-2 px-3 rounded-lg border-slate-700 border select-none flex items-center gap-1 justify-between">
                <h1 className='capitalize text-sm text-slate-300'>{clientData?.category || '-'}</h1>
                <h1 className='font-medium text-xs text-slate-400 flex items-center gap-1'>Category</h1>
              </div>
              <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 p-2 px-3 rounded-lg border-slate-700 border select-none flex items-center gap-1 justify-between">
                <h1 className='capitalize text-sm text-slate-300'>{clientData?.industry || '-'}</h1>
                <h1 className='font-medium text-xs text-slate-400 flex items-center gap-1'>Industry</h1>
              </div>
            </div>}

            {!loadingClientComplete && <div className='mb-4 space-y-2'>
              <h1 className='font-medium text-xs text-slate-400 flex items-center gap-1'>Office & Billing</h1>
              <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 p-2 px-3 rounded-lg border-slate-700 border select-none flex items-center gap-1 justify-between">
                <h1 className='capitalize text-sm text-slate-300'>Tax / VAT Number</h1>
                <h1 className='font-medium text-xs text-slate-400 flex items-center gap-1'>{clientData?.tax_number || '-'}</h1>
              </div>
              <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 p-2 px-3 rounded-lg border-slate-700 border select-none flex items-center gap-1 justify-between">
                <h1 className='capitalize text-sm text-slate-300'>Company Address</h1>
                <div className='font-medium text-xs text-slate-400 flex items-center gap-1'>{clientData?.company_address || '-'}</div>
              </div>
              <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 p-2 px-3 rounded-lg border-slate-700 border select-none flex items-center gap-1 justify-between">
                <h1 className='capitalize text-sm text-slate-300'>Billing Address</h1>
                <div className='font-medium text-xs text-slate-400 flex items-center gap-1'>{clientData?.billing_address || '-'}</div>
              </div>
            </div>}

            <div className="mb-5">
              <div className='flex items-center gap-1'>
                <h1 className='font-medium text-xs text-slate-400 flex items-center gap-1 pl-1'>Client Regions</h1>
                <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }} className='hover:bg-slate-700/50 bg-slate-800/40 p-1 px-3 rounded-full cursor-pointer flex items-center gap-1 justify-center' onClick={handleClickAddClientRegion}>
                  <Plus size={14} strokeWidth={2} className='text-slate-400 group-hover:text-cyan-600' />
                  <h1 className='font-medium text-xs text-slate-300 flex items-center gap-1'>Add Region</h1>
                </motion.div>
              </div>
              {!loadingClientComplete && client_regions?.length === 0 && <div className="py-3 flex items-center justify-center">
                <h1 className='font-medium text-xs text-slate-400 flex items-center gap-1 pl-1 text-center'>No Regions Added.</h1>
              </div>}
              {!loadingClientComplete && client_regions?.length > 0 && <div className="flex flex-wrap">
                {client_regions?.map((region: any) => <div className="w-full lg:w-1/2 p-1" key={region?._id}>
                  <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 p-2 px-3 rounded-lg border-slate-700 border select-none hover:border-cyan-700 cursor-pointer group flex items-center gap-1 justify-between relative">
                    <h1 className='font-medium text-xs text-slate-300 flex items-center gap-1'>{region?.data?.region_name}</h1>
                    <motion.div 
                      whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }} 
                      className='absolute right-2 top-1 hover:bg-slate-700/50 p-1 rounded-full cursor-pointer' 
                      onClick={() => handleClickDelete('region', region?.data?.region_name, region?._id)}>
                      <Trash2 size={14} strokeWidth={2} className='text-slate-400 group-hover:text-red-600' />
                    </motion.div>
                  </div>
                </div>)}
              </div>}
            </div>

            <div className="mb-5">
              <div className='flex items-center gap-1'>
                <h1 className='font-medium text-xs text-slate-400 flex items-center gap-1 pl-1'>Client Areas</h1>
                <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }} className='hover:bg-slate-700/50 bg-slate-800/40 p-1 px-3 rounded-full cursor-pointer flex items-center gap-1 justify-center' onClick={handleClickAddClientArea}>
                  <Plus size={14} strokeWidth={2} className='text-slate-400 group-hover:text-cyan-600' />
                  <h1 className='font-medium text-xs text-slate-300 flex items-center gap-1'>Add Area</h1>
                </motion.div>
              </div>
              {!loadingClientComplete && client_areas?.length === 0 && <div className="py-3 flex items-center justify-center">
                <h1 className='font-medium text-xs text-slate-400 flex items-center gap-1 pl-1 text-center'>No Areas Added.</h1>
              </div>}
              {loadingClientComplete && <div className="w-full h-[50vh] flex items-center justify-center">
                <LoaderSpin size={50} title="Loading Client Areas..." />
              </div>}
              {!loadingClientComplete && client_areas?.length > 0 && <div className="flex flex-wrap">
                {client_areas?.map((area: any) => <div className="w-full lg:w-1/2 p-1" key={area?._id}>
                  <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 p-2 px-3 rounded-lg border-slate-700 border select-none hover:border-cyan-700 cursor-pointer group flex items-center gap-1 justify-between relative">
                    <h1 className='font-medium text-xs text-slate-300 flex items-center gap-1'>{area?.data?.area_name}</h1>
                    <motion.div 
                      whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }} 
                      className='absolute right-2 top-1 hover:bg-slate-700/50 p-1 rounded-full cursor-pointer' 
                      onClick={() => handleClickDelete('area', area?.data?.area_name, area?._id)}>
                      <Trash2 size={14} strokeWidth={2} className='text-slate-400 group-hover:text-red-600' />
                    </motion.div>
                  </div>
                </div>)}
              </div>}
            </div>

            <div className="mb-10">
              <div className='flex items-center gap-1'>
                <h1 className='font-medium text-xs text-slate-400 flex items-center gap-1 pl-1'>Client Contacts</h1>
                <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }} className='hover:bg-slate-700/50 bg-slate-800/40 p-1 px-3 rounded-full cursor-pointer flex items-center gap-1 justify-center' onClick={handleClickAddClientContact}>
                  <Plus size={14} strokeWidth={2} className='text-slate-400 group-hover:text-cyan-600' />
                  <h1 className='font-medium text-xs text-slate-300 flex items-center gap-1'>Add Contact</h1>
                </motion.div>
              </div>
              {!loadingClientComplete && client_contacts?.length === 0 && <div className="py-3 flex items-center justify-center">
                <h1 className='font-medium text-xs text-slate-400 flex items-center gap-1 pl-1 text-center'>No Contact Information.</h1>
              </div>}
              {!loadingClientComplete && client_contacts?.length > 0 && <div className="flex flex-wrap">
                {client_contacts?.map((contact: any) => <div className="w-full lg:w-1/2 p-1" key={contact?._id}>
                  <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 p-2 px-3 rounded-lg border-slate-700 border select-none hover:border-cyan-700 cursor-pointer group relative">
                    <h1 className='font-medium text-sm text-slate-300 flex items-center gap-1 capitalize'>{contact?.contact_name}</h1>
                    <p className='text-[10px] text-slate-400 group-hover:text-cyan-500 uppercase mb-1'>{contact?.designation}</p>
                    <div>
                      <h1 className='flex items-center gap-1 text-xs text-slate-300'><span className='text-slate-400 text-[10px] uppercase'>Email</span> <span className='font-medium'>{contact?.email}</span></h1>
                      <h1 className='flex items-center gap-1 text-xs text-slate-300'><span className='text-slate-400 text-[10px] uppercase'>Phone</span> <span className='font-medium group-hover:text-cyan-500'>{contact?.phone}</span></h1>
                    </div>
                    <motion.div 
                      whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }} 
                      className='absolute right-2 top-1 hover:bg-slate-700/50 p-1 rounded-full cursor-pointer' 
                      onClick={() => handleClickDelete('contact', contact?.contact_name, contact?._id)}>
                      <Trash2 size={14} strokeWidth={2} className='text-slate-400 group-hover:text-red-600' />
                    </motion.div>
                  </div>
                </div>)}
              </div>}
            </div>

          </div>

          <SheetFooter className='absolute bottom-0 left-0 right-0 p-4'>
          <motion.div
                whileTap={{ scale: 0.98 }}
                className='w-full flex items-center gap-1 cursor-pointer bg-gradient-to-br from-red-800/50 hover:from-red-600/50 to-red-900/50 hover:to-red-500/50 p-2 px-3 rounded-lg  justify-center group'
                onClick={confirmClientDelete}
                >
                <Trash2 size={14} strokeWidth={2} className='text-slate-400 group-hover:text-white' />
                {!removingClient && <h1 className='font-medium text-sm text-slate-400 flex items-center gap-1 group-hover:text-white'>Delete Client</h1>}
                {removingClient && <LoaderSpin size={22} />}
              </motion.div>
          <motion.div
                whileTap={{ scale: 0.98 }}
                className='w-full flex items-center gap-1 cursor-pointer bg-gradient-to-br from-purple-800/50 hover:from-purple-800/50 to-slate-900/50 hover:to-slate-700/50 p-2 px-3 rounded-lg  justify-center group'
                onClick={handleClickUpdateClient}
                >
                <PencilRuler size={14} strokeWidth={2} className='text-slate-400 group-hover:text-white' />
                {!updatingClient && <h1 className='font-medium text-sm text-slate-400 flex items-center gap-1 group-hover:text-white'>Update Client</h1>}
                {updatingClient && <LoaderSpin size={22} />}
              </motion.div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className='w-full lg:w-[450px] border-cyan-900'>
          <DialogHeader>
            <DialogTitle className='capitalize'>Removing Client {deleteType} ?</DialogTitle>
            <DialogDescription>Are you sure want to remove {deleteType} <span className='font-medium text-cyan-700 capitalize'>{deleteName}</span> ?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <motion.div 
              whileTap={{ scale: 0.98 }} 
              whileHover={{ scale: 1.02 }} 
              onClick={handleDelete}
              className='w-full flex items-center gap-1 cursor-pointer bg-gradient-to-br from-red-800/50 hover:from-red-600/50 to-red-900/50 hover:to-red-500/50 p-2 px-3 rounded-lg  justify-center group'>
              <Trash2 size={14} strokeWidth={2} className='text-slate-400 group-hover:text-white' />
              <h1 className='font-medium text-sm text-slate-400 flex items-center gap-1 group-hover:text-white'>Confirm Remove</h1>
            </motion.div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Client Dialog */}
      <Dialog open={isDeleteClientDialogOpen} onOpenChange={setIsDeleteClientDialogOpen}>
        <DialogContent className='w-full lg:w-[450px] border-cyan-900'>
          <DialogHeader>
            <DialogTitle className='capitalize'>Removing Client ?</DialogTitle>
            <DialogDescription>Are you sure want to remove the {clientData?.client_name} ?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <motion.div 
              whileTap={{ scale: 0.98 }} 
              whileHover={{ scale: 1.02 }} 
              onClick={handleDeleteClient}
              className='w-full flex items-center gap-1 cursor-pointer bg-gradient-to-br from-red-800/50 hover:from-red-600/50 to-red-900/50 hover:to-red-500/50 p-2 px-3 rounded-lg  justify-center group'>
              <Trash2 size={14} strokeWidth={2} className='text-slate-400 group-hover:text-white' />
              <h1 className='font-medium text-sm text-slate-400 flex items-center gap-1 group-hover:text-white'>Confirm Remove</h1>
            </motion.div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Client Dialog */}
      <Dialog open={isAddClientDialogOpen} onOpenChange={setIsAddClientDialogOpen}>
        <DialogContent className='w-full lg:w-[500px] border-cyan-900'>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Update Client" : "Add Client"}</DialogTitle>
            <DialogDescription>Clients to the business for managing projects under clients.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div>
              <Label className='text-xs text-slate-400'>Client Name</Label>
              <Input name="client_name" placeholder="Client Name" value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </div>
            <div>
              <Label className='text-xs text-slate-400'>Short Name</Label>
              <Input name="short_name" placeholder="Short Name" value={shortName} onChange={(e) => setShortName(e.target.value)} />
            </div>
            <div>
              <Label className='text-xs text-slate-400'>Client Category</Label>
              <Select onValueChange={(value) => setCategory(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Client Category" />
                </SelectTrigger>
                <SelectContent>
                  {client_categories.map((category: any) => (
                    <SelectItem value={category.value} className='hover:bg-slate-900' key={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                  <SelectItem className='hover:bg-slate-900' key="none" value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className='text-xs text-slate-400'>Client Industry</Label>
              <Select onValueChange={(value) => setIndustry(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Client Industry" />
                </SelectTrigger>
                <SelectContent>
                  {client_industries.map((industry: any) => (
                    <SelectItem className='hover:bg-slate-900' key={industry.value} value={industry.value}>
                      {industry.label}
                    </SelectItem>
                  ))}
                  <SelectItem className='hover:bg-slate-900' key="none" value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className='text-xs text-slate-400'>Client Business Type</Label>
              <Select onValueChange={(value) => setBusinessType(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Client Business Type" />
                </SelectTrigger>
                <SelectContent>
                  {client_business_types.map((type: any) => (
                    <SelectItem className='hover:bg-slate-900' key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                  <SelectItem className='hover:bg-slate-900' key="none" value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className='text-xs text-slate-400'>Tax / VAT Number</Label>
              <Input placeholder="Tax / VAT Number" value={taxVatNumber} onChange={(e) => setTaxVatNumber(e.target.value)} />
            </div>
            <div>
              <Label className='text-xs text-slate-400'>Company Address</Label>
              <Textarea placeholder="Company Address" value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} />
            </div>
            <div>
              <Label className='text-xs text-slate-400'>Billing Address</Label>
              <Textarea placeholder="Billing Address" value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} />
            </div>
            <motion.div 
              whileTap={{ scale: 0.98 }} 
              whileHover={{ scale: 1.02 }} 
              onClick={isEdit ? handleUpdateClient : handleAddClient}
              className='w-full bg-gradient-to-br mt-3 from-slate-950/50 to-slate-900/50 p-2 px-3 rounded-lg border-slate-700 border select-none hover:border-cyan-700 cursor-pointer group flex items-center gap-1 justify-center relative'>
              <Plus size={14} strokeWidth={2} className='text-slate-400 group-hover:text-cyan-600' />
              <h1 className='font-medium text-xs text-slate-300 flex items-center gap-1'>{isEdit ? "Update" : "Add"} Client</h1>
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Client Contact Dialog */}
      <Dialog open={addContactDialog} onOpenChange={setAddContactDialog}>
        <DialogContent className='w-full lg:w-[500px] border-cyan-900'>
          <DialogHeader>
            <DialogTitle>Add Client Contact</DialogTitle>
            <DialogDescription>Client contact information, for business client communication.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input placeholder="Contact Name" value={contactName} onChange={(e) => setContactName(e.target.value)} /> 
            <Input placeholder="Designation" value={designation} onChange={(e) => setDesignation(e.target.value)} /> 
            <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} /> 
            <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} /> 
            <motion.div 
              whileTap={{ scale: 0.98 }} 
              whileHover={{ scale: 1.02 }} 
              onClick={handleAddClientContact}
              className='w-full bg-gradient-to-br mt-3 from-slate-950/50 to-slate-900/50 p-2 px-3 rounded-lg border-slate-700 border select-none hover:border-cyan-700 cursor-pointer group flex items-center gap-1 justify-center relative'>
              <Plus size={14} strokeWidth={2} className='text-slate-400 group-hover:text-cyan-600' />
              <h1 className='font-medium text-xs text-slate-300 flex items-center gap-1'>Add Client</h1>
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Area or Region Dialog */}
      <Dialog open={openAddRegionOrAreaDialog} onOpenChange={setOpenAddRegionOrAreaDialog}>
        <DialogContent className='w-full lg:w-[450px] max-h-[70vh] flex flex-col border-cyan-900'>
          <DialogHeader>
            <DialogTitle>{addRegionOrAreaType === 'region' ? 'Add Client Region' : 'Add Client Area'}</DialogTitle>
            <DialogDescription>Clients assigning will be based on their assigned region or area</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              placeholder={addRegionOrAreaType === 'region' ? "Search regions by name" : "Search areas by name"}
              value={regionAreaSearch}
              onChange={(e) => setRegionAreaSearch(e.target.value)}
            />
          </div>
          <div className="relative flex-1 overflow-y-auto pb-16">
            {addRegionOrAreaType === 'region' ? (
              <>
                {filteredClientRegions?.length === 0 && (
                  <div className="flex items-center justify-center h-[10vh]">
                    <h1 className="text-xs text-yellow-600">{regionAreaSearchTerm ? "No matching regions." : "No Business Regions Found."}</h1>
                  </div>
                )}
                {filteredClientRegions?.map((region: any) => (
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
              </>
            ) : (
              <>
                {filteredClientAreas?.length === 0 && (
                  <div className="flex items-center justify-center h-[10vh]">
                    <h1 className="text-xs text-yellow-600">{regionAreaSearchTerm ? "No matching areas." : "!! You must add Client Regions first."}</h1>
                  </div>
                )}
                {filteredClientAreas?.map((area: any) => (
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
              </>
            )}
          </div>
          <DialogFooter className="w-full">
            <div className="pt-2 bg-slate-950/80 w-full">
              <motion.div
                whileTap={{ scale: 0.98 }}
                whileHover={{ scale: 1.02 }}
                onClick={addRegionOrAreaType === 'region' ? handleAddRegion : handleAddArea}
                className="bg-gradient-to-tr from-slate-700/50 to-slate-800/50 p-3 hover:border-cyan-500 border border-slate-700 select-none cursor-pointer rounded-lg flex items-center gap-1 justify-center">
                <Plus size={16} />
                <h1 className="font-semibold text-sm text-slate-300 flex items-center gap-1">{addRegionOrAreaType === 'region' ? "Add New Region" : "Add New Area"}</h1>
              </motion.div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  )
}

export default ClientsPage
