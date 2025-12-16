import { getServerSession } from 'next-auth';
import React from 'react';
import { authOptions } from '../api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Taskmanager | Home",
    description: "Wideline IT solutions (@gasal246), Designed to simplify task and staff management in a business environment. Built with ease of use in mind, it allows teams to seamlessly assign, track, and complete tasks while keeping all staff data organized in one central hub. Each employee has a unique profile showcasing their roles, task history, and performance metrics. Managers can monitor task progress, set priorities, and identify bottlenecks at a glance. ",
};

const HomeLayout = async ({ children }: {
    children: React.ReactNode
}) => {
    const session: any = await getServerSession(authOptions);
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