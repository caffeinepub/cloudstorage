import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, FileText, Pin } from "lucide-react";
import React from "react";
import { useGetFavorites } from "../hooks/useQueries";

function formatBytes(bytes: bigint): string {
  const n = Number(bytes);
  if (n === 0) return "0 B";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function PinnedFiles() {
  const { data: favorites, isLoading, isError } = useGetFavorites();

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="shrink-0 w-36 rounded-xl border border-border bg-card p-3 space-y-2"
          >
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg border border-border text-sm text-muted-foreground">
        <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
        <span>Unable to load pinned files.</span>
      </div>
    );
  }

  if (!favorites || favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <Pin className="h-7 w-7 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No pinned files yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Star files to pin them here
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {favorites.map((fav) => (
        <div
          key={fav.fileId}
          className="shrink-0 w-36 rounded-xl border border-border bg-card p-3 space-y-2 hover:border-primary/40 transition-colors cursor-pointer"
        >
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <p className="text-xs font-medium text-foreground truncate">
            {fav.fileName}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatBytes(fav.size)}
          </p>
        </div>
      ))}
    </div>
  );
}
