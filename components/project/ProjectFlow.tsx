"use client"
import { Avatar, ConfigProvider, Popconfirm, Timeline } from 'antd';
import { Circle, CircleCheckBig, CircleX, FilePlus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import React from 'react'
import LoaderSpin from '../shared/LoaderSpin';
import { useDeleteProjectFlow, useGetProjectFlows } from '@/query/client/projectQueries';
import { formatDate } from '@/lib/utils';
import { Button } from '../ui/button';
import CustomFlowDialog from './CustomFlowDialog';
import { toast } from 'sonner';

const ProjectFlow = ({ projectid }: { projectid: string }) => {
    const { data: session }: any = useSession();
    const router = useRouter();
    const { data: projectData, isLoading: projectDataLoading } = useGetProjectFlows(projectid);
    const { mutateAsync: removeProjectFlow, isPending: removingProjectFlow } = useDeleteProjectFlow();

    const handleRemoveFlow = async (flowid: string) => {
        const response = await removeProjectFlow({ projectid: projectid, flowid: flowid });
        if(response?._id){
            return toast.success("Successfully removed a flow from working tree..")
        }else{
            return toast.error("Sorry flow not removed for unknown reason!!")
        }
    }

    const timelineItems = projectData?.Flows?.map((flow: any) => ({
        color: flow?.Status == 'complete' ? 'green' : (flow?.Status == 'rollback' ? 'red' : 'blue'),
        dot: flow?.Status == 'complete' ? <CircleCheckBig className='p-1' /> : (flow?.Status == 'rollback' ? <CircleX className='p-[3px]' /> : <Circle className='p-1' />),
        label: <div className='bg-neutral-700/40 p-2 rounded-lg'>
            <h2 className='text-xs font-medium text-slate-300 mb-1'>{flow?.Title}</h2>
            <pre className='text-xs font-medium text-slate-300 text-wrap'>
                {flow?.Description}
            </pre>
        </div>,
        children: <div className='bg-neutral-700/40 p-2 rounded-lg flex gap-2 items-center flex-wrap m-1'>
            <div className='flex items-center gap-1 flex-wrap'>
                <Avatar src={flow?.Creator?.AvatarUrl || '/avatar.png'} size={24} />
                <div className="">
                    <pre className='text-xs text-slate-300 text-wrap'>{flow?.Creator?.Email}</pre>
                    <p className="text-xs text-slate-400 text-wrap">{formatDate(flow?.createdAt)}</p>
                </div>
            </div>
            <h1 className='font-medium text-xs text-neutral-400 capitalize flex gap-1 items-center flex-wrap'>
                {session?.user?.id == flow?.Creator?._id && <><span className='text-orange-400 text-sm'>&#x2022;</span> You</>}
                {flow?.Creator?._id == projectData?.Creator && <><span className='text-orange-400 text-sm'>&#x2022;</span> Project Creator</>}
                {<><span className='text-orange-400 text-sm'>&#x2022;</span> {flow?.Creator?.Role}</>}
                {<><span className='text-orange-400 text-sm'>&#x2022;</span> {flow?.Creator?.Department?.DepartmentName}</>}
            </h1>
            {(session?.user?.id == flow?.Creator?._id || session?.user?.id == projectData?.Creator || session?.user?.id == projectData?.AdminId) && (
                <Popconfirm title="Remove Flow?" description="Are you sure want to remove this flow.?" onConfirm={() => handleRemoveFlow(flow?._id)}><h3 className='text-xs text-destructive font-medium underline cursor-pointer'>Delete</h3></Popconfirm>
            )}
        </div>
    })) || [];

    // Add the manual item
    timelineItems.push({
        color: 'blue',
        dot: <Circle className='p-1' />,
        label: <div className='text-xs flex gap-1 justify-end text-cyan-300 lg:m-1 lg:p-2'>Working {projectData?.WorkingDepartment?.DepartmentName}.. <LoaderSpin size={20} /></div>,
        children: <CustomFlowDialog trigger={
            <Button className='text-xs p-1 px-3 rounded-full text-slate-500 flex gap-1 items-center' variant='ghost'><FilePlus size={18} /> Custom Flow</Button>
        } projectid={projectData?._id} />,
    });

    return (
        <div className="bg-slate-950/50 p-3 rounded-lg flex flex-col justify-start">
            <h1 className='text-sm font-semibold text-center'>Project Working Tree</h1>
            <div className='py-4 flex justify-center w-full'>
                <ConfigProvider
                    theme={{
                        components: {
                            Timeline: {
                                tailColor: 'grey',
                                dotBg: 'transparent',
                            },
                        },
                    }}
                >
                    <Timeline mode={'left'} style={{ width: '100%', height: '100%' }} items={timelineItems} />
                </ConfigProvider>
            </div>
        </div>
    )
}

export default ProjectFlow;
