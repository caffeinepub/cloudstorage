import { useNavigate, useRouterState } from '@tanstack/react-router';
import { Home, FolderOpen, Share2, Clock, Trash2, Settings, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import StorageQuotaIndicator from './StorageQuotaIndicator';
import { useGetCallerUserRole } from '../hooks/useQueries';

interface SidebarProps {
  isOpen: boolean;
}

export default function Sidebar({ isOpen }: SidebarProps) {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const { data: userRole } = useGetCallerUserRole();

  const isAdmin = userRole === 'admin';

  const menuItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: FolderOpen, label: 'My Files', path: '/dashboard' },
    { icon: Share2, label: 'Shared', path: '/dashboard' },
    { icon: Clock, label: 'Recent', path: '/dashboard' },
    { icon: Trash2, label: 'Trash', path: '/trash' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  if (isAdmin) {
    menuItems.push({ icon: Shield, label: 'Admin', path: '/admin' });
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-16 h-[calc(100vh-4rem)] bg-card border-r border-border transition-all duration-300 z-40',
        isOpen ? 'w-64' : 'w-0 -translate-x-full'
      )}
    >
      <div className="flex flex-col h-full p-4">
        <nav className="flex-1 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path;
            return (
              <Button
                key={item.path + item.label}
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn('w-full justify-start', isActive && 'bg-accent')}
                onClick={() => navigate({ to: item.path })}
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.label}
              </Button>
            );
          })}
        </nav>

        <div className="mt-auto pt-4 border-t border-border">
          <StorageQuotaIndicator />
        </div>
      </div>
    </aside>
  );
}
