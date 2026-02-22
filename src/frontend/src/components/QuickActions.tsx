import { useState, useRef } from 'react';
import { Upload, FolderPlus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUploadFile } from '../hooks/useQueries';
import { toast } from 'sonner';

export default function QuickActions() {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadFileMutation = useUploadFile();

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        await uploadFileMutation.mutateAsync({ file: files[i], folderId: null });
      }
      toast.success(`Successfully uploaded ${files.length} file(s)`);
    } catch (error) {
      toast.error('Upload failed. Please check your storage quota.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleNewFolder = () => {
    toast.info('Folder creation coming soon!');
  };

  const handleCreateDocument = async () => {
    try {
      const fileName = `New Document ${Date.now()}.txt`;
      const content = '';
      const blob = new Blob([content], { type: 'text/plain' });
      const file = new File([blob], fileName, { type: 'text/plain' });
      
      await uploadFileMutation.mutateAsync({ file, folderId: null });
      toast.success('Text document created successfully!');
    } catch (error) {
      toast.error('Failed to create document. Please check your storage quota.');
    }
  };

  const actions = [
    {
      icon: Upload,
      label: 'Upload Files',
      description: 'Upload files from your device',
      onClick: handleUploadClick,
      color: 'from-chart-2 to-chart-3',
      iconBg: 'bg-chart-2/10',
      iconColor: 'text-chart-2',
    },
    {
      icon: FolderPlus,
      label: 'New Folder',
      description: 'Create a new folder',
      onClick: handleNewFolder,
      color: 'from-chart-1 to-chart-5',
      iconBg: 'bg-chart-1/10',
      iconColor: 'text-chart-1',
    },
    {
      icon: FileText,
      label: 'Create Text Document',
      description: 'Start a new text file',
      onClick: handleCreateDocument,
      color: 'from-primary to-chart-4',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={action.onClick}
              disabled={isUploading}
              className="group relative bg-card border border-border rounded-xl p-6 text-left hover:shadow-lg hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
              
              <div className="relative z-10">
                <div className={`${action.iconBg} w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`h-6 w-6 ${action.iconColor}`} />
                </div>
                
                <h3 className="text-lg font-semibold mb-1 group-hover:text-primary transition-colors">
                  {action.label}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {action.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
