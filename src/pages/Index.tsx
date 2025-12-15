import { useState, useCallback } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { UploadZone } from "@/components/files/UploadZone";
import { FileGrid } from "@/components/files/FileGrid";
import { UploadProgress, UploadingFile } from "@/components/files/UploadProgress";
import { FileItem } from "@/components/files/FileCard";
import FileDetailDialog from "@/components/files/FileDetailDialog";
import { Button } from "@/components/ui/button";
import { Users, FolderOpen } from "lucide-react";
import { toast } from "sonner";

// Sample data for demonstration
const sampleFiles: FileItem[] = [
  { id: "1", name: "Project Proposal.pdf", type: "application/pdf", size: 2457600, modifiedAt: new Date(Date.now() - 86400000), starred: true },
  { id: "2", name: "vacation-photo.jpg", type: "image/jpeg", size: 4194304, modifiedAt: new Date(Date.now() - 172800000) },
  { id: "3", name: "presentation.pptx", type: "application/vnd.ms-powerpoint", size: 8388608, modifiedAt: new Date(Date.now() - 259200000) },
  { id: "4", name: "budget-2024.xlsx", type: "application/vnd.ms-excel", size: 1048576, modifiedAt: new Date(Date.now() - 345600000), starred: true },
  { id: "5", name: "source-code.zip", type: "application/zip", size: 15728640, modifiedAt: new Date(Date.now() - 432000000) },
  { id: "6", name: "meeting-notes.txt", type: "text/plain", size: 12288, modifiedAt: new Date() },
  { id: "7", name: "logo-design.png", type: "image/png", size: 524288, modifiedAt: new Date(Date.now() - 518400000) },
  { id: "8", name: "podcast-episode.mp3", type: "audio/mpeg", size: 52428800, modifiedAt: new Date(Date.now() - 604800000) },
  { id: "9", name: "demo-video.mp4", type: "video/mp4", size: 104857600, modifiedAt: new Date(Date.now() - 691200000) },
  { id: "10", name: "config.json", type: "application/json", size: 2048, modifiedAt: new Date(Date.now() - 777600000) },
];

// Sample shared files
const sharedFiles: FileItem[] = [
  { id: "s1", name: "Team Budget.xlsx", type: "application/vnd.ms-excel", size: 1548576, modifiedAt: new Date(Date.now() - 86400000), sharedBy: "john@example.com" },
  { id: "s2", name: "Design Assets.zip", type: "application/zip", size: 25728640, modifiedAt: new Date(Date.now() - 172800000), sharedBy: "sarah@example.com" },
  { id: "s3", name: "Meeting Recording.mp4", type: "video/mp4", size: 204857600, modifiedAt: new Date(Date.now() - 259200000), sharedBy: "mike@example.com" },
  { id: "s4", name: "Contract Draft.pdf", type: "application/pdf", size: 3457600, modifiedAt: new Date(Date.now() - 345600000), sharedBy: "legal@example.com" },
];

