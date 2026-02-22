import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
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
  Image,
  Video,
  Music,
  File,
  MoreVertical,
  RotateCcw,
  Trash2,
  ArrowUpDown,
  Loader2,
} from 'lucide-react';
import TrashFilters from '../components/TrashFilters';
import RestoreDialog from '../components/RestoreDialog';
import DeleteConfirmationDialog from '../components/DeleteConfirmationDialog';
import TrashStorageIndicator from '../components/TrashStorageIndicator';
import { 
  useListTrashFiles,
  useRestoreFile, 
  usePermanentlyDeleteFile, 
  useIsCallerAdmin,
  type TrashItem 
} from '../hooks/useQueries';
import { toast } from 'sonner';
import { Principal } from '@dfinity/principal';

type SortColumn = 'name' | 'deletedAt' | 'size' | 'owner' | 'retention';
type SortDirection = 'asc' | 'desc';

export default function Trash() {
  const [adminOwnerFilter, setAdminOwnerFilter] = useState<Principal | null>(null);
  const [filteredItems, setFilteredItems] = useState<TrashItem[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<SortColumn>('deletedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [emptyTrashDialogOpen, setEmptyTrashDialogOpen] = useState(false);
  const [itemsToRestore, setItemsToRestore] = useState<TrashItem[]>([]);
  const [itemsToDelete, setItemsToDelete] = useState<TrashItem[]>([]);

  const { data: isAdmin } = useIsCallerAdmin();
  const { data: trashItems = [], isLoading } = useListTrashFiles(isAdmin ? adminOwnerFilter : null);
  const restoreFileMutation = useRestoreFile();
  const permanentlyDeleteFileMutation = usePermanentlyDeleteFile();

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'].includes(ext)) {
      return <Image className="h-4 w-4 text-blue-500" />;
    }
    if (['mp4', 'avi', 'mov', 'wmv', 'flv'].includes(ext)) {
      return <Video className="h-4 w-4 text-purple-500" />;
    }
    if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) {
      return <Music className="h-4 w-4 text-green-500" />;
    }
    if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext)) {
      return <FileText className="h-4 w-4 text-orange-500" />;
    }
    return <File className="h-4 w-4 text-muted-foreground" />;
  };

  const formatSize = (bytes: bigint) => {
    const num = Number(bytes);
    if (num === 0) return '0 B';
    const mb = num / (1024 * 1024);
    if (mb < 1) return `${(num / 1024).toFixed(2)} KB`;
    if (mb < 1024) return `${mb.toFixed(2)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1_000_000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const calculateRetentionCountdown = (deletedAt: bigint, retentionPeriod: bigint) => {
    const now = Date.now() * 1_000_000;
    const expirationTime = Number(deletedAt) + Number(retentionPeriod);
    const remaining = expirationTime - now;

    if (remaining <= 0) return 'Expired';

    const days = Math.floor(remaining / (1_000_000_000 * 60 * 60 * 24));
    const hours = Math.floor((remaining % (1_000_000_000 * 60 * 60 * 24)) / (1_000_000_000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;
    return '< 1h';
  };

  const sortedItems = useMemo(() => {
    const items = [...filteredItems];
    items.sort((a, b) => {
      let comparison = 0;
      switch (sortColumn) {
        case 'name':
          comparison = a.metadata.name.localeCompare(b.metadata.name);
          break;
        case 'deletedAt':
          comparison = Number(a.deletedAt) - Number(b.deletedAt);
          break;
        case 'size':
          comparison = Number(a.metadata.size) - Number(b.metadata.size);
          break;
        case 'owner':
          comparison = a.metadata.owner.toString().localeCompare(b.metadata.owner.toString());
          break;
        case 'retention':
          const aRemaining = Number(a.deletedAt) + Number(a.retentionPeriod);
          const bRemaining = Number(b.deletedAt) + Number(b.retentionPeriod);
          comparison = aRemaining - bRemaining;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return items;
  }, [filteredItems, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = () => {
    if (selectedFileIds.size === sortedItems.length) {
      setSelectedFileIds(new Set());
    } else {
      setSelectedFileIds(new Set(sortedItems.map((item) => item.fileId)));
    }
  };

  const handleSelectItem = (fileId: string) => {
    const newSelected = new Set(selectedFileIds);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFileIds(newSelected);
  };

  const handleBulkRestore = () => {
    const items = sortedItems.filter((item) => selectedFileIds.has(item.fileId));
    setItemsToRestore(items);
    setRestoreDialogOpen(true);
  };

  const handleBulkDelete = () => {
    const items = sortedItems.filter((item) => selectedFileIds.has(item.fileId));
    setItemsToDelete(items);
    setDeleteDialogOpen(true);
  };

  const handleSingleRestore = (item: TrashItem) => {
    setItemsToRestore([item]);
    setRestoreDialogOpen(true);
  };

  const handleSingleDelete = (item: TrashItem) => {
    setItemsToDelete([item]);
    setDeleteDialogOpen(true);
  };

  const handleEmptyTrash = () => {
    setItemsToDelete(sortedItems);
    setEmptyTrashDialogOpen(true);
  };

  const handleRestoreConfirm = async (newPath: string | null) => {
    try {
      for (const item of itemsToRestore) {
        await restoreFileMutation.mutateAsync({
          fileId: item.fileId,
          newPath,
        });
      }
      toast.success(`${itemsToRestore.length} file(s) restored successfully`);
      setSelectedFileIds(new Set());
      setRestoreDialogOpen(false);
    } catch (error) {
      toast.error('Failed to restore files');
      console.error(error);
    }
  };

  const handleDeleteConfirm = async (secureWipe: boolean) => {
    try {
      for (const item of itemsToDelete) {
        await permanentlyDeleteFileMutation.mutateAsync({
          fileId: item.fileId,
          secureWipe,
        });
      }
      toast.success(`${itemsToDelete.length} file(s) permanently deleted`);
      setSelectedFileIds(new Set());
      setDeleteDialogOpen(false);
      setEmptyTrashDialogOpen(false);
    } catch (error) {
      toast.error('Failed to delete files');
      console.error(error);
    }
  };

  const SortButton = ({ column, children }: { column: SortColumn; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent"
      onClick={() => handleSort(column)}
    >
      {children}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Trash</h1>
          <p className="text-muted-foreground">Manage deleted files</p>
        </div>
        <Button
          variant="destructive"
          onClick={handleEmptyTrash}
          disabled={sortedItems.length === 0}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Empty Trash
        </Button>
      </div>

      <TrashStorageIndicator />

      <TrashFilters
        trashData={trashItems}
        onFilteredDataChange={setFilteredItems}
        isAdmin={isAdmin || false}
        onOwnerFilterChange={setAdminOwnerFilter}
      />

      {selectedFileIds.size > 0 && (
        <Card className="mb-4 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {selectedFileIds.size} file(s) selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleBulkRestore}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Restore
              </Button>
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Permanently
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card>
        {sortedItems.length === 0 ? (
          <div className="p-12 text-center">
            <Trash2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Trash is empty</h2>
            <p className="text-muted-foreground">
              Deleted files will appear here and can be restored or permanently deleted
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedFileIds.size === sortedItems.length && sortedItems.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>
                  <SortButton column="name">Name</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton column="deletedAt">Deleted Date</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton column="size">Size</SortButton>
                </TableHead>
                {isAdmin && (
                  <TableHead>
                    <SortButton column="owner">Owner</SortButton>
                  </TableHead>
                )}
                <TableHead>
                  <SortButton column="retention">Retention</SortButton>
                </TableHead>
                <TableHead className="w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.map((item) => (
                <TableRow
                  key={item.fileId}
                  className={selectedFileIds.has(item.fileId) ? 'bg-muted/50' : ''}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedFileIds.has(item.fileId)}
                      onCheckedChange={() => handleSelectItem(item.fileId)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getFileIcon(item.metadata.name)}
                      <span className="font-medium">{item.metadata.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(item.deletedAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatSize(item.metadata.size)}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-muted-foreground text-xs font-mono">
                      {item.metadata.owner.toString().slice(0, 8)}...
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge variant="outline">
                      {calculateRetentionCountdown(item.deletedAt, item.retentionPeriod)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleSingleRestore(item)}>
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Restore
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleSingleDelete(item)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Permanently
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <RestoreDialog
        open={restoreDialogOpen}
        onOpenChange={setRestoreDialogOpen}
        selectedItems={itemsToRestore}
        onRestore={handleRestoreConfirm}
      />

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        selectedItems={itemsToDelete}
        onConfirm={handleDeleteConfirm}
        isEmptyTrash={false}
      />

      <DeleteConfirmationDialog
        open={emptyTrashDialogOpen}
        onOpenChange={setEmptyTrashDialogOpen}
        selectedItems={itemsToDelete}
        onConfirm={handleDeleteConfirm}
        isEmptyTrash={true}
      />
    </div>
  );
}
