import { Button } from "@/components/ui/button";
import { ChevronRight, FileText, FolderPlus, Home, Upload } from "lucide-react";
import React, { useState } from "react";
import CreateFolderDialog from "../components/CreateFolderDialog";
import FileList from "../components/FileList";
import FileUpload from "../components/FileUpload";
import FolderBreadcrumbs from "../components/FolderBreadcrumbs";
import NewDocumentDialog from "../components/NewDocumentDialog";

export default function Dashboard() {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showNewDocument, setShowNewDocument] = useState(false);

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button
            type="button"
            onClick={() => setCurrentFolderId(null)}
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <Home className="h-4 w-4" />
            <span>My Files</span>
          </button>
          {currentFolderId && (
            <>
              <ChevronRight className="h-4 w-4" />
              <FolderBreadcrumbs
                currentFolderId={currentFolderId}
                onNavigate={setCurrentFolderId}
              />
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setShowCreateFolder(true)}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-0"
            data-ocid="dashboard.new_folder.open_modal_button"
          >
            <FolderPlus className="h-4 w-4" />
            New Folder
          </Button>
          <Button
            size="sm"
            onClick={() => setShowNewDocument(true)}
            className="gap-2 bg-cyan-500 hover:bg-cyan-600 text-white border-0"
            data-ocid="dashboard.new_document.open_modal_button"
          >
            <FileText className="h-4 w-4" />
            New Document
          </Button>
          <Button
            size="sm"
            onClick={() => setShowUpload((v) => !v)}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload
          </Button>
        </div>
      </div>

      {/* Upload area (collapsible) */}
      {showUpload && (
        <div className="shrink-0">
          <FileUpload currentFolderId={currentFolderId} />
        </div>
      )}

      {/* File list — renders immediately with skeleton while loading */}
      <div className="flex-1 min-h-0 rounded-xl border border-border bg-card p-4">
        <FileList
          currentFolderId={currentFolderId}
          onFolderClick={setCurrentFolderId}
        />
      </div>

      {/* Dialogs */}
      <CreateFolderDialog
        open={showCreateFolder}
        onOpenChange={setShowCreateFolder}
        parentFolderId={currentFolderId}
      />

      <NewDocumentDialog
        open={showNewDocument}
        onOpenChange={setShowNewDocument}
        currentFolderId={currentFolderId}
      />
    </div>
  );
}
