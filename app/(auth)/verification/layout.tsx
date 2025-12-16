import { Metadata } from 'next';
import React from 'react'

export const metadata: Metadata = {
    title: "Taskmanager | Verification",
    description: "a site by Muhammed Gasal",
};

const VerificationLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <>
            {children}
        </>
    )
}

export default VerificationLayout