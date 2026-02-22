import { useNavigate } from '@tanstack/react-router';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { buildFolderPath } from '../hooks/useFolderQueries';
import type { FolderMetadata } from '../backend';

interface FolderBreadcrumbProps {
  currentFolderId: string | null;
  folders: FolderMetadata[];
}

export default function FolderBreadcrumb({ currentFolderId, folders }: FolderBreadcrumbProps) {
  const navigate = useNavigate();

  const path = currentFolderId ? buildFolderPath(currentFolderId, folders) : [];

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink
            onClick={() => navigate({ to: '/folders' })}
            className="cursor-pointer hover:text-foreground"
          >
            My Folders
          </BreadcrumbLink>
        </BreadcrumbItem>
        {path.map((folder, index) => (
          <div key={folder.id} className="flex items-center">
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {index === path.length - 1 ? (
                <BreadcrumbPage>{folder.name}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink
                  onClick={() => navigate({ to: '/folders', search: { folderId: folder.id } })}
                  className="cursor-pointer hover:text-foreground"
                >
                  {folder.name}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
