import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Edit, FolderInput, Trash2, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FolderMetadata } from '../backend';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useIsCallerAdmin } from '../hooks/useQueries';

interface FolderContextMenuProps {
  folder: FolderMetadata;
  onAction: (action: 'rename' | 'edit' | 'move' | 'delete') => void;
  children: React.ReactNode;
}

export default function FolderContextMenu({ folder, onAction, children }: FolderContextMenuProps) {
  const { identity } = useInternetIdentity();
  const { data: isAdmin } = useIsCallerAdmin();

  const isOwner = identity && folder.owner.toString() === identity.getPrincipal().toString();
  const canEdit = isOwner || isAdmin;

  if (!canEdit) {
    return <>{children}</>;
  }

  return (
    <div className="relative group">
      {children}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onAction('rename')}>
            <Edit className="h-4 w-4 mr-2" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAction('edit')}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAction('move')}>
            <FolderInput className="h-4 w-4 mr-2" />
            Move
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAction('delete')} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
