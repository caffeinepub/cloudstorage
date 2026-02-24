import React from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { Home, FolderOpen, Share2, Clock, Trash2, Settings, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import StorageQuotaIndicator from './StorageQuotaIndicator';
import { useIsCallerAdmin } from '../hooks/useQueries';

interface SidebarProps {
  isOpen?: boolean;
}

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/dashboard', label: 'My Files', icon: FolderOpen },
  { to: '/shared', label: 'Shared', icon: Share2 },
  { to: '/recent', label: 'Recent', icon: Clock },
  { to: '/trash', label: 'Trash', icon: Trash2 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ isOpen = true }: SidebarProps) {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const { data: isAdmin } = useIsCallerAdmin();

  const allItems = isAdmin
    ? [...navItems, { to: '/admin', label: 'Admin', icon: ShieldCheck }]
    : navItems;

  return (
    <aside
      className={cn(
        'fixed left-0 top-16 h-[calc(100vh-4rem)] bg-card border-r border-border transition-all duration-300 z-40 flex flex-col',
        isOpen ? 'w-56 translate-x-0' : 'w-0 -translate-x-full overflow-hidden',
      )}
    >
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {allItems.map(({ to, label, icon: Icon }) => {
          const isActive = currentPath === to;
          return (
            <button
              key={to}
              onClick={() => navigate({ to })}
              className={cn(
                'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent/10 hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <StorageQuotaIndicator />
      </div>
    </aside>
  );
}
