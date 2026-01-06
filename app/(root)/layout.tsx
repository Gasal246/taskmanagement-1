import { auth } from "@/auth";
import React from 'react';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Taskmanager | Home",
    description: `Task Manager is an internal staff-tracking and workflow management application built for Wideline IT Solutions. 
It centralizes all client projects, staff tasks, and progress tracking to ensure smooth operations and complete visibility across the organization.`,
};

const HomeLayout = async ({ children }: {
    children: React.ReactNode
}) => {
    const session: any = await auth();
    if (!session) {
        redirect('/signin');
    }

    return (
        <div className='w-full h-screen'>
            {children}
        </div>
    )
}

export default HomeLayout