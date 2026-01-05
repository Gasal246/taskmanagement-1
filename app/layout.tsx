import { auth } from "@/auth";
import type { Metadata } from "next";
import { AR_One_Sans } from "next/font/google";
import SessionProvider from '@/lib/SessionProvider'
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import TanstackProvider from "@/query/TanstackProvider";
import ReduxProvider from "@/redux/ReduxProvider";
import UserActivityTracker from "@/components/shared/UserActivityTracker";

const ar_one_sans = AR_One_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Taskmanager",
  description: `Task Manager is an internal staff-tracking and workflow management application built for Wideline IT Solutions. 
It centralizes all client projects, staff tasks, and progress tracking to ensure smooth operations and complete visibility across the organization.`,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en" className="dark" style={{ colorScheme: "dark" }}>
      <body className={ar_one_sans.className}>
        <SessionProvider session={session}>
          <TanstackProvider>
            <ReduxProvider>
              <UserActivityTracker />
              {children}
            </ReduxProvider>
          </TanstackProvider>
        </SessionProvider>
        <Toaster />
      </body>
    </html>
  );
}
