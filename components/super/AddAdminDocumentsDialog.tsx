"use client"
import React, { use, useState } from 'react'
import { ConfigProvider, DatePicker, DatePickerProps, Input, Space, Upload, UploadProps } from 'antd';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog"
import { toast } from 'sonner';
import { CloudUpload } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/query/queryKeys';
import { Button } from '../ui/button';
import { useAddAdminDoc } from '@/query/client/superuserQueries';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '@/firebase/config';

const AddAdminDocumentsDialog = ({ trigger, adminId, updateTrigger }: { trigger: React.ReactNode, adminId: string, updateTrigger?: any }) => {
    const [docName, setDocName] = useState('');
    const [expDate, setExpDate] = useState('');
    const [rmdDate, setRmdDate] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const { mutateAsync: addAdminDocument, isPending: addingAdminDoc } = useAddAdminDoc()
    
    const onChangeExipiry: DatePickerProps['onChange'] = (date: any, dateString) => {
        setExpDate(date?.$d);
    }
    const onChangeRemind: DatePickerProps['onChange'] = (date: any, dateString) => {
        setRmdDate(date?.$d)
    }

    const handleFileSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]?.size > 500 * 1024) {
            setFile(null);
            return toast.error("File size exceeds 500KB.", { description: "Please select a smaller sized Document." });
        } else {
            setFile(e.target.files ? e.target.files[0] : null);
        }
    }
    const handleFileUpload = async () => {
        setLoading(true);
        const documentRef = ref(storage, `admin-docs/${adminId}/${Date.now() + "_" + docName}`);
        try {
            const formData = new FormData();
            await uploadBytes(documentRef, file as any);
            const docUrl = await getDownloadURL(documentRef);
            formData.append('docname', docName);
            formData.append('adminId', adminId);
            formData.append('expire', expDate);
            formData.append('remind', rmdDate);
            formData.append('docUrl', docUrl);
            const response = await addAdminDocument(formData);
            if(response?.AdminData){
                return toast.success("New Document Successfully added.")
            }
        } catch (error) {
            console.log(error);
            return toast.error("Something went wrong on uploading admin document.")
        } finally {
            setLoading(false);
        }
    }
    
    return (
        <Dialog>
            <DialogTrigger className='w-full'>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Upload Document</DialogTitle>
                    <DialogDescription>Upload a new document to server</DialogDescription>
                </DialogHeader>
                <div className="w-full">
                    <ConfigProvider
                        theme={{
                            token: {
                                // Seed Token
                                colorPrimary: 'gray',
                                borderRadius: 2,

                                // Alias Token
                                colorBgContainer: '#f6ffed',
                                colorTextPlaceholder: 'gray'
                            },
                        }}
                    >
                        <Space direction="vertical" className='w-full'>
                            <Input placeholder="Document Name" value={docName} onChange={(e) => setDocName(e.target.value)} />
                            <div className="flex flex-wrap gap-2">
                                <DatePicker onChange={onChangeExipiry} placeholder="Exipiring Date" />
                                <DatePicker onChange={onChangeRemind} placeholder="Remind Date" />
                            </div>
                            {/* <div className="max-w-[350px]">
                                <Upload {...props}><Button icon={<CloudUpload />}>Click to Upload</Button></Upload>
                            </div> */}
                            <Input type="file" placeholder='select your document' onChange={(e) => handleFileSelection(e)} />
                            {file && <Button disabled={loading} onClick={handleFileUpload}>{loading ? 'Adding...' : 'Submit'}</Button>}
                        </Space>
                    </ConfigProvider>
                </div>
            </DialogContent>
        </Dialog>

    )
}

export default AddAdminDocumentsDialog