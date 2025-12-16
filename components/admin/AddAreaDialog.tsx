"use client"
import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog"
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { useAddNewArea } from '@/query/client/adminQueries'
import { toast } from 'sonner'

const AddAreaDialog = ({ trigger, regionId }: { trigger: React.ReactNode, regionId: string }) => {
    const [input, setInput] = useState('');
    const { mutateAsync: addNewArea, isPending: addingNewArea } = useAddNewArea();
    const handleSubmit = async () => {
        const response = await addNewArea({ name: input, regionId: regionId });
        if(response?.existing){
            return toast.error("Area name already Exist.")
        }
        setInput('');
        return toast.success("Area Successfully added");
    }
    return (
        <Dialog>
            <DialogTrigger>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Area</DialogTitle>
                </DialogHeader>
                <div>
                    <form className="space-y-2" onSubmit={handleSubmit}>
                        <Input placeholder='Enter Area Name' value={input} onChange={(e) => setInput(e.target.value)} />
                        <div className="flex justify-end">
                            <Button type='submit' variant="ghost" className='border-border border'>{addingNewArea ? 'Creating...' : 'Create'}</Button>
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default AddAreaDialog