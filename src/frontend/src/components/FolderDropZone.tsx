import { useState } from 'react';
import { cn } from '@/lib/utils';

interface FolderDropZoneProps {
  folderId: string | null;
  onDrop: (files: File[], folderId: string | null) => void;
  children: React.ReactNode;
}

export default function FolderDropZone({ folderId, onDrop, children }: FolderDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onDrop(files, folderId);
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        'transition-all',
        isDragging && 'ring-2 ring-primary ring-offset-2 rounded-lg'
      )}
    >
      {children}
    </div>
  );
}
