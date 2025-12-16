"use client"
import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog"
import { Square, Trash2, Users } from 'lucide-react'
import { Avatar, Popconfirm } from 'antd'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger, } from "@/components/ui/tabs"

const ProjectPeople = ({ trigger, OpenedByArray, AccessToArray, currentDep }: { trigger: React.ReactNode, OpenedByArray: any, AccessToArray: any, currentDep: any }) => {
    const handleRemoveProjectUser = async (userid: string) => {

    }
    return (
        <Dialog>
            <DialogTrigger>{trigger}</DialogTrigger>
            <DialogContent className='max-h-[600px] overflow-y-scroll'>
                <DialogHeader>
                    <DialogTitle className='flex items-center gap-1'>Project People <Users /></DialogTitle>
                    <DialogDescription className='flex items-center gap-3'>
                        <span>users in:</span>
                        <span className='flex gap-1 items-center text-green-300'>working department <Square size={18} fill={'#86efac'} /></span>
                        <span className='flex gap-1 items-center text-orange-300'>other departments <Square size={18} fill={'#fdba74'} /></span>
                    </DialogDescription>
                    <Tabs defaultValue="openedby" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="openedby">Users Viewed</TabsTrigger>
                            <TabsTrigger value="accessto">Accessible Users</TabsTrigger>
                        </TabsList>
                        <TabsContent value="openedby">
                            <Card>
                                <CardHeader className='pb-3'>
                                    <CardTitle>Users Viewed</CardTitle>
                                    <CardDescription className='leading-3'>Accessible Users Who viewed Project</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[370px] overflow-y-scroll">
                                    <div className="flex flex-col gap-1">
                                        {OpenedByArray.map((user: any) => (
                                            <div key={user?._id} className={`${user?.Department?._id == currentDep?._id ? 'bg-green-300/30' : 'bg-orange-300/30'} p-3 rounded-lg flex justify-between items-center`}>
                                                <Link href={`/admin/staffs/${user?._id}`}>
                                                    <div className="flex gap-1 items-center">
                                                        <Avatar src={user?.AvatarUrl || '/avatar.png'} />
                                                        <div>
                                                            <h1 className="text-xs font-semibold leading-3">{user?.Name}</h1>
                                                            <h1 className="text-xs ">{user?.Email}</h1>
                                                        </div>
                                                    </div>
                                                </Link>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="accessto">
                            <Card>
                                <CardHeader className='pb-3'>
                                    <CardTitle>Accessible Users</CardTitle>
                                    <CardDescription className='leading-3'>Users Accessible are eigther added by admin or worked department heads</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[370px] overflow-y-scroll">
                                    <div className="flex flex-col gap-1">
                                        {AccessToArray.map((user: any) => (
                                            <div key={user?._id} className={`${user?.Department?._id == currentDep?._id ? 'bg-green-300/30' : 'bg-orange-300/30'} p-3 rounded-lg flex justify-between items-center`}>
                                                <Link href={`/admin/staffs/${user?._id}`}>
                                                    <div className="flex gap-1 items-center">
                                                        <Avatar src={user?.AvatarUrl || '/avatar.png'} />
                                                        <div>
                                                            <h1 className="text-xs font-semibold leading-3">{user?.Name}</h1>
                                                            <h1 className="text-xs ">{user?.Email}</h1>
                                                        </div>
                                                    </div>
                                                </Link>
                                                <Popconfirm title="Remove Project User" onConfirm={() => handleRemoveProjectUser(user?._id)}><Trash2 /></Popconfirm>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>

                </DialogHeader>
            </DialogContent>
        </Dialog>

    )
}

export default ProjectPeople