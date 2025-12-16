"use client"
import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import Image from 'next/image';
import { DialogDescription } from '@radix-ui/react-dialog';
import { FileText } from 'lucide-react';
import Link from 'next/link';

// Set the workerSrc
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

const ViewStaffDocument = ({ trigger, url, docName }: { trigger: React.ReactNode, url: string, docName?: string }) => {
    const [numPages, setNumPages] = useState(null);
    const [error, setError] = useState<string | null>(null);

    const isImage = (url: string) => {
        return /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/.test(url.toLowerCase());
    };

    const isPDF = (url: string) => {
        return /\.pdf$/.test(url.toLowerCase());
    };

    const onLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages as any);
        setError(null);
    };

    const onLoadError = (error: Error) => {
        console.error('Error loading PDF:', error);
        setError('Failed to load PDF file.');
    };

    return (
        <div className="">
            <Dialog>
                <DialogTrigger>{trigger}</DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Document {docName}:</DialogTitle>
                        <DialogDescription className='text-slate-500 text-sm'>Right now you could download and view files, View From the TaskManager in upcoming versions.</DialogDescription>
                    </DialogHeader>
                    {isImage(url) &&
                        <div className="flex gap-1 justify-center items-center">
                            <Image src={url} alt="document" width={100} height={100} />
                            <Link href={url} download><h1 className='font-medium flex gap-1 hover:bg-white hover:text-black rounded-full px-3 p-1 cursor-pointer'>Download now</h1></Link>
                        </div>
                    }
                    {
                        isPDF(url) || !isImage(url) &&
                        <Link href={url} download>
                            <h1 className='font-medium flex gap-1 hover:bg-white hover:text-black rounded-full px-3 p-1 cursor-pointer'><FileText /> View & Dwd {docName}</h1>
                        </Link>
                    }
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default ViewStaffDocument
