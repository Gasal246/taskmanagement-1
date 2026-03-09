"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";
import { clearClientAuthCleanup } from "@/lib/client-auth-cleanup";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type RestartLoginButtonProps = {
  className?: string;
};

const RestartLoginButton = ({ className }: RestartLoginButtonProps) => {
  const router = useRouter();
  const [isRestarting, setIsRestarting] = React.useState(false);

  const handleRestartLogin = async () => {
    if (isRestarting) return;

    setIsRestarting(true);

    try {
      await signOut({ redirect: false });
    } catch {
      // Continue cleanup even if sign-out request fails.
    }

    await clearClientAuthCleanup();
    router.replace("/signin");
  };

  return (
    <div className={cn("fixed bottom-4 right-4 z-40", className)}>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            className="border-slate-700/80 bg-slate-950/70 text-slate-200 shadow-lg backdrop-blur hover:bg-slate-900"
          >
            <RotateCcw className="h-4 w-4" />
            Restart Login
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent className="border-slate-800 bg-slate-950 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Restart Login Session?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              This will clear saved login data on this browser. You will have to log in again to continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRestarting}>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={handleRestartLogin}
                disabled={isRestarting}
              >
                {isRestarting ? "Restarting..." : "Restart Login"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RestartLoginButton;
