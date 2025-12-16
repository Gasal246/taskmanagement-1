"use client"
import { motion } from 'framer-motion';
import React, { useEffect } from 'react';
import { Cog, Trash2 } from 'lucide-react';
import { Plus } from 'lucide-react';
import { Popconfirm } from 'antd';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import LoaderSpin from '@/components/shared/LoaderSpin';
import { useAddApplicationRole, useGetApplicationRoles, useRemoveRole } from '@/query/superadmin/query';
import { toast } from 'sonner';

const RolesPage = () => {
    const [roleDialogOpen, setRoleDialogOpen] = React.useState(false);
    const [role_number, setRoleNumber] = React.useState(0);
    const [role_name, setRoleName] = React.useState<string>('');

    const { mutateAsync: addNewRole, isPending: addingNewRole } = useAddApplicationRole();
    const { mutateAsync: deleteRole, isPending: deletingRole } = useRemoveRole();
    const { data: rolesResponse, isLoading: rolesLoading } = useGetApplicationRoles();

    const [roles, setRoles] = React.useState<any>([]);

    useEffect(() => {
        if(rolesResponse?.status === 200) {
            setRoles(rolesResponse?.data);
        }
    }, [rolesResponse])

    const handleAddRole = async () => {
        if(!role_number || !role_name) {
            toast.error("Please fill all the fields");
            return;
        }
        const formData = new FormData();
        formData.append('body', JSON.stringify({ role_number, role_name }));
        const response = await addNewRole(formData);
        if(response?.status === 200) {
            toast.success("Role added successfully");
        }else{
            toast.error("Failed to add role");
        };
        setRoleDialogOpen(false);
        setRoleNumber(0);
        setRoleName('');
    };

    const handleRemoveRole = async (id: string) => {
        const response = await deleteRole(id);
        if(response?.status === 200) {
            toast.success("Role deleted successfully");
        }else{
            toast.error("Failed to delete role");
        }
    }

    return (
        <div className="p-5 pb-10">
            <div className="bg-gradient-to-tr from-slate-900/70 to-slate-950/70 p-2 rounded-lg flex items-center justify-between px-5">
                <div className="flex items-center gap-1">
                    <Cog size={30} />
                    <div className="">
                        <h1 className="text-lg font-semibold leading-6">Manage App Roles</h1>
                        <h1 className="text-sm leading-5 text-slate-400">Manage your application roles here</h1>
                    </div>
                </div>
                <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }}
                    onClick={() => { setRoleDialogOpen(true) }}
                    className='bg-gradient-to-tr from-cyan-900/70 border border-cyan-950/70 hover:border-yellow-700/80 to-cyan-950/70 p-2 px-3 rounded-lg flex items-center gap-2 cursor-pointer hover:opacity-80'
                >
                    <Plus strokeWidth={3} size={18} />
                    <h1 className="text-sm font-semibold">Add Role</h1>
                </motion.div>
            </div>
            <div className="mt-2 bg-gradient-to-tr from-slate-900/70 to-slate-950/70 p-3 px-4 rounded-lg min-h-[40dvh]">
                <div className="flex items-center gap-1">
                    <h1 className="font-semibold text-sm flex items-center gap-1"> <Cog size={16} /> Application Roles</h1>
                </div>
                {roles?.length === 0 ? (
                    <div className="w-full flex items-center justify-center">
                        <h1 className="text-sm font-semibold text-slate-400">No roles found</h1>
                    </div>
                ) : (
                    <div className="w-full flex flex-wrap mt-2">
                    {roles?.map((role: any) => (
                        <div key={role?._id} className="w-full lg:w-3/12 p-1">
                        <div className="bg-gradient-to-tr from-slate-900/70 to-slate-950/70 p-3 rounded-lg relative">
                            <h1 className="font-semibold text-xs text-yellow-600">Prio: <span className='font-bold text-sm text-slate-200'>{role?.role_number}</span></h1>
                            <h1 className="font-semibold text-xs text-yellow-600">Slug: <span className='font-bold text-sm text-slate-200'>{role?.role_name}</span></h1>
                            <Popconfirm title="Are you sure you want to delete this role?" onConfirm={() => {handleRemoveRole(role?._id)}}>
                                <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }} className='absolute top-2 right-2 cursor-pointer text-red-600 hover:text-red-800'>
                                    <Trash2 size={20} />
                                </motion.div>
                            </Popconfirm>
                        </div>
                    </div>
                    ))}
                </div>
                )}
            </div>
            <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
                <DialogContent className='lg:w-[450px] px-3 border border-slate-700'>
                    <DialogHeader>
                        <DialogTitle>Add Role</DialogTitle>
                        <DialogDescription>The Roles desides the priority and siniority of the user.</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-2">
                        <div className="">
                            <Label className='text-xs font-semibold'>* Role Number</Label>
                            <Input value={role_number} onChange={(e) => setRoleNumber(Number(e.target.value))} placeholder='role number' />
                        </div>
                        <div className="">
                            <Label className='text-xs font-semibold'>* Role Name</Label>
                            <Input value={role_name} onChange={(e) => setRoleName(e.target.value)} placeholder='role name' />
                        </div>
                    </div>
                    <motion.div onClick={handleAddRole} whileTap={{ scale: 0.98 }} className='bg-gradient-to-tr from-slate-900/70 to-slate-950/70 p-2 px-3 rounded-lg border border-slate-700 w-full flex items-center justify-center gap-2 mt-2 cursor-pointer hover:opacity-80'>
                        {addingNewRole ? (
                            <>
                                <LoaderSpin size={20} />
                                <h1 className='text-sm font-semibold'>Adding...</h1>
                            </>
                        ) : (<>
                            <Plus strokeWidth={3} size={20} />
                            <h1 className='text-sm font-semibold'>Add Role</h1>
                        </>)}
                    </motion.div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default RolesPage;

