"use client"
import { Avatar, Popconfirm, Tooltip } from 'antd'
import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import ChangeAccessDocumentDialog from '../staff/ChangeAccessDocumentDialog'
import { FilePlus2, FileText, LockKeyhole, Menu } from 'lucide-react'
import AddProjectDocDialog from '../staff/AddProjectDocDialog'
import { useSession } from 'next-auth/react'
import { deleteObject, ref } from 'firebase/storage'
import { storage } from '@/firebase/config'
import { useDeleteProjectDoc } from '@/query/client/projectQueries'
import { toast } from 'sonner'
import Link from 'next/link'

interface Document {
    _id: string;
    AccessTo: {
        _id: string;
        Email: string;
        Name: string;
        AvatarUrl: string;
    }[];
    DocName: string;
    DocUrl: string;
}

interface User {
    _id: string;
    Name: string;
    Email: string;
    AvatarUrl: string;
    Department?: {
        DepartmentName: string;
    }
}

const ProjectDocuments = ({ projectId, documents, allUsers, creatorid, adminid }: { projectId: string, documents: Document[], allUsers: User[], creatorid: string, adminid: string }) => {
    const { data: session }: any = useSession();
    const [docnames, setDocnames] = useState<string[]>([]);
    const { mutateAsync: deleteProjectDoc, isPending: deletingProjectDoc } = useDeleteProjectDoc();
    useEffect(() => {
        if (documents?.length > 0) {
            const docnames = documents.map((doc) => doc.DocName);
            setDocnames(docnames);
        }
    }, [documents])

    const handleRemoveDoc = async (docid: string, docUrl: string) => {
        const fileRef = ref(storage, docUrl);
        await deleteObject(fileRef);
        try {
            const response = await deleteProjectDoc({ projectid: projectId, docid });
            if(response?._id){
                return toast.success("Document Deleted Successfully.")
            }else{
                return toast.error("Document deletion failed!!")
            }
        } catch (error) {
            console.log(error);
            return toast.error("Something went wrong on deleting doc!!")
        }
    }
    return (
        <div className='mb-5'>
            <h3 className='text-sm mb-1'>Documents:</h3>
            <div className="flex flex-wrap items-center">
                {documents?.map((doc: Document) => (
                    doc?.AccessTo?.some(x => x._id == session?.user?.id) &&
                    <div className={`w-full md:w-3/12 p-1`} key={doc?._id}>
                        <div className='w-full bg-slate-800 p-2 rounded-md border border-border cursor-pointer relative'>
                            <Link target='_blank' href={doc?.DocUrl}><h1 className='text-sm font-medium text-slate-300 flex gap-1 mb-1'><FileText size={18} />{doc?.DocName}</h1></Link>
                            <h3 className='text-xs font-medium text-slate-400 flex items-center gap-2'>Access To:
                                <Avatar.Group max={{ count: 3 }} size={20}>{doc?.AccessTo?.map(user => (
                                    <Tooltip key={user?._id} title={user?.Name} placement="top"><Avatar src={user?.AvatarUrl || '/avatar.png'} /></Tooltip>
                                ))}</Avatar.Group>
                            </h3>
                            <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.05 }} className='absolute top-2 right-2'>
                                <Popover>
                                    <PopoverTrigger><Tooltip title="Document Actions"><Menu size={18} className='hover:text-cyan-600' /></Tooltip></PopoverTrigger>
                                    <PopoverContent className='w-[120px] p-1 space-y-1'>
                                        <ChangeAccessDocumentDialog trigger={
                                            <motion.h1 whileTap={{ scale: 0.98 }} className='w-full bg-slate-600 hover:bg-slate-700 rounded-sm p-1 text-sm flex gap-1 items-center justify-center'> Change Access </motion.h1>
                                        } projectid={projectId} doc={doc} creatorid={creatorid} adminid={adminid} />
                                        <Popconfirm title="Remove Document ?" description="Are you sure about removing this document?" onConfirm={() => handleRemoveDoc(doc?._id, doc?.DocUrl)}><motion.button whileTap={{ scale: 0.98 }} className='w-full bg-slate-600 hover:bg-slate-700 rounded-sm p-1 text-sm flex gap-1 items-center justify-center'> Remove File </motion.button></Popconfirm>
                                    </PopoverContent>
                                </Popover>
                            </motion.div>
                        </div>
                    </div>
                ))}
                <div className="w-full md:w-2/12 p-1">
                    <div className="bg-slate-300 p-2 rounded-md">
                        <AddProjectDocDialog trigger={
                            <motion.h1 whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }} className='cursor-pointer bg-white text-black text-sm px-3 p-1 rounded-full flex font-bold gap-1'>Add Document <FilePlus2 size={18} /></motion.h1>
                        } projectId={projectId} users={allUsers} creatorid={creatorid} adminid={adminid} docnames={docnames} />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ProjectDocuments