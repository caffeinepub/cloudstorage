import { useState } from 'react';
import { useListTrashFiles, useRestoreFile, usePermanentlyDeleteFile } from '../hooks/useQueries';
import { useIsCallerAdmin } from '../hooks/useQueries';
import TrashFilters from '../components/TrashFilters';
import TrashStorageIndicator from '../components/TrashStorageIndicator';
import RestoreDialog from '../components/RestoreDialog';
import DeleteConfirmationDialog from '../components/DeleteConfirmationDialog';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Trash2, RotateCcw, FileIcon, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Principal } from '@dfinity/principal';
import type { TrashItem } from '../hooks/useQueries';

export default function Trash() {
  const { data: isAdmin } = useIsCallerAdmin();
  const [adminOwnerFilter, setAdminOwnerFilter] = useState<Principal | null>(null);
  const { data: trashFiles = [], isLoading } = useListTrashFiles(adminOwnerFilter);
  const restoreFile = useRestoreFile();
  const permanentlyDelete = usePermanentlyDeleteFile();

  const [filteredFiles, setFilteredFiles] = useState<TrashItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sortColumn, setSortColumn] = useState<'name' | 'deletedAt' | 'size'>('deletedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (column: 'name' | 'deletedAt' | 'size') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFiles(new Set(sortedFiles.map((f) => f.fileId)));
    } else {
      setSelectedFiles(new Set());
    }
  };

  const handleSelectFile = (fileId: string, checked: boolean) => {
    const newSelected = new Set(selectedFiles);
    if (checked) {
      newSelected.add(fileId);
    } else {
      newSelected.delete(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const handleRestoreClick = () => {
    if (selectedFiles.size === 0) {
      toast.error('Please select files to restore');
      return;
    }
    setRestoreDialogOpen(true);
  };

  const handleDeleteClick = () => {
    if (selectedFiles.size === 0) {
      toast.error('Please select files to delete');
      return;
    }
    setDeleteDialogOpen(true);
  };

  const handleRestore = async (newPath: string | null) => {
    try {
      for (const fileId of selectedFiles) {
        await restoreFile.mutateAsync({ 
          fileId, 
          targetFolderId: newPath 
        });
      }
      toast.success(`Restored ${selectedFiles.size} file(s)`);
      setSelectedFiles(new Set());
      setRestoreDialogOpen(false);
    } catch (error) {
      toast.error('Failed to restore files');
    }
  };

  const handlePermanentDelete = async (secureWipe: boolean) => {
    try {
      for (const fileId of selectedFiles) {
        await permanentlyDelete.mutateAsync({ fileId, secureWipe });
      }
      toast.success(`Permanently deleted ${selectedFiles.size} file(s)`);
      setSelectedFiles(new Set());
      setDeleteDialogOpen(false);
    } catch (error) {
      toast.error('Failed to delete files');
    }
  };

  const handleOwnerFilterChange = (ownerPrincipal: Principal | null) => {
    setAdminOwnerFilter(ownerPrincipal);
  };

  // Apply sorting
  const sortedFiles = [...filteredFiles].sort((a, b) => {
    let comparison = 0;
    if (sortColumn === 'name') {
      comparison = a.metadata.name.localeCompare(b.metadata.name);
    } else if (sortColumn === 'deletedAt') {
      comparison = Number(a.deletedAt) - Number(b.deletedAt);
    } else if (sortColumn === 'size') {
      comparison = Number(a.metadata.size) - Number(b.metadata.size);
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const selectedItems = sortedFiles.filter((f) => selectedFiles.has(f.fileId));

  if (isLoading) {
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Trash</h1>
        <p className="text-muted-foreground">
          Deleted files are kept here temporarily before permanent deletion
        </p>
      </div>

      <TrashStorageIndicator />

      <TrashFilters
        trashData={trashFiles}
        onFilteredDataChange={setFilteredFiles}
        isAdmin={isAdmin || false}
        onOwnerFilterChange={handleOwnerFilterChange}
      />

      {selectedFiles.size > 0 && (
        <Card className="p-4 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {selectedFiles.size} file(s) selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleRestoreClick}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Restore Selected
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDeleteClick}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </Button>
            </div>
          </div>
        </Card>
      )}

      {sortedFiles.length === 0 && trashFiles.length > 0 && (
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No files match your filters</h3>
          <p className="text-muted-foreground">Try adjusting your search criteria</p>
        </Card>
      )}

      {sortedFiles.length === 0 && trashFiles.length === 0 && (
        <Card className="p-8 text-center">
          <Trash2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Trash is empty</h3>
          <p className="text-muted-foreground">Deleted files will appear here</p>
        </Card>
      )}

      {sortedFiles.length > 0 && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedFiles.size === sortedFiles.length && sortedFiles.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('name')}
                >
                  Name {sortColumn === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead>Original Path</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('size')}
                >
                  Size {sortColumn === 'size' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('deletedAt')}
                >
                  Deleted {sortColumn === 'deletedAt' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                {isAdmin && <TableHead>Owner</TableHead>}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedFiles.map((item) => (
                <TableRow key={item.fileId}>
                  <TableCell>
                    <Checkbox
                      checked={selectedFiles.has(item.fileId)}
                      onCheckedChange={(checked) => handleSelectFile(item.fileId, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{item.metadata.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.originalPath || '/'}
                  </TableCell>
                  <TableCell>
                    {(Number(item.metadata.size) / 1024).toFixed(2)} KB
                  </TableCell>
                  <TableCell>
                    {new Date(Number(item.deletedAt) / 1000000).toLocaleDateString()}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="font-mono text-xs">
                      {item.metadata.owner.toString().slice(0, 8)}...
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedFiles(new Set([item.fileId]));
                          setRestoreDialogOpen(true);
                        }}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setSelectedFiles(new Set([item.fileId]));
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <RestoreDialog
        open={restoreDialogOpen}
        onOpenChange={setRestoreDialogOpen}
        selectedItems={selectedItems}
        onRestore={handleRestore}
      />

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        selectedItems={selectedItems}
        onConfirm={handlePermanentDelete}
      />
    </div>
  );
}
