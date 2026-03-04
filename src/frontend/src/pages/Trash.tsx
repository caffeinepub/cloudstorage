import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Principal } from "@icp-sdk/core/principal";
import {
  ArrowUpDown,
  File,
  FileText,
  Folder as FolderIcon,
  Image,
  Loader2,
  MoreVertical,
  Music,
  RotateCcw,
  Trash2,
  Video,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import DeleteConfirmationDialog from "../components/DeleteConfirmationDialog";
import DeleteFolderConfirmationDialog from "../components/DeleteFolderConfirmationDialog";
import PaginationControls from "../components/PaginationControls";
import RestoreDialog from "../components/RestoreDialog";
import TrashFilters from "../components/TrashFilters";
import TrashStorageIndicator from "../components/TrashStorageIndicator";
import { usePagination } from "../hooks/usePagination";
import {
  type TrashFolderItem,
  type TrashItem,
  useIsCallerAdmin,
  useListTrashFiles,
  useListTrashFolders,
  usePermanentlyDeleteFile,
  usePermanentlyDeleteFolder,
  useRestoreFile,
} from "../hooks/useQueries";

type SortColumn =
  | "name"
  | "deletedAt"
  | "size"
  | "owner"
  | "retention"
  | "type";
type SortDirection = "asc" | "desc";
type TrashItemType = "file" | "folder";

interface UnifiedTrashItem {
  id: string;
  type: TrashItemType;
  name: string;
  deletedAt: bigint;
  size: bigint;
  owner: Principal;
  originalPath: string;
  retentionPeriod: bigint;
  fileData?: TrashItem;
  folderData?: TrashFolderItem;
}

export default function Trash() {
  const [adminOwnerFilter, setAdminOwnerFilter] = useState<Principal | null>(
    null,
  );
  const [filteredItems, setFilteredItems] = useState<UnifiedTrashItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
    new Set(),
  );
  const [sortColumn, setSortColumn] = useState<SortColumn>("deletedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [deleteFileDialogOpen, setDeleteFileDialogOpen] = useState(false);
  const [deleteFolderDialogOpen, setDeleteFolderDialogOpen] = useState(false);
  const [emptyTrashDialogOpen, setEmptyTrashDialogOpen] = useState(false);
  const [itemsToRestore, setItemsToRestore] = useState<UnifiedTrashItem[]>([]);
  const [itemsToDelete, setItemsToDelete] = useState<UnifiedTrashItem[]>([]);
  const [activeTab, setActiveTab] = useState<"files" | "folders">("files");

  const { data: isAdmin } = useIsCallerAdmin();
  const { data: trashFiles = [], isLoading: filesLoading } = useListTrashFiles(
    isAdmin ? adminOwnerFilter : null,
  );
  const { data: trashFolders = [], isLoading: foldersLoading } =
    useListTrashFolders(isAdmin ? adminOwnerFilter : null);
  const restoreFileMutation = useRestoreFile();
  const permanentlyDeleteFileMutation = usePermanentlyDeleteFile();
  const permanentlyDeleteFolderMutation = usePermanentlyDeleteFolder();

  // Separate pagination instances for files and folders tabs
  const filesPagination = usePagination<UnifiedTrashItem>();
  const foldersPagination = usePagination<UnifiedTrashItem>();

  const isLoading = filesLoading || foldersLoading;

  // Separate items by type
  const fileItems = useMemo<UnifiedTrashItem[]>(() => {
    return (trashFiles || []).map((file) => ({
      id: file.fileId,
      type: "file" as TrashItemType,
      name: file.metadata.name,
      deletedAt: file.deletedAt,
      size: file.metadata.size,
      owner: file.metadata.owner,
      originalPath: file.originalPath,
      retentionPeriod: file.retentionPeriod,
      fileData: file,
    }));
  }, [trashFiles]);

  const folderItems = useMemo<UnifiedTrashItem[]>(() => {
    return (trashFolders || []).map((folder) => ({
      id: folder.folder.id,
      type: "folder" as TrashItemType,
      name: folder.folder.name,
      deletedAt: folder.deletedAt,
      size: BigInt(0),
      owner: folder.owner,
      originalPath: folder.originalPath,
      retentionPeriod: folder.retentionPeriod,
      folderData: folder,
    }));
  }, [trashFolders]);

  // Get items for current tab
  const currentTabItems = useMemo(() => {
    return activeTab === "files" ? fileItems : folderItems;
  }, [activeTab, fileItems, folderItems]);

  // Memoized callback to prevent infinite loop
  const handleFilteredDataChange = useCallback((files: TrashItem[]) => {
    const mapped: UnifiedTrashItem[] = files.map((file) => ({
      id: file.fileId,
      type: "file" as TrashItemType,
      name: file.metadata.name,
      deletedAt: file.deletedAt,
      size: file.metadata.size,
      owner: file.metadata.owner,
      originalPath: file.originalPath,
      retentionPeriod: file.retentionPeriod,
      fileData: file,
    }));
    setFilteredItems(mapped);
  }, []);

  // Initialize filtered items when tab changes; also reset pagination and selection
  const { resetPage: filesResetPage } = filesPagination;
  const { resetPage: foldersResetPage } = foldersPagination;
  useEffect(() => {
    setFilteredItems(currentTabItems);
    setSelectedItemIds(new Set());
    filesResetPage();
    foldersResetPage();
  }, [currentTabItems, filesResetPage, foldersResetPage]);

  // Reset pagination when sort changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: sortColumn/sortDirection trigger the reset intentionally
  useEffect(() => {
    if (activeTab === "files") {
      filesResetPage();
    } else {
      foldersResetPage();
    }
  }, [sortColumn, sortDirection, activeTab, filesResetPage, foldersResetPage]);

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    if (["jpg", "jpeg", "png", "gif", "bmp", "svg"].includes(ext)) {
      return <Image className="h-4 w-4 text-blue-500" />;
    }
    if (["mp4", "avi", "mov", "wmv", "flv"].includes(ext)) {
      return <Video className="h-4 w-4 text-purple-500" />;
    }
    if (["mp3", "wav", "ogg", "flac"].includes(ext)) {
      return <Music className="h-4 w-4 text-green-500" />;
    }
    if (["pdf", "doc", "docx", "txt", "rtf"].includes(ext)) {
      return <FileText className="h-4 w-4 text-orange-500" />;
    }
    return <File className="h-4 w-4 text-muted-foreground" />;
  };

  const getItemIcon = (item: UnifiedTrashItem) => {
    if (item.type === "folder") {
      return <FolderIcon className="h-4 w-4 text-yellow-500" />;
    }
    return getFileIcon(item.name);
  };

  const formatSize = (bytes: bigint) => {
    const num = Number(bytes);
    if (num === 0) return "—";
    const mb = num / (1024 * 1024);
    if (mb < 1) return `${(num / 1024).toFixed(2)} KB`;
    if (mb < 1024) return `${mb.toFixed(2)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1_000_000);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  const calculateExpiryDate = (deletedAt: bigint, retentionPeriod: bigint) => {
    const expirationTime = Number(deletedAt) + Number(retentionPeriod);
    const date = new Date(expirationTime / 1_000_000);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  const sortedItems = useMemo(() => {
    const items = [...filteredItems];
    items.sort((a, b) => {
      let comparison = 0;
      switch (sortColumn) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "type":
          comparison = a.type.localeCompare(b.type);
          break;
        case "deletedAt":
          comparison = Number(a.deletedAt) - Number(b.deletedAt);
          break;
        case "size":
          comparison = Number(a.size) - Number(b.size);
          break;
        case "owner":
          comparison = a.owner.toString().localeCompare(b.owner.toString());
          break;
        case "retention": {
          const aRemaining = Number(a.deletedAt) + Number(a.retentionPeriod);
          const bRemaining = Number(b.deletedAt) + Number(b.retentionPeriod);
          comparison = aRemaining - bRemaining;
          break;
        }
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
    return items;
  }, [filteredItems, sortColumn, sortDirection]);

  // Paginated items for the current tab
  const activePagination =
    activeTab === "files" ? filesPagination : foldersPagination;
  const paginatedItems = activePagination.paginatedData(sortedItems);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleSelectAll = () => {
    if (selectedItemIds.size === paginatedItems.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(paginatedItems.map((item) => item.id)));
    }
  };

  const handleSelectItem = (itemId: string) => {
    const newSelected = new Set(selectedItemIds);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItemIds(newSelected);
  };

  const handleBulkRestore = () => {
    const items = sortedItems.filter((item) => selectedItemIds.has(item.id));
    setItemsToRestore(items);
    setRestoreDialogOpen(true);
  };

  const handleBulkDelete = () => {
    const items = sortedItems.filter((item) => selectedItemIds.has(item.id));
    setItemsToDelete(items);
    if (activeTab === "folders") {
      setDeleteFolderDialogOpen(true);
    } else {
      setDeleteFileDialogOpen(true);
    }
  };

  const handleSingleRestore = (item: UnifiedTrashItem) => {
    setItemsToRestore([item]);
    setRestoreDialogOpen(true);
  };

  const handleSingleDelete = (item: UnifiedTrashItem) => {
    setItemsToDelete([item]);
    if (item.type === "folder") {
      setDeleteFolderDialogOpen(true);
    } else {
      setDeleteFileDialogOpen(true);
    }
  };

  const handleEmptyTrash = () => {
    setItemsToDelete(sortedItems);
    setEmptyTrashDialogOpen(true);
  };

  const handleRestoreConfirm = async (newPath: string | null) => {
    try {
      for (const item of itemsToRestore) {
        if (item.type === "file") {
          await restoreFileMutation.mutateAsync({ fileId: item.id, newPath });
        } else {
          // Folder restore is not supported by the backend
          toast.warning(
            `Folder "${item.name}" cannot be restored — folder restore is not supported.`,
          );
        }
      }
      const fileRestores = itemsToRestore.filter((i) => i.type === "file");
      if (fileRestores.length > 0) {
        toast.success(`${fileRestores.length} file(s) restored successfully`);
      }
      setSelectedItemIds(new Set());
      setRestoreDialogOpen(false);
    } catch (error) {
      toast.error("Failed to restore items");
      console.error(error);
    }
  };

  const handleDeleteFileConfirm = async (secureWipe: boolean) => {
    try {
      for (const item of itemsToDelete) {
        if (item.type === "file") {
          await permanentlyDeleteFileMutation.mutateAsync({
            fileId: item.id,
            secureWipe,
          });
        } else {
          await permanentlyDeleteFolderMutation.mutateAsync(item.id);
        }
      }
      toast.success(`${itemsToDelete.length} item(s) permanently deleted`);
      setSelectedItemIds(new Set());
      setDeleteFileDialogOpen(false);
      setEmptyTrashDialogOpen(false);
    } catch (error) {
      toast.error("Failed to delete items");
      console.error(error);
    }
  };

  const handleDeleteFolderConfirm = async () => {
    try {
      for (const item of itemsToDelete) {
        if (item.type === "folder") {
          await permanentlyDeleteFolderMutation.mutateAsync(item.id);
        } else {
          await permanentlyDeleteFileMutation.mutateAsync({
            fileId: item.id,
            secureWipe: false,
          });
        }
      }
      toast.success(`${itemsToDelete.length} item(s) permanently deleted`);
      setSelectedItemIds(new Set());
      setDeleteFolderDialogOpen(false);
    } catch (error) {
      toast.error("Failed to delete items");
      console.error(error);
    }
  };

  const SortButton = ({
    column,
    children,
  }: {
    column: SortColumn;
    children: React.ReactNode;
  }) => (
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

  // File items to delete (for DeleteConfirmationDialog which expects TrashMetadata[])
  const trashItemsToDelete: TrashItem[] = itemsToDelete
    .filter((i) => i.type === "file" && i.fileData)
    .map((i) => i.fileData!);

  // Folder items to delete as UnifiedTrashItem[] (for DeleteFolderConfirmationDialog)
  const folderItemsToDelete: UnifiedTrashItem[] = itemsToDelete.filter(
    (i) => i.type === "folder",
  );

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Trash</h1>
          <p className="text-muted-foreground">
            Manage deleted files and folders
          </p>
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

      {/* Horizontal row with filter buttons on left and storage indicator on right */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex gap-2">
          <Button
            variant={activeTab === "files" ? "default" : "outline"}
            onClick={() => setActiveTab("files")}
            className={
              activeTab === "files"
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
            }
          >
            Files
            {fileItems.length > 0 && (
              <Badge
                variant="secondary"
                className={`ml-2 ${
                  activeTab === "files"
                    ? "bg-emerald-700 text-white"
                    : "bg-zinc-700 text-zinc-300"
                }`}
              >
                {fileItems.length}
              </Badge>
            )}
          </Button>
          <Button
            variant={activeTab === "folders" ? "default" : "outline"}
            onClick={() => setActiveTab("folders")}
            className={
              activeTab === "folders"
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
            }
          >
            Folders
            {folderItems.length > 0 && (
              <Badge
                variant="secondary"
                className={`ml-2 ${
                  activeTab === "folders"
                    ? "bg-emerald-700 text-white"
                    : "bg-zinc-700 text-zinc-300"
                }`}
              >
                {folderItems.length}
              </Badge>
            )}
          </Button>
        </div>

        <div className="shrink-0">
          <TrashStorageIndicator />
        </div>
      </div>

      <div className="space-y-4">
        {activeTab === "files" && (
          <TrashFilters
            trashData={trashFiles || []}
            onFilteredDataChange={handleFilteredDataChange}
            isAdmin={isAdmin || false}
            onOwnerFilterChange={setAdminOwnerFilter}
          />
        )}

        {selectedItemIds.size > 0 && (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedItemIds.size} item(s) selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleBulkRestore}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restore
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Permanently
                </Button>
              </div>
            </div>
          </Card>
        )}

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      selectedItemIds.size === paginatedItems.length &&
                      paginatedItems.length > 0
                    }
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>
                  <SortButton column="name">Name</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton column="deletedAt">Deleted</SortButton>
                </TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>
                  <SortButton column="size">Size</SortButton>
                </TableHead>
                <TableHead>Original Path</TableHead>
                {isAdmin && (
                  <TableHead>
                    <SortButton column="owner">Owner</SortButton>
                  </TableHead>
                )}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isAdmin ? 8 : 7}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <Trash2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p>No {activeTab} in trash</p>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedItemIds.has(item.id)}
                        onCheckedChange={() => handleSelectItem(item.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getItemIcon(item)}
                        <span className="font-medium truncate max-w-[200px]">
                          {item.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(item.deletedAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {calculateExpiryDate(
                        item.deletedAt,
                        item.retentionPeriod,
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatSize(item.size)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-[150px]">
                      {item.originalPath || "—"}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-sm text-muted-foreground font-mono truncate max-w-[120px]">
                        {item.owner.toString().slice(0, 12)}…
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {item.type === "file" && (
                            <DropdownMenuItem
                              onClick={() => handleSingleRestore(item)}
                            >
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Restore
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleSingleDelete(item)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Permanently
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        <PaginationControls
          currentPage={activePagination.currentPage}
          totalItems={sortedItems.length}
          itemsPerPage={activePagination.itemsPerPage}
          onPageChange={activePagination.setPage}
          onItemsPerPageChange={activePagination.setItemsPerPage}
        />
      </div>

      <RestoreDialog
        open={restoreDialogOpen}
        onOpenChange={setRestoreDialogOpen}
        selectedItems={itemsToRestore}
        onRestore={handleRestoreConfirm}
      />

      <DeleteConfirmationDialog
        open={deleteFileDialogOpen}
        onOpenChange={setDeleteFileDialogOpen}
        selectedItems={trashItemsToDelete}
        onConfirm={handleDeleteFileConfirm}
      />

      <DeleteFolderConfirmationDialog
        open={deleteFolderDialogOpen}
        onOpenChange={setDeleteFolderDialogOpen}
        selectedItems={folderItemsToDelete}
        onConfirm={handleDeleteFolderConfirm}
      />

      <DeleteConfirmationDialog
        open={emptyTrashDialogOpen}
        onOpenChange={setEmptyTrashDialogOpen}
        selectedItems={trashItemsToDelete}
        onConfirm={handleDeleteFileConfirm}
        isEmptyTrash
      />
    </div>
  );
}
