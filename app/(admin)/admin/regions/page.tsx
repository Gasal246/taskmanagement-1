"use client"
import React from 'react';
import { Earth, EllipsisVertical, Eye, Plus, Trash2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/redux/store';
import { useAddBusinessRegion, useGetBusinessRegions, useRemoveBusinessRegion } from '@/query/business/queries'
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger, } from "@/components/ui/popover";
import { Popconfirm } from 'antd';
import { loadRegionData } from '@/redux/slices/application';
import { useRouter } from 'next/navigation';

const Regions = () => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { businessData } = useSelector((state: RootState) => state.user);
  const { mutateAsync: getRegions, isPending: loadingRegions } = useGetBusinessRegions();
  const { mutateAsync: addRegion, isPending: addingRegion } = useAddBusinessRegion();
  const { mutateAsync: removeRegion, isPending: removingRegion } = useRemoveBusinessRegion();

  const [allRegions, setAllRegions] = React.useState<any[]>([]);

  const handleFetchBusinessRegions = async () => {
    const res = await getRegions({ business_id: businessData?._id });
    if(res?.status == 200){
      setAllRegions(res?.data);
    }
  }

  React.useEffect(() => {
    if(businessData?._id){
      handleFetchBusinessRegions();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessData]);

  const [openAddDialog, setOpenAddDialog] = React.useState<boolean>(false);
  const [regionName, setRegionName] = React.useState<string>('');

  const handleAddRegion = async () => {
    if(!regionName) {
      return toast("Region name not entered.");
    }

    const formData = new FormData();
    formData.append('body', JSON.stringify({
      region_name: regionName,
      business_id: businessData?._id
    }))

    const res = await addRegion(formData);
    if(res?.status == 200){
      toast.success("Region added successfully.");
    }
    setRegionName('');
    setOpenAddDialog(false);
    handleFetchBusinessRegions();
  }

  const handleRemoveRegion = async (id: string) => {
    const res = await removeRegion(id);
    if(res?.status == 200){
      toast.success("Region removed successfully.");
    }
    handleFetchBusinessRegions();
  }

  const handleViewRegion = (id: string) => {
    dispatch(loadRegionData(allRegions?.find((region: any) => region?._id == id)));
    router.push(`/admin/regions/view-region`);
  }
  
  return (
    <div className="p-4 overflow-y-scroll h-full pb-20">
      <div className="flex justify-between bg-gradient-to-tr from-slate-950/70 to-slate-800/70 p-2 px-4 rounded-lg items-center">
        <h1 className='font-semibold text-md flex items-center gap-1'><Earth size={20} /> Region Management</h1>
        <motion.div
          whileTap={{ scale: 0.98 }}
          whileHover={{ scale: 1.02 }}
          className='p-2 bg-gradient-to-br from-slate-950/70 to-slate-800/70 rounded-lg cursor-pointer text-sm font-medium flex items-center gap-1 px-3 border border-slate-700 hover:border-cyan-600'
          onClick={() => setOpenAddDialog(true)}
        >
          <Plus size={18} />
          Add Region
        </motion.div>
      </div>

      <div className="mt-3 bg-gradient-to-tr from-slate-950/70 to-slate-800/70 p-2 px-4 rounded-lg min-h-[45vh]">
        <h1 className="text-xs font-medium text-slate-300 my-1">Business Regions</h1>
        {allRegions?.length === 0 && (
          <div className="flex items-center justify-center h-[15vh]">
            <h1 className="text-xs font-medium text-slate-300">No regions added.</h1>
          </div>
        )}
        <div className="flex flex-wrap">
          {allRegions?.map((region: any) => (
            <div className="w-full lg:w-3/12 p-1" key={region?._id}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-gradient-to-br from-slate-950/70 to-slate-800/70 p-2 px-4 rounded-lg relative border border-slate-700 hover:border-cyan-700 select-none cursor-pointer"
              >
                <h1 className='text-sm font-medium text-slate-200'>{region?.region_name}</h1>
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
                      <div className='w-full p-0.5 space-y-1'>
                        <motion.div 
                          whileTap={{ scale: 0.98 }} 
                          whileHover={{ scale: 1.02 }}
                          onClick={() => handleViewRegion(region?._id)}
                          className='bg-slate-800/50 w-full p-1 py-2 text-cyan-500 cursor-pointer hover:text-cyan-700 flex items-center justify-center gap-1 border border-dashed border-slate-700 rounded-lg'>
                          <Eye size={14} />
                          <h1 className='text-xs font-semibold'>View</h1>
                        </motion.div>
                        <Popconfirm title="Are you sure to delete this role?" onConfirm={() => handleRemoveRegion(region?._id)}>
                          <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }} className='bg-slate-800/50 w-full p-1 py-2 text-red-500 cursor-pointer hover:text-red-700 flex items-center justify-center gap-1 border border-dashed border-slate-700 rounded-lg'>
                            <Trash2 size={14} />
                            <h1 className='text-xs font-semibold'>Delete</h1>
                          </motion.div>
                        </Popconfirm>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </motion.div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={openAddDialog} onOpenChange={setOpenAddDialog}>
        <DialogContent className="lg:w-[450px]">
          <DialogHeader>
            <DialogTitle>Add Business Region</DialogTitle>
            <DialogDescription>Added Regions will be visible on all the selection fields for regions within this business.</DialogDescription>
          </DialogHeader>
          <div className="">
            <Input
              placeholder="Region Name"
              value={regionName}
              onChange={(e) => setRegionName(e.target.value)}
            />
            <motion.div
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: 1.02 }}
              className='p-2 bg-gradient-to-br mt-4 from-slate-950/70 to-slate-800/70 rounded-lg cursor-pointer text-sm font-medium flex items-center gap-1 px-3 border border-slate-700 hover:border-cyan-600'
              onClick={handleAddRegion}
            >
              Add New Region
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Regions