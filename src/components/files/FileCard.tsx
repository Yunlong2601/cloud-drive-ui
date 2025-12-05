import { 
  FileText, 
  Image, 
  Video, 
  Music, 
  Archive, 
  Code,
  File,
  MoreVertical,
  Star,
  Download,
  Trash2,
  Share2
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export interface FileItem {
  id: string;
  name: string;
  type: string;
  size: number;
  modifiedAt: Date;
  starred?: boolean;
  thumbnail?: string;
}

interface FileCardProps {
  file: FileItem;
  view: "grid" | "list";
  onStar?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDownload?: (id: string) => void;
}

const getFileIcon = (type: string) => {
  if (type.startsWith("image/")) return { icon: Image, color: "text-file-image", bg: "bg-file-image/10" };
  if (type.startsWith("video/")) return { icon: Video, color: "text-file-video", bg: "bg-file-video/10" };
  if (type.startsWith("audio/")) return { icon: Music, color: "text-file-audio", bg: "bg-file-audio/10" };
  if (type.includes("zip") || type.includes("rar") || type.includes("tar")) 
    return { icon: Archive, color: "text-file-archive", bg: "bg-file-archive/10" };
  if (type.includes("javascript") || type.includes("typescript") || type.includes("json") || type.includes("html") || type.includes("css"))
    return { icon: Code, color: "text-file-code", bg: "bg-file-code/10" };
  if (type.includes("pdf") || type.includes("document") || type.includes("text"))
    return { icon: FileText, color: "text-file-document", bg: "bg-file-document/10" };
  return { icon: File, color: "text-muted-foreground", bg: "bg-muted" };
};

const formatFileSize = (bytes: number) => {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
};

const formatDate = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
};

export function FileCard({ file, view, onStar, onDelete, onDownload }: FileCardProps) {
  const { icon: Icon, color, bg } = getFileIcon(file.type);

  if (view === "list") {
    return (
      <div className="group flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-all duration-200">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", bg)}>
          <Icon className={cn("w-5 h-5", color)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
        </div>
        
        <p className="text-sm text-muted-foreground w-24 text-right">{formatFileSize(file.size)}</p>
        <p className="text-sm text-muted-foreground w-28 text-right">{formatDate(file.modifiedAt)}</p>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => onStar?.(file.id)}
          >
            <Star className={cn("w-4 h-4", file.starred ? "fill-yellow-400 text-yellow-400" : "")} />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onDownload?.(file.id)}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete?.(file.id)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative bg-card border border-border rounded-xl p-4 hover:shadow-elevated hover:border-primary/20 transition-all duration-300 animate-scale-in">
      {/* Star Button */}
      <button 
        onClick={() => onStar?.(file.id)}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Star className={cn(
          "w-5 h-5 transition-colors",
          file.starred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground hover:text-yellow-400"
        )} />
      </button>

      {/* File Icon/Thumbnail */}
      <div className={cn(
        "w-full aspect-square rounded-lg flex items-center justify-center mb-4 transition-transform group-hover:scale-105",
        bg
      )}>
        {file.thumbnail ? (
          <img 
            src={file.thumbnail} 
            alt={file.name} 
            className="w-full h-full object-cover rounded-lg"
          />
        ) : (
          <Icon className={cn("w-12 h-12", color)} />
        )}
      </div>

      {/* File Info */}
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground truncate" title={file.name}>
          {file.name}
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatFileSize(file.size)}</span>
          <span>{formatDate(file.modifiedAt)}</span>
        </div>
      </div>

      {/* Actions Menu */}
      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 bg-background/80 backdrop-blur">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onDownload?.(file.id)}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete?.(file.id)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
