"use client"
import { useEditAreaName } from '@/query/client/adminQueries';
import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog"
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { DialogDescription } from '@radix-ui/react-dialog';
import { toast } from 'sonner';

const EditAreaDialog = ({ areaData, trigger }: { areaData: any, trigger: React.ReactNode }) => {
    const [input, setInput] = useState(areaData?.Areaname || '');
    const { mutateAsync: editAreaName, isPending: edittingArea } = useEditAreaName();
    const handleSubmit = async () => {
        const response = await editAreaName({ name: input, areaid: areaData?._id });
        if(response?.existing){
            return toast.error("This Name is already existing for your areas.")
        }
        return toast.success("Area successfully updated.")
    }
    return (
        <Dialog>
            <DialogTrigger>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Area {areaData?.Areaname}</DialogTitle>
                    <DialogDescription className='text-xs text-slate-400'>This action will change your Region name if nothing alike exist.</DialogDescription>
                </DialogHeader>
                <div>
                    <form className="space-y-2" onSubmit={handleSubmit}>
                        <Input placeholder='Enter Region Name' value={input} onChange={(e) => setInput(e.target.value)} />
                        <div className="flex justify-end">
                            <Button type='submit' variant="ghost" className='border-border border'>{edittingArea? 'Updating...' : 'Update'}</Button>
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default EditAreaDialog