"use client"
import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog"
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { useAddNewRegion } from '@/query/client/adminQueries'
import { toast } from 'sonner'

const AddRegionDialog = ({ trigger }:{ trigger: React.ReactNode }) => {
    const { mutateAsync: addNewRegion, isPending: addingNewRegion } = useAddNewRegion();
    const [input, setInput] = useState('')
    const handleSubmit = async () => {
        if(!input || input.length <= 0){
            return toast.error("Not Entered Region Name.")
        }
        const response = await addNewRegion(input);
        if(response?.existing){
            return toast.error("Existing Region Name.", {
                description: "Failed to Create Region, Try Again."
            })
        }
        setInput('');
    }
    return (
        <Dialog>
            <DialogTrigger>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Region</DialogTitle>
                </DialogHeader>
                <div>
                    <form className="space-y-2" onSubmit={handleSubmit}>
                        <Input placeholder='Enter Region Name' value={input} onChange={(e) => setInput(e.target.value)} />
                        <div className="flex justify-end">
                            <Button type='submit' variant="ghost" className='border-border border'>{addingNewRegion? 'Processing...' : 'Create'}</Button>
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default AddRegionDialog
