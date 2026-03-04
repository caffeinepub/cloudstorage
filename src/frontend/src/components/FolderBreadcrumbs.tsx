import { ChevronRight, Home } from "lucide-react";
import { useGetFolder } from "../hooks/useQueries";

interface FolderBreadcrumbsProps {
  currentFolderId: string | null;
  onNavigate: (folderId: string | null) => void;
}

function FolderCrumb({
  folderId,
  onNavigate,
}: {
  folderId: string;
  onNavigate: (folderId: string | null) => void;
}) {
  const { data: folder } = useGetFolder(folderId);

  if (!folder) return null;

  const _crumbs: { id: string; name: string }[] = [];
  // Build crumb chain by walking up parentId
  // We only have the current folder here; parent crumbs are rendered recursively
  return (
    <>
      {folder.parentId && (
        <FolderCrumb folderId={folder.parentId} onNavigate={onNavigate} />
      )}
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      <button
        type="button"
        onClick={() => onNavigate(folder.id)}
        className="text-sm font-medium hover:text-primary transition-colors truncate max-w-[120px]"
        title={folder.name}
      >
        {folder.name}
      </button>
    </>
  );
}

export default function FolderBreadcrumbs({
  currentFolderId,
  onNavigate,
}: FolderBreadcrumbsProps) {
  return (
    <nav className="flex items-center gap-1 text-sm flex-wrap">
      <button
        type="button"
        onClick={() => onNavigate(null)}
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
        <span>My Files</span>
      </button>

      {currentFolderId && (
        <FolderCrumb folderId={currentFolderId} onNavigate={onNavigate} />
      )}
    </nav>
  );
}
