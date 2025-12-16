"use client"
import React, { FormEvent, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog"
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { toast } from 'sonner'
import { DialogDescription } from '@radix-ui/react-dialog'
import { useEditDepName } from '@/query/client/depQueries'

const EditDepartmentName = ({ trigger, department }:{ trigger: React.ReactNode, department: any }) => {
    const [input, setInput] = useState(department?.DepartmentName || '');
    const {mutateAsync: editDepName, isPending: editingDepName } = useEditDepName();
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const response = await editDepName({ depid: department?._id, newName: input });
        if(response?.existing){
            return toast.error("Department Name Already Exist.", { description: "Try with changing the name."});
        }
        return toast.success("Department Name successfully changed.")
    }
    return (
        <Dialog>
            <DialogTrigger>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Department Name</DialogTitle>
                    <DialogDescription className='text-xs text-slate-400'>This action will change your Deparment name if nothing alike exist.</DialogDescription>
                </DialogHeader>
                <div>
                    <form className="space-y-3" onSubmit={handleSubmit}>
                        <Input placeholder='Enter Department Name' value={input} onChange={(e) => setInput(e.target.value)} />
                        <div className="flex justify-end">
                            <Button type='submit' variant="ghost" className='border-border border'>{editingDepName ? 'Updating..' :'Update'}</Button>
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default EditDepartmentName