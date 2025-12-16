/* eslint-disable react-hooks/exhaustive-deps */
"use client"
import { Avatar, Badge, Popconfirm, Tooltip } from 'antd'
import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Progress } from '../ui/progress'
import { Flag, LayoutList, Trash2 } from 'lucide-react'
import { useGetAllTasks } from '@/query/client/userQueries'
import { formatDateTiny, multiFormatDateString } from '@/lib/utils'
import { Skeleton } from '../ui/skeleton'

const TaskTab = ({ currentUser, tasktype, projectIds }: { currentUser: any, tasktype: TaskTypes, projectIds?: string[] }) => {
    const router = useRouter();
    const [tasklist, setTaskList] = useState<any[]>([])
    const { data: allTasks, isLoading: loadingTasks } = useGetAllTasks(currentUser?._id);

    useEffect(() => {
        if(allTasks) {
            setTaskList(allTasks);
            if(tasktype === 'new') {
                const result = allTasks?.filter((task: any) => task?.Status === 'new');
                setTaskList(result);
            } else if ( tasktype === 'ongoing' ) {
                const result = allTasks?.filter((task: any) => task?.AcceptedBy != null);
                setTaskList(result);
            } else if ( tasktype === 'self' ) {
                const result = allTasks?.filter((task: any) => task?.Type === 'self');
                setTaskList(result);
            }
        }
    }, [allTasks])

    return (
        <div className="flex flex-wrap">
            {!loadingTasks && tasklist?.length <= 0 && <h1 className='text-xs text-slate-500'>no {tasktype} tasks.</h1>}
            {loadingTasks && <>
                <div className="w-full lg:w-4/12 p-1"><Skeleton className='w-full h-[180px] rounded-lg' /> </div>
                <div className="w-full lg:w-4/12 p-1"><Skeleton className='w-full h-[180px] rounded-lg' /> </div>
                <div className="w-full lg:w-4/12 p-1"><Skeleton className='w-full h-[180px] rounded-lg' /> </div>
            </>}
            {
                tasklist?.map((task: any) => (
                    <div className="w-full lg:w-4/12 p-1" key={task?._id}>
                        <Tooltip title="click to view">
                            <Badge size='small' dot={!task?.EnrolledBy?.includes(currentUser?._id)} className='w-full text-slate-300'>
                                <motion.div onClick={() => router.push(`/${currentUser?.Role == 'admin' ? 'admin' : 'staff'}/tasks/${task?._id}`)} whileTap={{ scale: 0.98 }} className="p-2 py-3 rounded-lg bg-slate-950/70 border border-neutral-800 hover:border-neutral-600 select-none cursor-pointer">
                                    <div className="flex justify-between items-center px-1 mb-1">
                                        <div className="">
                                            <h1 className='font-semibold leading-5'>{task?.TaskName}</h1>
                                            <h4 className="text-slate-400 text-xs">{task?.ProjectId ? task?.ProjectId?.Title : (task?.ForwardType == 'public' ? 'published task' : 'individual task')}</h4>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 items-center p-1 mb-1">
                                        <Avatar src={task?.Creator?.AvatarUrl || "/avatar.png"} size={30} />
                                        <div>
                                            <h1 className='text-xs font-medium text-neutral-300 capitalize'>from: <span className='text-neutral-200'>{task?.Creator?._id == currentUser?._id ? 'Yourself' : task?.Creator?.Role}</span></h1>
                                            <h1 className='text-xs font-medium text-neutral-200'>{task?.Creator?.Email} <span className='italic font-normal text-neutral-300'>&#x2022; {multiFormatDateString(task?.createdAt)}</span></h1>
                                        </div>
                                    </div>
                                    <div className='px-2 mb-2 flex gap-3'>
                                        <Tooltip title="priority"><h2 className={`text-xs ${ task?.Priority == 'high' ? 'text-red-400 border border-red-400' : ( task?.Priority == 'medium' ? 'text-orange-400 border border-orange-400' : 'text-gray-400 border border-gray-400')} p-1 px-2 rounded-lg flex items-center gap-1 font-semibold`}>
                                            <Flag fill={task?.Priority == 'low' ? 'gray' : (task?.Priority == 'medium' ? 'gold' : 'tomato')} size={12} />{task?.Priority}</h2></Tooltip>
                                        <Tooltip title="activities"><h2 className='text-xs text-blue-300 border border-blue-300 p-1 px-2 rounded-lg flex items-center gap-1'><LayoutList size={12} fill='blue' />{task?.Activities?.length}</h2></Tooltip>
                                    </div>
                                    <div className="flex justify-between gap-1">
                                        <div className='bg-slate-950/50 p-2 rounded-lg w-full border border-slate-800'>
                                            <h3 className='text-xs font-medium leading-3 text-slate-400'>created at</h3>
                                            <h4 className='text-xs text-slate-200'>{formatDateTiny(task?.createdAt)}</h4>
                                        </div>
                                        <div className='bg-slate-950/50 p-2 rounded-lg w-full border border-slate-800'>
                                            <h3 className='text-xs font-medium leading-3 text-slate-400 '>deadline on</h3>
                                            <h4 className='text-xs text-slate-200'>{formatDateTiny(task?.Deadline)}</h4>
                                        </div>
                                        <div className='bg-slate-950/50 p-2 rounded-lg w-full flex justify-center items-center border border-slate-800'>
                                            <h3 className='text-xs font-medium leading-3 text-slate-400'>Ends {multiFormatDateString(task?.Deadline)}</h3>
                                        </div>
                                    </div>
                                    <div className='flex gap-1 items-center mt-2'>
                                        <Progress value={task?.Progress} /> <span className='text-xs'>{(task?.Progress).toFixed(2)}%</span>
                                    </div>
                                </motion.div>
                            </Badge>
                        </Tooltip>
                    </div>
                ))
            }
        </div>
    )
}

export default TaskTab

