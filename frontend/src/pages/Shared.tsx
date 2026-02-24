import SharedWithMe from '../components/SharedWithMe';
import SharedByMe from '../components/SharedByMe';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Share2, Users, Send } from 'lucide-react';

export default function Shared() {
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Share2 className="h-7 w-7 text-primary" />
          Shared Files
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage files shared with you and files you've shared with others.
        </p>
      </div>

      <Tabs defaultValue="with-me" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="with-me" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Shared With Me
          </TabsTrigger>
          <TabsTrigger value="by-me" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Shared By Me
          </TabsTrigger>
        </TabsList>

        <TabsContent value="with-me">
          <SharedWithMe />
        </TabsContent>

        <TabsContent value="by-me">
          <SharedByMe />
        </TabsContent>
      </Tabs>
    </div>
  );
}
