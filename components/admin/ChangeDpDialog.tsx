/* eslint-disable react-hooks/exhaustive-deps */
"use-client"
import React, { useCallback, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog";
import { useDropzone } from 'react-dropzone'
import Image from 'next/image';
import { useUpdatePfp } from '@/query/client/adminQueries';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { storage } from "@/firebase/config";
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

const ChangeDpDialog = ({ trigger, userid, prevAvatar }: { trigger: React.ReactNode, userid: string, prevAvatar?: string }) => {
    const [file, setFile] = useState<File[]>([]);
    const [fileUrl, setFileUrl] = useState<any>(prevAvatar);
    const [loading, setLoading] = useState(false);
    const { mutateAsync: updatePfp, isPending: updateIsPending } = useUpdatePfp()
    const onDrop = useCallback(
        (acceptedFiles: any) => {
            if(acceptedFiles[0]?.size > 500 * 1024){
                return toast.error("File size exceeds 500KB.", { description: "Please upload a smaller sized image."});
            }
            setFile(acceptedFiles);
            setFileUrl(URL.createObjectURL(acceptedFiles[0]));
        },
        [file]
    );
    const { getRootProps, getInputProps } = useDropzone({
        onDrop,
        accept: {
            "image/*": [".png", ".jpeg", ".jpg", ".svg"],
        }
    });

    const handleUpdate = async () => {
        setLoading(true);
        const imageRef = ref(storage, `user-profiles/${userid}/pfp`);
        try {
            await uploadBytes(imageRef, file[0]);
            const docUrl = await getDownloadURL(imageRef);
            const formData = new FormData();
            // formData.append('file', file[0]);
            formData.append('userid', userid);
            formData.append('docUrl', docUrl);
            const response = await updatePfp({ formData });
            if(response?._id){
                return toast.success("Profile Pic Successfully Updated.")
            }else{
                throw new Error("Image updation failed on route.")
            }
        } catch (error) {
            console.log(error);
            return toast.error("Something went wrong on PFP update!!");
        }finally{
            setLoading(false)
        }
    }
    return (
        <Dialog>
            <DialogTrigger className='w-full'>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Change Profile Pic</DialogTitle>
                    <DialogDescription>click on the avatar or drag and drop to update your pfp.</DialogDescription>
                </DialogHeader>
                <div {...getRootProps()} style={{ width: 250, height: 250 }}>
                    <input {...getInputProps()} />
                    <Image
                        src={fileUrl}
                        alt="avatar"
                        className="w-full h-full object-cover rounded-xl"
                        width={200}
                        height={200}
                    />
                </div>
                <div className="flex justify-end">
                    {fileUrl != prevAvatar && <Button onClick={handleUpdate}>{loading ? 'Updating..' : 'Update'}</Button>}
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default ChangeDpDialog