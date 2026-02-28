import React from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import {
  Home,
  FolderOpen,
  Clock,
  Share2,
  Trash2,
  Settings,
  Shield,
  Star,
  Users,
} from 'lucide-react';
import StorageQuotaIndicator from './StorageQuotaIndicator';
import { useIsCallerAdmin } from '../hooks/useQueries';

interface SidebarProps {
  isOpen: boolean;
}

const navItems = [
  { path: '/dashboard', label: 'My Files', icon: FolderOpen },
  { path: '/favorites', label: 'Favorites', icon: Star },
  { path: '/recent', label: 'Recent', icon: Clock },
  { path: '/shared', label: 'Shared', icon: Share2 },
  { path: '/trash', label: 'Trash', icon: Trash2 },
];

const bottomNavItems = [
  { path: '/settings', label: 'Settings', icon: Settings },
  { path: '/admin', label: 'Admin', icon: Shield },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const { data: isAdmin } = useIsCallerAdmin();

  const isActive = (path: string) => currentPath === path || currentPath.startsWith(path + '/');

  return (
    <aside
      className={`
        fixed left-0 top-16 h-[calc(100vh-4rem)] z-30
        flex flex-col
        bg-card border-r border-border
        transition-all duration-300 ease-in-out
        ${isOpen ? 'w-56 translate-x-0' : 'w-0 -translate-x-full md:w-56 md:translate-x-0'}
        overflow-hidden
      `}
    >
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {navItems.map(({ path, label, icon: Icon }) => (
            <li key={path}>
              <button
                onClick={() => navigate({ to: path })}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-colors duration-150
                  ${
                    isActive(path)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }
                `}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-6 pt-4 border-t border-border">
          <ul className="space-y-1">
            {bottomNavItems.map(({ path, label, icon: Icon }) => (
              <li key={path}>
                <button
                  onClick={() => navigate({ to: path })}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                    transition-colors duration-150
                    ${
                      isActive(path)
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }
                  `}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              </li>
            ))}

            {/* Admin Panel link — only visible to admins */}
            {isAdmin && (
              <li>
                <button
                  onClick={() => navigate({ to: '/admin-panel' })}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                    transition-colors duration-150
                    ${
                      isActive('/admin-panel')
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }
                  `}
                >
                  <Users className="h-4 w-4 shrink-0" />
                  <span className="truncate">User Approvals</span>
                </button>
              </li>
            )}
          </ul>
        </div>
      </nav>

      <div className="p-3 border-t border-border">
        <StorageQuotaIndicator />
      </div>
    </aside>
  );
};

export default Sidebar;
