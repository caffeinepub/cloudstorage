import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useRecentUploads } from "../contexts/RecentUploadsContext";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useUploadFile } from "../hooks/useQueries";

interface FileUploadProps {
  currentFolderId?: string | null;
}

export default function FileUpload({ currentFolderId }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadFile = useUploadFile();
  const { addRecentUpload } = useRecentUploads();
  const { identity } = useInternetIdentity();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      setSelectedFiles((prev) => [...prev, ...files]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select files to upload");
      return;
    }

    if (!identity) {
      toast.error("You must be logged in to upload files");
      return;
    }

    const owner = identity.getPrincipal();

    for (const file of selectedFiles) {
      try {
        const fileId = await uploadFile.mutateAsync({
          file,
          folderId: currentFolderId ?? null,
        });
        toast.success(`${file.name} uploaded successfully`);

        // Add to recent uploads context
        addRecentUpload(fileId, file.name, BigInt(file.size), owner);
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setSelectedFiles([]);
  };

  return (
    <div className="space-y-4">
      {currentFolderId && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">Uploading to current folder</Badge>
        </div>
      )}
      <Card
        className={`p-8 border-2 border-dashed transition-colors ${
          dragActive ? "border-primary bg-primary/5" : "border-border"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="text-center">
          <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">
            Drop files here or click to browse
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Support for images, videos, documents, and more
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button onClick={() => fileInputRef.current?.click()}>
            Select Files
          </Button>
        </div>
      </Card>

      {selectedFiles.length > 0 && (
        <Card className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">
                Selected Files ({selectedFiles.length})
              </h4>
              <Button
                onClick={handleUpload}
                disabled={uploadFile.isPending}
                size="sm"
              >
                {uploadFile.isPending ? "Uploading..." : "Upload All"}
              </Button>
            </div>
            {uploadFile.isPending && <Progress value={33} className="h-2" />}
            <div className="space-y-2">
              {selectedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${file.size}-${index}`}
                  className="flex items-center justify-between p-2 bg-muted rounded-md"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(index)}
                    disabled={uploadFile.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
