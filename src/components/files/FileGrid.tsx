import { FileCard, FileItem } from "./FileCard";

interface FileGridProps {
  files: FileItem[];
  view: "grid" | "list";
  onStar?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDownload?: (id: string) => void;
}

export function FileGrid({ files, view, onStar, onDelete, onDownload }: FileGridProps) {
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
          <svg 
            className="w-12 h-12 text-muted-foreground"
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1.5} 
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" 
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No files yet</h3>
        <p className="text-sm text-muted-foreground">Upload files to get started</p>
      </div>
    );
  }

  if (view === "list") {
    return (
      <div className="space-y-1">
        {/* List Header */}
        <div className="flex items-center gap-4 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <div className="w-10" />
          <div className="flex-1">Name</div>
          <div className="w-24 text-right">Size</div>
          <div className="w-28 text-right">Modified</div>
          <div className="w-20" />
        </div>
        
        {files.map((file) => (
          <FileCard 
            key={file.id} 
            file={file} 
            view={view}
            onStar={onStar}
            onDelete={onDelete}
            onDownload={onDownload}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {files.map((file) => (
        <FileCard 
          key={file.id} 
          file={file} 
          view={view}
          onStar={onStar}
          onDelete={onDelete}
          onDownload={onDownload}
        />
      ))}
    </div>
  );
}
