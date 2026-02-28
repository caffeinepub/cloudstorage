import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileText,
  Folder as FolderIcon,
  MoreVertical,
  RotateCcw,
  Trash2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useGetTrash,
  useGetTrashFolders,
  useRestoreFile,
  useRestoreFolder,
  usePermanentlyDeleteFile,
  usePermanentlyDeleteFolder,
  useIsCallerAdmin,
} from '../hooks/useQueries';
import type { TrashItem, TrashFolderItem } from '../hooks/useQueries';
import { usePagination } from '../hooks/usePagination';
import { toast } from 'sonner';
import { Principal } from '@icp-sdk/core/principal';

function formatFileSize(bytes: bigint): string {
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(ns: bigint): string {
  return new Date(Number(ns) / 1_000_000).toLocaleDateString();
}

export default function Trash() {
  const { data: isAdmin } = useIsCallerAdmin();
  const { data: trashFiles = [], isLoading: filesLoading } = useGetTrash();
  const { data: trashFolders = [], isLoading: foldersLoading } = useGetTrashFolders();

  const restoreFileMutation = useRestoreFile();
  const restoreFolderMutation = useRestoreFolder();
  const deleteFileMutation = usePermanentlyDeleteFile();
  const deleteFolderMutation = usePermanentlyDeleteFolder();

  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [pendingDeleteType, setPendingDeleteType] = useState<'file' | 'folder'>('file');
  const [searchQuery, setSearchQuery] = useState('');

  const filesPagination = usePagination<TrashItem>();
  const foldersPagination = usePagination<TrashFolderItem>();

  const isLoading = filesLoading || foldersLoading;

  const filteredFiles = useMemo(() => {
    const files = (trashFiles ?? []) as TrashItem[];
    if (!searchQuery) return files;
    return files.filter((f) =>
      f.metadata.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [trashFiles, searchQuery]);

  const filteredFolders = useMemo(() => {
    const folders = (trashFolders ?? []) as TrashFolderItem[];
    if (!searchQuery) return folders;
    return folders.filter((f) =>
      f.folder.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [trashFolders, searchQuery]);

  const paginatedFiles = filesPagination.paginatedData(filteredFiles) as TrashItem[];
  const paginatedFolders = foldersPagination.paginatedData(filteredFolders) as TrashFolderItem[];

  // File selection
  const handleSelectFile = (id: string, checked: boolean) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleSelectAllFiles = (checked: boolean) => {
    if (checked) {
      setSelectedFileIds(new Set(filteredFiles.map((f) => f.fileId)));
    } else {
      setSelectedFileIds(new Set());
    }
  };

  // Folder selection
  const handleSelectFolder = (id: string, checked: boolean) => {
    setSelectedFolderIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleSelectAllFolders = (checked: boolean) => {
    if (checked) {
      setSelectedFolderIds(new Set(filteredFolders.map((f) => f.folder.id)));
    } else {
      setSelectedFolderIds(new Set());
    }
  };

  // Restore
  const handleRestoreFile = async (fileId: string) => {
    try {
      await restoreFileMutation.mutateAsync({ fileId, targetFolderId: null });
      toast.success('File restored');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to restore file';
      toast.error(message);
    }
  };

  const handleRestoreFolder = async (folderId: string) => {
    try {
      await restoreFolderMutation.mutateAsync({ folderId, targetParentId: null });
      toast.success('Folder restored');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to restore folder';
      toast.error(message);
    }
  };

  // Delete
  const confirmDelete = (ids: string[], type: 'file' | 'folder') => {
    setPendingDeleteIds(ids);
    setPendingDeleteType(type);
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    setConfirmDeleteOpen(false);
    if (pendingDeleteType === 'file') {
      for (const id of pendingDeleteIds) {
        try {
          await deleteFileMutation.mutateAsync(id);
        } catch {
          // continue
        }
      }
      toast.success(`Permanently deleted ${pendingDeleteIds.length} file(s)`);
      setSelectedFileIds(new Set());
    } else {
      for (const id of pendingDeleteIds) {
        try {
          await deleteFolderMutation.mutateAsync(id);
        } catch {
          // continue
        }
      }
      toast.success(`Permanently deleted ${pendingDeleteIds.length} folder(s)`);
      setSelectedFolderIds(new Set());
    }
    setPendingDeleteIds([]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-3" />
          <p className="text-muted-foreground">Loading trash...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trash2 className="w-6 h-6 text-destructive" />
          Trash
        </h1>
        <p className="text-muted-foreground mt-1">
          Files and folders moved to trash. They will be permanently deleted after the retention
          period.
        </p>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search trash..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-xs px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <Tabs defaultValue="files">
        <TabsList className="mb-4">
          <TabsTrigger value="files">
            Files ({filteredFiles.length})
          </TabsTrigger>
          <TabsTrigger value="folders">
            Folders ({filteredFolders.length})
          </TabsTrigger>
        </TabsList>

        {/* Files Tab */}
        <TabsContent value="files">
          {selectedFileIds.size > 0 && (
            <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg border border-primary/20 mb-3">
              <span className="text-sm font-medium">{selectedFileIds.size} selected</span>
              <div className="flex gap-2 ml-auto">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => confirmDelete(Array.from(selectedFileIds), 'file')}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Delete Permanently
                </Button>
              </div>
            </div>
          )}

          {filteredFiles.length === 0 ? (
            <div className="text-center py-16">
              <Trash2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No files in trash</p>
            </div>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={
                          filteredFiles.length > 0 &&
                          filteredFiles.every((f) => selectedFileIds.has(f.fileId))
                        }
                        onCheckedChange={handleSelectAllFiles}
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Size</TableHead>
                    <TableHead className="hidden lg:table-cell">Deleted</TableHead>
                    <TableHead className="hidden lg:table-cell">Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedFiles.map((item) => (
                    <TableRow key={item.fileId}>
                      <TableCell>
                        <Checkbox
                          checked={selectedFileIds.has(item.fileId)}
                          onCheckedChange={(checked) =>
                            handleSelectFile(item.fileId, !!checked)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium truncate max-w-[200px]">
                            {item.metadata.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {formatFileSize(item.metadata.size)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {formatDate(item.deletedAt)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {formatDate(item.deletedAt + item.retentionPeriod)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreVertical className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleRestoreFile(item.fileId)}
                              disabled={restoreFileMutation.isPending}
                            >
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Restore
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => confirmDelete([item.fileId], 'file')}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Permanently
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* Folders Tab */}
        <TabsContent value="folders">
          {selectedFolderIds.size > 0 && (
            <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg border border-primary/20 mb-3">
              <span className="text-sm font-medium">{selectedFolderIds.size} selected</span>
              <div className="flex gap-2 ml-auto">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => confirmDelete(Array.from(selectedFolderIds), 'folder')}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Delete Permanently
                </Button>
              </div>
            </div>
          )}

          {filteredFolders.length === 0 ? (
            <div className="text-center py-16">
              <FolderIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No folders in trash</p>
            </div>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={
                          filteredFolders.length > 0 &&
                          filteredFolders.every((f) => selectedFolderIds.has(f.folder.id))
                        }
                        onCheckedChange={handleSelectAllFolders}
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Original Path</TableHead>
                    <TableHead className="hidden lg:table-cell">Deleted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedFolders.map((item) => (
                    <TableRow key={item.folder.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedFolderIds.has(item.folder.id)}
                          onCheckedChange={(checked) =>
                            handleSelectFolder(item.folder.id, !!checked)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FolderIcon className="w-4 h-4 text-amber-500 shrink-0" />
                          <span className="text-sm font-medium truncate max-w-[200px]">
                            {item.folder.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {item.originalPath}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {formatDate(item.deletedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreVertical className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleRestoreFolder(item.folder.id)}
                              disabled={restoreFolderMutation.isPending}
                            >
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Restore
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => confirmDelete([item.folder.id], 'folder')}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Permanently
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Confirm Delete Dialog */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Permanently Delete?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {pendingDeleteIds.length}{' '}
              {pendingDeleteType === 'file' ? 'file' : 'folder'}
              {pendingDeleteIds.length !== 1 ? 's' : ''}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
