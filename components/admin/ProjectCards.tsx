/* eslint-disable react-hooks/exhaustive-deps */
"use client"
import React, { useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { motion } from 'framer-motion'
import { Avatar, Badge, Tooltip } from 'antd'
import Link from 'next/link'
import { Progress } from '../ui/progress'
import { Circle, Frown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useGetUserProjects } from '@/query/client/projectQueries'
import { useSession } from 'next-auth/react'
import ProjectCardsSkeleton from '../skeletons/ProjectCardsSkeleton'
import Image from 'next/image'
import { formatDateTiny, multiFormatDateString } from '@/lib/utils'

export const ProjectCard = ({ project, userRole }: { project: any, userRole: string }) => {
    const router = useRouter();
    
    return (
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => router.push(userRole == 'admin' ? `/admin/projects/${project?._id}` : `/staff/projects/${project?._id}`)} className="bg-neutral-700/70 p-3 rounded-lg cursor-pointer select-none">
            <div className="flex justify-between px-1">
                <h1 className='text-sm font-medium'>{project?.Title}</h1>
            </div>
            <Link href={userRole == 'admin' ? `/admin/staffs/${project?.Creator?._id}` : `/staff/profile/${project?.Creator?._id}`}><div className="flex gap-1 bg-slate-950/50 p-2 rounded-lg items-center mt-2 mb-1">
                <Avatar src={project?.Creator?.AvatarUrl || '/avatar.png'} size={26} />
                <div>
                    <h1 className='text-xs font-medium leading-3'>{project?.Creator?.Name}</h1>
                    <h1 className='text-xs'>{project?.Creator?.Email}</h1>
                </div>
            </div></Link>
            <div className='flex justify-between gap-1 mb-2'>
                <Tooltip title={formatDateTiny(project?.createdAt)}><div className='bg-slate-950/60 p-1 px-2 rounded-lg w-1/2'>
                    <h2 className='text-neutral-300 text-[11px] leading-3'>Created On</h2>
                    <h2 className='text-slate-300 text-[10px]'>{multiFormatDateString(project?.createdAt)}</h2>
                </div></Tooltip>
                <Tooltip title={formatDateTiny(project?.Deadline)}><div className='bg-slate-950/60 p-1 px-2 rounded-lg w-1/2'>
                    <h2 className='text-neutral-300 text-[11px] leading-3'>Deadline:</h2>
                    <h2 className='text-slate-300 text-[10px]'>{multiFormatDateString(project?.Deadline)}</h2>
                </div></Tooltip>
            </div>
            <div className='px-2 mb-2'>
                <h2 className={`text-xs ${project?.Priority == 'high' ? 'text-red-400' : (project?.Priority == 'average' ? 'text-orange-400' : 'text-slate-400')} flex items-center gap-1 font-medium capitalize`}><Circle size={10} fill="" strokeWidth={5} /><span className='uppercase'>{project?.Priority}</span> priority</h2>
                <h2 className={`text-xs ${project?.IsApproved ? 'text-green-400' : 'text-orange-400'} flex items-center gap-1 font-medium`}><Circle size={10} fill="" strokeWidth={5} />{project?.IsApproved ? 'Approved Project' : 'Waiting Approval'}</h2>
            </div>
            {project?.Progress && <div className='flex gap-1 items-center'>
                <Progress value={project?.Progress} /> <span className='text-xs'>{project?.Progress}%</span>
            </div>}
            {project?.Progress && userRole == 'admin' && !project?.IsApproved && <div className='mt-1'>
                <motion.h1 whileHover={{ scale: 1.02 }} className='w-full bg-green-400 rounded-lg p-2 text-black text-center font-semibold hover:shadow-orange-300 shadow-sm'>Approve Project</motion.h1>
            </div>}
        </motion.div>
    )
}

const ProjectCards = ({ filter, title, currentUser, selectedClients }: { filter: ProjectGetFilters, title?: string, currentUser?: any, selectedClients?: string[] }) => {
    const { data: session }: any = useSession();
    const { data: allProjects, isLoading: loadingProjects } = useGetUserProjects(session?.user?.id, filter);

    useEffect(() => {
        if(allProjects){
            console.log(filter + "All Projects", allProjects)
        }else{
            console.log(filter + "all projects loading or not found yet")
        }
    }, [allProjects])

    // Function to filter projects by selected clients
    const filterProjectsByClients = (projects: any[]) => {
        if (selectedClients?.length === 0) return projects; // If no clients are selected, return all projects
        return projects?.filter((project) => selectedClients?.includes(project?.ClientId));
    };

    // Apply the filtering based on selected clients
    const filteredProjects = filterProjectsByClients(allProjects || []);

    return (
        <Card className='border-slate-700'>
            <CardHeader className='p-3 px-4 capitalize'>
                <CardTitle>{title || filter + " projects"}</CardTitle>
            </CardHeader>
            <CardContent className="p-3 w-full flex flex-wrap">
                {loadingProjects && <ProjectCardsSkeleton />}
                {filteredProjects?.map((project: any) => (
                    <div className="w-full lg:w-4/12 p-1" key={project?._id}>
                        <Badge size='small' dot={!project?.OpenedBy?.includes(session?.user?.id)} className='w-full text-slate-300'>
                            <ProjectCard project={project} userRole={currentUser?.Role} />
                        </Badge>
                    </div>
                ))}
                {!filteredProjects ? (
                    <h1 className='text-sm font-medium flex gap-1 items-center text-red-300'>
                        <Frown /> Cannot find any results for {filter}
                    </h1>
                ) : (
                    filteredProjects?.length <= 0 && (
                        <Tooltip title={`No Data for ${filter} projects.`}>
                            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} animate={{ scale: 1.2 }} className='w-full flex justify-center items-center py-10'>
                                <Image src={`/icons/noresults.png`} alt='noresults' width={200} height={200} className='opacity-70' />
                            </motion.div>
                        </Tooltip>
                    )
                )}
            </CardContent>
        </Card>
    );
};

export default ProjectCards