const Index = () => {
  const [activeSection, setActiveSection] = useState("my-drive");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [files, setFiles] = useState<FileItem[]>(sampleFiles);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isSharedView, setIsSharedView] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const storageUsed = files.reduce((acc, file) => acc + file.size, 0);
  const storageTotal = 15 * 1073741824; // 15 GB

  const currentFiles = isSharedView ? sharedFiles : files;

  const filteredFiles = currentFiles.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSection = activeSection === "starred" ? file.starred : true;
    return matchesSearch && matchesSection;
  });

  const handleFilesSelected = useCallback((selectedFiles: File[]) => {
    const newUploads: UploadingFile[] = selectedFiles.map(file => ({
      id: `upload-${Date.now()}-${file.name}`,
      name: file.name,
      progress: 0,
      status: "uploading" as const,
    }));

    setUploadingFiles(prev => [...prev, ...newUploads]);

    newUploads.forEach((upload, index) => {
      const file = selectedFiles[index];
      let progress = 0;
      
      const interval = setInterval(() => {
        progress += Math.random() * 20;
        
        if (progress >= 100) {
          clearInterval(interval);
          
          setUploadingFiles(prev => 
            prev.map(u => 
              u.id === upload.id 
                ? { ...u, progress: 100, status: "completed" as const }
                : u
            )
          );

          const newFile: FileItem = {
            id: `file-${Date.now()}-${file.name}`,
            name: file.name,
            type: file.type || "application/octet-stream",
            size: file.size,
            modifiedAt: new Date(),
          };
          
          setFiles(prev => [newFile, ...prev]);
          toast.success(`${file.name} uploaded successfully`);
        } else {
          setUploadingFiles(prev => 
            prev.map(u => 
              u.id === upload.id 
                ? { ...u, progress: Math.min(progress, 99) }
                : u
            )
          );
        }
      }, 200);
    });
  }, []);

  const handleStar = useCallback((id: string) => {
    setFiles(prev => 
      prev.map(file => 
        file.id === id ? { ...file, starred: !file.starred } : file
      )
    );
  }, []);

  const handleDelete = useCallback((id: string) => {
    const file = files.find(f => f.id === id);
    setFiles(prev => prev.filter(f => f.id !== id));
    toast.success(`${file?.name} moved to trash`);
  }, [files]);

  const handleDownload = useCallback((id: string) => {
    const file = currentFiles.find(f => f.id === id);
    toast.info(`Downloading ${file?.name}...`);
  }, [currentFiles]);

  const handleFileClick = useCallback((id: string) => {
    const file = currentFiles.find(f => f.id === id);
    if (file) {
      setSelectedFile(file);
      setDialogOpen(true);
    }
  }, [currentFiles]);

  const handleDismissUpload = useCallback((id: string) => {
    setUploadingFiles(prev => prev.filter(u => u.id !== id));
  }, []);

  const handleClearAllUploads = useCallback(() => {
    setUploadingFiles([]);
  }, []);

  // Convert FileItem to the dialog's expected format
  const getFileTypeCategory = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "audio";
    if (mimeType.includes("zip") || mimeType.includes("archive")) return "archive";
    if (mimeType.includes("pdf") || mimeType.includes("document") || mimeType.includes("text")) return "document";
    return "other";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(2)} GB`;
  };

  const dialogFileData = selectedFile ? {
    id: selectedFile.id,
    name: selectedFile.name,
    type: getFileTypeCategory(selectedFile.type) as "document" | "image" | "video" | "audio" | "archive" | "other",
    size: formatFileSize(selectedFile.size),
    modified: selectedFile.modifiedAt.toLocaleDateString(),
    starred: selectedFile.starred,
    sharedBy: selectedFile.sharedBy,
  } : null;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar 
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        storageUsed={storageUsed}
        storageTotal={storageTotal}
      />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          view={view}
          onViewChange={setView}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* View Toggle */}
          <div className="flex gap-2">
            <Button
              variant={!isSharedView ? "default" : "outline"}
              onClick={() => setIsSharedView(false)}
              className="flex items-center gap-2"
            >
              <FolderOpen className="w-4 h-4" />
              My Files
            </Button>
            <Button
              variant={isSharedView ? "default" : "outline"}
              onClick={() => setIsSharedView(true)}
              className="flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              Shared with Me
            </Button>
          </div>

          {/* Upload Zone - only show in My Files view */}
          {!isSharedView && <UploadZone onFilesSelected={handleFilesSelected} />}
          
          {/* Files Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                {isSharedView 
                  ? "Shared with Me" 
                  : activeSection === "starred" 
                    ? "Starred Files" 
                    : "My Files"}
              </h2>
              <span className="text-sm text-muted-foreground">
                {filteredFiles.length} item{filteredFiles.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            <FileGrid 
              files={filteredFiles}
              view={view}
              onStar={handleStar}
              onDelete={handleDelete}
              onDownload={handleDownload}
              onFileClick={handleFileClick}
            />
          </div>
        </div>
      </main>

      {/* File Detail Dialog */}
      <FileDetailDialog
        file={dialogFileData}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onDelete={handleDelete}
        onToggleStar={handleStar}
      />

      {/* Upload Progress */}
      <UploadProgress 
        files={uploadingFiles}
        onDismiss={handleDismissUpload}
        onClearAll={handleClearAllUploads}
      />
    </div>
  );
};

export default Index;
