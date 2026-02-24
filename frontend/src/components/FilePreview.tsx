import { useEffect, useState } from 'react';
import { X, FileText, Image as ImageIcon, Video, FileIcon, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { FileMetadata } from '../backend';

interface FilePreviewProps {
  file: FileMetadata;
  fileData: Uint8Array | null;
  onClose: () => void;
}

export default function FilePreview({ file, fileData, onClose }: FilePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);

  const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(fileExtension);
  const isVideo = ['mp4', 'webm', 'ogg'].includes(fileExtension);
  const isPDF = fileExtension === 'pdf';
  const isText = ['txt', 'md', 'json', 'js', 'ts', 'tsx', 'jsx', 'css', 'html'].includes(fileExtension);

  useEffect(() => {
    if (!fileData) return;

    if (isImage || isVideo || isPDF) {
      const mimeTypes: Record<string, string> = {
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif',
        svg: 'image/svg+xml',
        webp: 'image/webp',
        mp4: 'video/mp4',
        webm: 'video/webm',
        ogg: 'video/ogg',
        pdf: 'application/pdf',
      };

      const mimeType = mimeTypes[fileExtension] || 'application/octet-stream';
      // Convert to proper Uint8Array with ArrayBuffer
      const properArray = new Uint8Array(fileData);
      const blob = new Blob([properArray], { type: mimeType });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);

      return () => URL.revokeObjectURL(url);
    } else if (isText) {
      const decoder = new TextDecoder();
      const text = decoder.decode(fileData);
      setTextContent(text);
    }
  }, [fileData, fileExtension, isImage, isVideo, isPDF, isText]);

  const getFileIcon = () => {
    if (isImage) return <ImageIcon className="h-5 w-5" />;
    if (isVideo) return <Video className="h-5 w-5" />;
    if (isText) return <FileText className="h-5 w-5" />;
    return <FileIcon className="h-5 w-5" />;
  };

  const downloadFile = () => {
    if (!fileData) return;
    const properArray = new Uint8Array(fileData);
    const blob = new Blob([properArray]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            {getFileIcon()}
            <div>
              <h2 className="text-lg font-semibold">{file.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{fileExtension.toUpperCase()}</Badge>
                <span className="text-sm text-muted-foreground">
                  {(Number(file.size) / 1024).toFixed(2)} KB
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={downloadFile}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {!fileData ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading preview...</p>
              </div>
            </div>
          ) : isImage && previewUrl ? (
            <div className="flex items-center justify-center h-full p-8 bg-muted/20">
              <img
                src={previewUrl}
                alt={file.name}
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              />
            </div>
          ) : isVideo && previewUrl ? (
            <div className="flex items-center justify-center h-full p-8">
              <video
                src={previewUrl}
                controls
                className="max-w-full max-h-full rounded-lg shadow-lg"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          ) : isPDF && previewUrl ? (
            <iframe
              src={previewUrl}
              className="w-full h-full"
              title={file.name}
            />
          ) : isText && textContent ? (
            <ScrollArea className="h-full">
              <pre className="p-8 text-sm font-mono whitespace-pre-wrap">{textContent}</pre>
            </ScrollArea>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FileIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">Preview not available</p>
                <p className="text-sm text-muted-foreground mt-2">
                  This file type cannot be previewed in the browser
                </p>
                <Button onClick={downloadFile} className="mt-4">
                  <Download className="h-4 w-4 mr-2" />
                  Download File
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
