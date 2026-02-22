import StorageOverview from '../components/StorageOverview';
import QuickActions from '../components/QuickActions';
import RecentActivityCard from '../components/RecentActivityCard';
import PinnedFiles from '../components/PinnedFiles';
import SharedWithMe from '../components/SharedWithMe';
import Notifications from '../components/Notifications';
import SmartSuggestions from '../components/SmartSuggestions';

export default function Home() {
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
          Welcome to CloudStorage
        </h1>
        <p className="text-muted-foreground text-lg">
          Your secure cloud storage dashboard
        </p>
      </div>

      {/* Top Section: Storage Overview */}
      <div className="mb-8">
        <StorageOverview />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <QuickActions />
      </div>

      {/* Middle Section: Pinned Files + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <PinnedFiles />
        <RecentActivityCard />
      </div>

      {/* Lower-Middle Section: Shared with Me + Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <SharedWithMe />
        <Notifications />
      </div>

      {/* Bottom Section: Smart Suggestions */}
      <div className="mb-8">
        <SmartSuggestions />
      </div>
    </div>
  );
}
