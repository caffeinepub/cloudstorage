import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useRouter } from '@tanstack/react-router';
import { useListFolders, useGetFolderMetadata } from '../hooks/useFolderQueries';
import { useListFilesByFolder } from '../hooks/useQueries';
import FolderToolbar from '../components/FolderToolbar';
import FolderBreadcrumb from '../components/FolderBreadcrumb';
import CreateFolderDialog from '../components/CreateFolderDialog';
import FolderContextMenu from '../components/FolderContextMenu';
import RenameFolderDialog from '../components/RenameFolderDialog';
import EditFolderDialog from '../components/EditFolderDialog';
import MoveFolderDialog from '../components/MoveFolderDialog';
import DeleteFolderDialog from '../components/DeleteFolderDialog';
import FolderDropZone from '../components/FolderDropZone';
import FileUpload from '../components/FileUpload';
import { Card } from '@/components/ui/card';
import { Folder, File, Users, Lock, Globe, ArrowLeft, Eye, Download, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { FolderMetadata } from '../backend';

export default function FoldersPage() {
  const router = useRouter();
  const navigate = useNavigate();
  const searchParams = router.latestLocation.search as any;
  const currentFolderId = searchParams?.folderId || null;

  const { data: folders = [], isLoading: foldersLoading } = useListFolders();
  const { data: currentFolder } = useGetFolderMetadata(currentFolderId);
  const { data: files = [], isLoading: filesLoading } = useListFilesByFolder(currentFolderId);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<FolderMetadata | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const subfolders = folders.filter((f) => f.parentFolderId === currentFolderId);

  const handleFolderClick = (folderId: string) => {
    navigate({ to: '/folders', search: { folderId } });
  };

  const handleBackClick = () => {
    if (currentFolder?.parentFolderId) {
      navigate({ to: '/folders', search: { folderId: currentFolder.parentFolderId } });
    } else {
      navigate({ to: '/folders' });
    }
  };

  const handleFolderAction = (folder: FolderMetadata, action: 'rename' | 'edit' | 'move' | 'delete') => {
    setSelectedFolder(folder);
    if (action === 'rename') setRenameDialogOpen(true);
    if (action === 'edit') setEditDialogOpen(true);
    if (action === 'move') setMoveDialogOpen(true);
    if (action === 'delete') setDeleteDialogOpen(true);
  };

  if (foldersLoading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Folders</h1>
          <p className="text-muted-foreground">
            Organize your files with nested folders
          </p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2">
        {currentFolderId && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackClick}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}
        <FolderBreadcrumb currentFolderId={currentFolderId} folders={folders} />
      </div>

      <FolderToolbar
        onNewFolder={() => setCreateDialogOpen(true)}
        onUpload={() => setUploadDialogOpen(true)}
      />

      <div className="mt-6 space-y-6">
        {subfolders.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">Folders</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {subfolders.map((folder) => (
                <FolderDropZone
                  key={folder.id}
                  folderId={folder.id}
                  onDrop={() => {}}
                >
                  <Card 
                    className="p-4 hover:shadow-md transition-shadow cursor-pointer group"
                    onClick={() => handleFolderClick(folder.id)}
                  >
                    <FolderContextMenu
                      folder={folder}
                      onAction={(action) => {
                        handleFolderAction(folder, action);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: folder.color + '20' }}
                        >
                          <Folder className="h-5 w-5" style={{ color: folder.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{folder.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            {folder.isPublic ? (
                              <Globe className="h-3 w-3 text-muted-foreground" />
                            ) : (
                              <Lock className="h-3 w-3 text-muted-foreground" />
                            )}
                            {folder.collaborators.length > 0 && (
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {folder.collaborators.length}
                                </span>
                              </div>
                            )}
                          </div>
                          {folder.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {folder.tags.slice(0, 2).map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {folder.tags.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{folder.tags.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </FolderContextMenu>
                  </Card>
                </FolderDropZone>
              ))}
            </div>
          </div>
        )}

        {files.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">Files</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {files.map((file) => (
                <Card key={file.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <File className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{file.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(Number(file.size) / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {subfolders.length === 0 && files.length === 0 && (
          <div className="text-center py-12">
            <Folder className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No folders or files yet</h3>
            <p className="text-muted-foreground">
              Create a new folder or upload files to get started
            </p>
          </div>
        )}
      </div>

      <CreateFolderDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        parentFolderId={currentFolderId}
      />

      {uploadDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Upload Files</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setUploadDialogOpen(false)}
              >
                <span className="sr-only">Close</span>
                ×
              </Button>
            </div>
            <FileUpload folderId={currentFolderId} onComplete={() => setUploadDialogOpen(false)} />
          </div>
        </div>
      )}

      {selectedFolder && (
        <>
          <RenameFolderDialog
            open={renameDialogOpen}
            onOpenChange={setRenameDialogOpen}
            folder={selectedFolder}
          />
          <EditFolderDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            folder={selectedFolder}
          />
          <MoveFolderDialog
            open={moveDialogOpen}
            onOpenChange={setMoveDialogOpen}
            folder={selectedFolder}
            folders={folders}
          />
          <DeleteFolderDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            folder={selectedFolder}
          />
        </>
      )}
    </div>
  );
}
