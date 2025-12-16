/* eslint-disable react-hooks/exhaustive-deps */
"use client"
import { Avatar, Popconfirm, Space } from 'antd'
import React, { useEffect, useState } from 'react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Send, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAddProjectComment, useDeleteProjectComment, useGetProjectComments } from '@/query/client/projectQueries'
import LoaderSpin from '../shared/LoaderSpin'
import { toast } from 'sonner'
import { pusherClient } from '@/lib/pusher/client'
import { useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/query/queryKeys'
import { multiFormatDateString } from '@/lib/utils'
import { useSession } from 'next-auth/react'
import ProjectCommentSkeleton from '../skeletons/ProjectCommentSkeleton'

const ProjectComments = ({ projectid }: { projectid: string }) => {
    const { data: session }: any = useSession();
    const { data: projectData, isLoading: loadingProject } = useGetProjectComments(projectid);
    const { mutateAsync: addComment, isPending: addingComment } = useAddProjectComment();
    const { mutateAsync: deleteComment, isPending: deletingComment } = useDeleteProjectComment();
    const [comment, setComment] = useState('');
    const queryClient = useQueryClient();

    useEffect(() => {
        const channel = pusherClient.subscribe(`channel-${projectid}`)
            .bind('comment', async (data: any) => {
                queryClient.invalidateQueries({
                    queryKey: [QUERY_KEYS.GET_PROJECT_BY_ID, projectid]
                })
                queryClient.invalidateQueries({
                    queryKey: [QUERY_KEYS.GET_PROJECT_COMMENTS, projectid]
                })
                queryClient.invalidateQueries({
                    queryKey: [QUERY_KEYS.GET_PROJECT_COMMENTS]
                })
            })
        return () => {
            channel.unbind();
        };
    }, [])

    const handleAddComment = async () => {
        const formData = new FormData();
        formData.append('projectid', projectid);
        formData.append('comment', comment);
        const response = await addComment(formData);
        if (response?._id) {
            return toast.success("Comment Added Successfully.")
        } else {
            return toast.error("Comment Not Send!!")
        }
    }

    const handleDeleteComment = async (commentid: string) => {
        const response = await deleteComment({ projectid, commentid });
        if(response?._id){
            return toast.success("Comment Successfully Deleted.")
        } else {
            return toast.error("Comment Not Deleted!", { description: "Some Unknown Error Occured."})
        }
    }

    return (
        <div className="bg-slate-950/50 p-3 rounded-lg relative">
            <h1 className='text-sm font-medium mb-2'>Project Comments</h1>
            <div className="flex flex-col h-[300px] overflow-y-scroll">
                {loadingProject && <ProjectCommentSkeleton />}
                {projectData?.Comments?.length <= 0 && <h1 className='text-xs text-slate-500'>No Comments Yet!</h1>}
                {projectData?.Comments?.map((comment: any) => (
                    <div className='mb-3 bg-slate-950/50 p-3 rounded-lg' key={comment?._id}>
                        <div className="flex gap-1 items-center">
                            <Avatar src={comment?.Creator?.AvatarUrl || '/avatar.png'} size={20} />
                            <h3 className="text-xs font-semibold text-slate-300 leading-3">{comment?.Creator?.Email}</h3>
                            {(session?.user?.id == comment?.Creator?._id || session?.user?.id == projectData?.AdminId) && (<Popconfirm title="Delete Comment ?" description="Are you sure you wanna delete this comment ?" onConfirm={() => handleDeleteComment(comment?._id)}>
                                <motion.h1 className='cursor-pointer flex justify-center items-center gap-1 text-xs font-medium text-red-700' whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>Delete <Trash2 size={14} /></motion.h1>
                            </Popconfirm>)}
                        </div>
                        <p className='text-xs text-slate-300 pl-5 w-full lg:w-1/2'>{comment?.Comment} <i className='text-slate-400 text-xs text-nowrap'>&#x2022; {multiFormatDateString(comment?.createdAt)}</i></p>
                    </div>
                ))}
                {/* some space for input */} <div className="py-5"></div> {/* some space for input */}
            </div>
            <Space.Compact style={{ width: '100%' }} className='absolute bottom-0 left-0 lg:px-4  gap-1'>
                <Input type='text' placeholder='enter your comment.' value={comment} onChange={(e) => setComment(e.target.value)} className='bg-black/70 border-dashed focus-visible:ring-0 focus-visible:border-solid' />
                {comment && <Button className='bg-cyan-800 text-white hover:bg-slate-700' onClick={handleAddComment}>{addingComment ? <LoaderSpin size={24} /> : <Send size={16} />}</Button>}
            </Space.Compact>
        </div>
    )
}

export default ProjectComments