import { useState } from 'react';
import { useListFiles, useDeleteFile, useDownloadFile } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileIcon, Trash2, Eye, Download, Grid3x3, List, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import FilePreview from './FilePreview';
import type { FileMetadata } from '../backend';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export default function FileList() {
  const { data: files, isLoading } = useListFiles();
  const deleteFile = useDeleteFile();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);
  const { data: fileData, isLoading: downloadLoading } = useDownloadFile(previewFile?.id || null);

  const handleDelete = async (fileId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) return;

    try {
      await deleteFile.mutateAsync(fileId);
      toast.success('File deleted successfully');
    } catch (error) {
      toast.error('Failed to delete file');
    }
  };

  const handlePreview = (file: FileMetadata) => {
    setPreviewFile(file);
  };

  const handleDownload = async (file: FileMetadata) => {
    toast.info('Download functionality coming soon');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading files...</p>
        </div>
      </div>
    );
  }

  if (!files || files.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FileIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium">No files yet</p>
          <p className="text-sm text-muted-foreground mt-2">Upload your first file to get started</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex justify-end gap-2">
        <Button
          variant={viewMode === 'grid' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('grid')}
        >
          <Grid3x3 className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === 'list' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('list')}
        >
          <List className="h-4 w-4" />
        </Button>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {files.map((file) => (
            <Card key={file.id} className="p-4 hover:shadow-lg transition-shadow">
              <div className="flex flex-col h-full">
                <div className="flex items-start justify-between mb-3">
                  <FileIcon className="h-10 w-10 text-primary" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handlePreview(file)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload(file)}>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(file.id, file.name)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <h3 className="font-medium truncate mb-2" title={file.name}>
                  {file.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-auto">
                  <Badge variant="outline">{file.name.split('.').pop()?.toUpperCase()}</Badge>
                  <span>{(Number(file.size) / 1024).toFixed(2)} KB</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <Card key={file.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <FileIcon className="h-8 w-8 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate" title={file.name}>
                      {file.name}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <Badge variant="outline">{file.name.split('.').pop()?.toUpperCase()}</Badge>
                      <span>{(Number(file.size) / 1024).toFixed(2)} KB</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handlePreview(file)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDownload(file)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(file.id, file.name)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {previewFile && (
        <FilePreview
          file={previewFile}
          fileData={fileData || null}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </>
  );
}
