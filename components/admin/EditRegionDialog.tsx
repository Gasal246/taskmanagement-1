"use client"
import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog"
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { toast } from 'sonner'
import { DialogDescription } from '@radix-ui/react-dialog'
import { useEditRegionName } from '@/query/client/adminQueries'

const EditRegionDialog = ({ trigger, regionData }:{ trigger: React.ReactNode, regionData: any }) => {
    const [input, setInput] = useState(regionData?.RegionName || '');
    const { mutateAsync: editRegionName, isPending: edittingRegion } = useEditRegionName();
    const handleSubmit = async () => {
        const response = await editRegionName({ name: input, regionId: regionData?._id });
        if(response?.existing){
            return toast.error("This Name is already existing for your regions.")
        }
        return toast.success(" Region successfully updated.")
    }
    return (
        <Dialog>
            <DialogTrigger>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Region {regionData?.RegionName}</DialogTitle>
                    <DialogDescription className='text-xs text-slate-400'>This action will change your Region name if nothing alike exist.</DialogDescription>
                </DialogHeader>
                <div>
                    <form className="space-y-2" onSubmit={handleSubmit}>
                        <Input placeholder='Enter Region Name' value={input} onChange={(e) => setInput(e.target.value)} />
                        <div className="flex justify-end">
                            <Button type='submit' variant="ghost" className='border-border border'>{edittingRegion? 'Updating...' : 'Update'}</Button>
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default EditRegionDialog