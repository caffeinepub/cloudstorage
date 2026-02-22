import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Pause, Play, X } from 'lucide-react';

interface UploadFile {
  file: File;
  progress: number;
  paused: boolean;
}

interface FolderUploadProgressProps {
  files: UploadFile[];
  onPause: (index: number) => void;
  onCancel: (index: number) => void;
}

export default function FolderUploadProgress({ files, onPause, onCancel }: FolderUploadProgressProps) {
  if (files.length === 0) return null;

  return (
    <Card className="fixed bottom-4 right-4 w-96 max-w-[calc(100vw-2rem)] p-4 shadow-lg z-50">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Uploading {files.length} file(s)</h4>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {files.map((uploadFile, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate flex-1">{uploadFile.file.name}</span>
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onPause(index)}
                  >
                    {uploadFile.paused ? (
                      <Play className="h-3 w-3" />
                    ) : (
                      <Pause className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onCancel(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <Progress value={uploadFile.progress} className="h-1" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{uploadFile.progress}%</span>
                <span>{(uploadFile.file.size / 1024).toFixed(2)} KB</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
