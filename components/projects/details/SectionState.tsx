import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function ProjectSectionSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="rounded-2xl border border-cyan-900/40 bg-slate-950/55 p-4 sm:p-5">
      <div className="mb-5 flex items-center justify-between">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: cards }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function ProjectSectionError({
  onRetry,
}: {
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-2xl border border-red-900/50 bg-red-950/10 p-6 text-center">
      <AlertCircle className="text-red-300" size={24} />
      <div>
        <p className="text-sm font-semibold text-slate-100">
          This section could not be loaded.
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Your project details are still available. Try this section again.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="mr-2 size-4" /> Retry
      </Button>
    </div>
  );
}
