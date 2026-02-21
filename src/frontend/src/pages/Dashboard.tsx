import FileList from '../components/FileList';
import FileUpload from '../components/FileUpload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FolderOpen } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">My Files</h1>
        <p className="text-muted-foreground">
          Manage your files and folders securely in the cloud
        </p>
      </div>

      <Tabs defaultValue="files" className="space-y-6">
        <TabsList>
          <TabsTrigger value="files">
            <FolderOpen className="h-4 w-4 mr-2" />
            Files
          </TabsTrigger>
          <TabsTrigger value="upload">
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="space-y-4">
          <FileList />
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <FileUpload />
        </TabsContent>
      </Tabs>
    </div>
  );
}
