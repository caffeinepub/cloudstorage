import { useNavigate, useRouterState } from '@tanstack/react-router';
import { Home, FolderOpen, Share2, Clock, Trash2, Settings, Shield, Folder, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import StorageQuotaIndicator from './StorageQuotaIndicator';
import { useGetCallerUserRole } from '../hooks/useQueries';
import { useListFolders } from '../hooks/useFolderQueries';
import { useState } from 'react';

interface SidebarProps {
  isOpen: boolean;
}

export default function Sidebar({ isOpen }: SidebarProps) {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const { data: userRole } = useGetCallerUserRole();
  const { data: folders = [] } = useListFolders();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const isAdmin = userRole === 'admin';

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const rootFolders = folders.filter((f) => !f.parentFolderId);
  const getSubfolders = (parentId: string) => folders.filter((f) => f.parentFolderId === parentId);

  const renderFolder = (folder: any, depth: number = 0) => {
    const subfolders = getSubfolders(folder.id);
    const hasChildren = subfolders.length > 0;
    const isExpanded = expandedFolders.has(folder.id);

    return (
      <div key={folder.id}>
        <Button
          variant="ghost"
          className="w-full justify-start text-sm"
          style={{ paddingLeft: `${depth * 12 + 12}px` }}
          onClick={() => {
            if (hasChildren) {
              toggleFolder(folder.id);
            }
            navigate({ to: '/folders', search: { folderId: folder.id } });
          }}
        >
          {hasChildren && (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 mr-1 shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 mr-1 shrink-0" />
            )
          )}
          <div
            className="w-3 h-3 rounded-full mr-2 shrink-0"
            style={{ backgroundColor: folder.color || '#6366f1' }}
          />
          <span className="truncate">{folder.name}</span>
        </Button>
        {hasChildren && isExpanded && (
          <div>
            {subfolders.map((subfolder) => renderFolder(subfolder, depth + 1))}
          </div>
        )}
      </div>
    );
  };

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
        'fixed left-0 top-16 h-[calc(100vh-4rem)] bg-card border-r border-border transition-all duration-300 z-40 overflow-y-auto',
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

          <div className="pt-4">
            <Button
              variant={currentPath === '/folders' ? 'secondary' : 'ghost'}
              className={cn('w-full justify-start', currentPath === '/folders' && 'bg-accent')}
              onClick={() => navigate({ to: '/folders' })}
            >
              <Folder className="mr-3 h-5 w-5" />
              My Folders
            </Button>
            {rootFolders.length > 0 && (
              <div className="mt-1">
                {rootFolders.map((folder) => renderFolder(folder))}
              </div>
            )}
          </div>
        </nav>

        <div className="mt-4 pt-4 border-t border-border">
          <StorageQuotaIndicator />
        </div>
      </div>
    </aside>
  );
}
