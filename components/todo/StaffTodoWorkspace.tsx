"use client";

import { useCallback, useEffect, useState } from "react";
import { CloudUpload, Loader2, RotateCcw } from "lucide-react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import TodoWorkspace, { type Todo } from "@/components/todo/TodoWorkspace";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getLocalTodoSignature,
  getTodoImportDismissKey,
  getTodoLocalStorageKey,
  readLocalTodos,
} from "@/lib/todo-local";
import { resolveSessionUserId } from "@/lib/utils";

type StorageMode = "cloud" | "local";

const StaffTodoWorkspace = () => {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const userId = resolveSessionUserId(session);
  const [storageMode, setStorageMode] = useState<StorageMode | null>(null);
  const [modeError, setModeError] = useState("");
  const [importTodos, setImportTodos] = useState<Todo[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const loadStorageMode = useCallback(async () => {
    if (!userId) return;
    setModeError("");
    try {
      const response = await fetch("/api/todo/storage-mode", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !["cloud", "local"].includes(payload?.mode)) {
        throw new Error(payload?.message || "Could not determine todo storage");
      }

      const nextMode = payload.mode as StorageMode;
      setStorageMode(nextMode);
      if (nextMode === "cloud") {
        const local = readLocalTodos(userId);
        const signature = getLocalTodoSignature(local);
        const dismissedSignature = window.localStorage.getItem(getTodoImportDismissKey(userId));
        setImportTodos(local);
        setShowImport(Boolean(local.length && signature !== dismissedSignature));
      } else {
        setImportTodos([]);
        setShowImport(false);
      }
    } catch (error: any) {
      setStorageMode(null);
      setModeError(error?.message || "Could not determine todo storage");
    }
  }, [userId]);

  useEffect(() => {
    if (status === "authenticated" && userId) void loadStorageMode();
  }, [loadStorageMode, status, userId]);

  useEffect(() => {
    if (status !== "authenticated" || !userId) return;
    const refreshOnFocus = () => void loadStorageMode();
    const intervalId = window.setInterval(refreshOnFocus, 60_000);
    window.addEventListener("focus", refreshOnFocus);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [loadStorageMode, status, userId]);

  const keepLocalTodos = () => {
    if (userId && importTodos.length) {
      window.localStorage.setItem(
        getTodoImportDismissKey(userId),
        getLocalTodoSignature(importTodos)
      );
    }
    setShowImport(false);
  };

  const importLocalTodos = async () => {
    if (!userId || !importTodos.length || isImporting) return;
    setIsImporting(true);
    try {
      const response = await fetch("/api/todo/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ todos: importTodos }),
      });
      const payload = await response.json();
      if (!response.ok || payload?.status !== 200) {
        throw new Error(payload?.message || "Could not import local todos");
      }

      queryClient.setQueryData(["todos", userId], { data: payload.data || [], status: 200 });
      window.localStorage.removeItem(getTodoLocalStorageKey(userId));
      window.localStorage.removeItem(getTodoImportDismissKey(userId));
      setImportTodos([]);
      setShowImport(false);
      toast.success(payload?.message || "Local todos imported");
    } catch (error: any) {
      toast.error(error?.message || "Could not import local todos");
    } finally {
      setIsImporting(false);
    }
  };

  if (status === "loading" || (status === "authenticated" && !storageMode && !modeError)) {
    return <StaffTodoLoading />;
  }

  if (!userId || status === "unauthenticated") return null;

  if (modeError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-sm rounded-3xl border border-amber-400/20 bg-slate-950/70 p-8 text-center shadow-2xl">
          <CloudUpload className="mx-auto mb-4 h-9 w-9 text-amber-300" />
          <h1 className="text-lg font-semibold text-white">Storage check unavailable</h1>
          <p className="mt-2 text-sm text-slate-400">{modeError}. Your tasks have not been changed.</p>
          <button onClick={() => void loadStorageMode()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200">
            <RotateCcw size={15} /> Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 sm:px-0">
        <TodoWorkspace
          key={`${storageMode}-${userId}`}
          storageMode={storageMode || "local"}
          userId={userId}
          showStorageStatus
          onStorageAccessChanged={() => void loadStorageMode()}
        />
      </div>

      <AlertDialog open={showImport} onOpenChange={(open) => { if (!open && !isImporting) keepLocalTodos(); }}>
        <AlertDialogContent className="border-slate-700 bg-slate-950 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><CloudUpload className="h-5 w-5 text-cyan-300" /> Import local todos?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              You now have cloud todo access through a Sales department. Import {importTodos.length} task{importTodos.length === 1 ? "" : "s"} saved on this device into your personal cloud list?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isImporting} onClick={keepLocalTodos} className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white">Keep local</AlertDialogCancel>
            <AlertDialogAction disabled={isImporting} onClick={(event) => { event.preventDefault(); void importLocalTodos(); }} className="bg-cyan-400 text-slate-950 hover:bg-cyan-300">
              {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CloudUpload className="mr-2 h-4 w-4" />} Import to cloud
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const StaffTodoLoading = () => (
  <div className="space-y-5 px-4 pb-8 sm:px-0">
    <Skeleton className="h-48 rounded-[28px] bg-slate-900/70" />
    <Skeleton className="h-28 rounded-3xl bg-slate-900/70" />
    <Skeleton className="h-[430px] rounded-3xl bg-slate-900/70" />
  </div>
);

export default StaffTodoWorkspace;
