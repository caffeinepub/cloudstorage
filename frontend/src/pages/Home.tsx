import { useState } from 'react';
import StorageOverview from '../components/StorageOverview';
import QuickActions from '../components/QuickActions';
import PinnedFiles from '../components/PinnedFiles';
import RecentActivityCard from '../components/RecentActivityCard';
import SharedWithMe from '../components/SharedWithMe';
import Notifications from '../components/Notifications';
import SmartSuggestions from '../components/SmartSuggestions';

export default function Home() {
  const [currentFolderId] = useState<string | null>(null);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's an overview of your cloud storage
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Storage Overview */}
          <StorageOverview />

          {/* Quick Actions */}
          <QuickActions currentFolderId={currentFolderId} />

          {/* Pinned Files */}
          <PinnedFiles />

          {/* Recent Activity */}
          <RecentActivityCard />
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Shared Files */}
          <SharedWithMe />

          {/* Notifications */}
          <Notifications />

          {/* Smart Suggestions */}
          <SmartSuggestions />
        </div>
      </div>
    </div>
  );
}
