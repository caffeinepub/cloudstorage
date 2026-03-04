import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@tanstack/react-router";
import { ArrowRight, FileText, FolderPlus, Upload } from "lucide-react";
import type React from "react";
import Notifications from "../components/Notifications";
import PinnedFiles from "../components/PinnedFiles";
import RecentActivityCard from "../components/RecentActivityCard";
import SmartSuggestions from "../components/SmartSuggestions";
import StorageOverview from "../components/StorageOverview";
import { RecentUploadsProvider } from "../contexts/RecentUploadsContext";

function SectionCard({
  title,
  children,
}: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">{title}</h2>
      {children}
    </div>
  );
}

export default function Home() {
  return (
    <RecentUploadsProvider>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back — here's an overview of your storage.
          </p>
        </div>

        {/* Top row: Storage + Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <StorageOverview />
          </div>
          <div className="md:col-span-2 rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <Link
                to="/dashboard"
                className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-center"
              >
                <Upload className="h-6 w-6 text-primary" />
                <span className="text-xs font-medium text-foreground">
                  Upload Files
                </span>
              </Link>
              <Link
                to="/dashboard"
                className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-center"
              >
                <FolderPlus className="h-6 w-6 text-primary" />
                <span className="text-xs font-medium text-foreground">
                  New Folder
                </span>
              </Link>
              <Link
                to="/dashboard"
                className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-center"
              >
                <FileText className="h-6 w-6 text-primary" />
                <span className="text-xs font-medium text-foreground">
                  New Document
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* Pinned Files */}
        <SectionCard title="Pinned Files">
          <PinnedFiles />
        </SectionCard>

        {/* Middle row: Recent Activity + Notifications */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SectionCard title="Recent Activity">
            <RecentActivityCard />
          </SectionCard>
          <SectionCard title="Notifications">
            <Notifications />
          </SectionCard>
        </div>

        {/* Smart Suggestions */}
        <SectionCard title="Smart Suggestions">
          <SmartSuggestions />
        </SectionCard>

        {/* Link to files */}
        <div className="flex justify-end">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-sm text-primary hover:underline font-medium"
          >
            View all files <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </RecentUploadsProvider>
  );
}
