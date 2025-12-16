"use client";
import React, { useEffect, useState } from 'react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useParams, useRouter } from 'next/navigation';
import { Workflow } from 'lucide-react';
import { useGetFlowsByProject } from '@/query/business/queries';
import LoaderSpin from '@/components/shared/LoaderSpin';

const formatDateTiny = (date: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const ProjectFlowView = () => {
    const router = useRouter();
    const params = useParams<{ projectid: string }>();
    const { mutateAsync: GetFlowsByProject, isPending } = useGetFlowsByProject();
    const [flows, setFlows] = useState<any[]>([]);


    const fetchFlows = async () => {
        const res = await GetFlowsByProject(params.projectid);
        setFlows(res.data);
    };

    useEffect(() => {
        fetchFlows();
    }, []);

    if(isPending){
        return (
          <div className='p-5 overflow-y-scroll pb-20 min-h-screen flex items-center justify-center'>
            <LoaderSpin size={40} />
          </div>
        )
      }

    return (
        <div className='p-5 overflow-y-scroll pb-20 min-h-screen'>
            <Breadcrumb className='mb-3'>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink onClick={() => router.replace('/admin/projects')}>Manage Projects</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbLink onClick={() => router.back()}>Project</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Flows</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg min-h-[20vh] mb-2 border border-slate-700/50">
                <div className="mb-2 flex items-center justify-between">
                    <h1 className="font-medium text-xs text-slate-300 flex items-center gap-1">
                        <Workflow size={14} /> Project Flow (Logs)
                    </h1>
                </div>
                <div className="flex flex-col gap-2">
                    {flows?.map((log) => (
                        <div className="w-full p-1" key={log._id}>
                            <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg border border-slate-700 hover:border-cyan-800">
                                <h1 className="font-medium text-xs text-slate-300 flex items-center gap-1">
                                    {log.Log}
                                </h1>
                                <p className="text-xs text-slate-400">{formatDateTiny(log.createdAt)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ProjectFlowView;