import { useState } from 'react';
import FileList from '../components/FileList';
import FileUpload from '../components/FileUpload';
import { Upload, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  const [activeView, setActiveView] = useState<'files' | 'upload'>('files');

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Files</h1>
          <p className="text-muted-foreground">
            Manage your root-level files securely in the cloud
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setActiveView('files')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'files'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-600/80 hover:bg-blue-600 text-white'
            }`}
          >
            <FolderOpen className="h-4 w-4 mr-2" />
            Files
          </Button>
          <Button
            onClick={() => setActiveView('upload')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'upload'
                ? 'bg-teal-600 hover:bg-teal-700 text-white'
                : 'bg-teal-600/80 hover:bg-teal-600 text-white'
            }`}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {activeView === 'files' && <FileList />}
        {activeView === 'upload' && <FileUpload folderId={null} />}
      </div>
    </div>
  );
}
