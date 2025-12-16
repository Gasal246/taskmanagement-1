"use client"
import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog"
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { useAddSkillToStaff, useGetAllSkills } from '@/query/client/adminQueries'
import { toast } from 'sonner'
import { Select } from 'antd';
import { useSession } from 'next-auth/react'

const AddStaffSkillDialog = ({ trigger, staffid }: { trigger: React.ReactNode, staffid: string }) => {
    const [input, setInput] = useState('');
    const { data: session }: any = useSession();
    const { mutateAsync: addSkill, isPending: addingSkill } = useAddSkillToStaff();
    const { data: allSkills, isLoading: loadingAllSkills } = useGetAllSkills(session?.user?.id);

    const handleAddSkill = async () => {
        if (!input || input.length <= 0) { return }
        const response = await addSkill({ staffId: staffid, skill: input });
        if (response?.exists) {
            return toast.error("Skill Already Exist.")
        }
        setInput('')
        return toast.success("Skill Successfully Added.")
    }
    return (
        <Dialog>
            <DialogTrigger>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Skill</DialogTitle>
                </DialogHeader>
                <div className='flex flex-col gap-1'>
                    {allSkills?.Skills && (
                        <Select
                        showSearch
                        placeholder="Select the skill to add"
                        optionFilterProp="label"
                        onChange={(value: string) => setInput(value)}
                        options={allSkills.Skills.map((skill: string) => ({
                            label: skill,
                            value: skill,
                        }))}
                        getPopupContainer={(trigger) => trigger.parentNode}
                    />
                    )}<Button onClick={handleAddSkill} disabled={addingSkill}>{addingSkill ? 'adding..' : 'Continue'}</Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default AddStaffSkillDialog