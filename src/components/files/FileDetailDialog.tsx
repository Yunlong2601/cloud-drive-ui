import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Image,
  Film,
  Music,
  Archive,
  File,
  Download,
  Share2,
  Link,
  Trash2,
  Star,
  Copy,
  Check,
  X,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface FileData {
  id: string;
  name: string;
  type: "document" | "image" | "video" | "audio" | "archive" | "other";
  size: string;
  modified: string;
  starred?: boolean;
  sharedBy?: string;
}

interface FileDetailDialogProps {
  file: FileData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: (id: string) => void;
  onToggleStar?: (id: string) => void;
}

const FileDetailDialog = ({
  file,
  open,
  onOpenChange,
  onDelete,
  onToggleStar,
}: FileDetailDialogProps) => {
  const [showShareInput, setShowShareInput] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  if (!file) return null;

  const getFileIcon = (type: string) => {
    const iconClass = "w-16 h-16";
    switch (type) {
      case "document":
        return <FileText className={`${iconClass} text-file-document`} />;
      case "image":
        return <Image className={`${iconClass} text-file-image`} />;
      case "video":
        return <Film className={`${iconClass} text-file-video`} />;
      case "audio":
        return <Music className={`${iconClass} text-file-audio`} />;
      case "archive":
        return <Archive className={`${iconClass} text-file-archive`} />;
      default:
        return <File className={`${iconClass} text-muted-foreground`} />;
    }
  };

  const handleDownload = () => {
    toast({
      title: "Download started",
      description: `Downloading ${file.name}...`,
    });
    onOpenChange(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://cloudvault.app/share/${file.id}`);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
    toast({
      title: "Link copied",
      description: "Share link copied to clipboard",
    });
  };

  const handleShare = () => {
    if (shareEmail) {
      toast({
        title: "File shared",
        description: `${file.name} shared with ${shareEmail}`,
      });
      setShareEmail("");
      setShowShareInput(false);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(file.id);
    }
    onOpenChange(false);
    toast({
      title: "File deleted",
      description: `${file.name} has been moved to trash`,
      variant: "destructive",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">File Details</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center py-6 space-y-4">
          <div className="p-6 rounded-2xl bg-muted/50">{getFileIcon(file.type)}</div>
          <div className="text-center space-y-1">
            <h3 className="font-semibold text-lg text-foreground">{file.name}</h3>
            <p className="text-sm text-muted-foreground">
              {file.size} • Modified {file.modified}
            </p>
            {file.sharedBy && (
              <p className="text-sm text-primary">Shared by {file.sharedBy}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={handleDownload}
          >
            <Download className="w-4 h-4" />
            Download
          </Button>
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => setShowShareInput(!showShareInput)}
          >
            <Share2 className="w-4 h-4" />
            Share
          </Button>
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={handleCopyLink}
          >
            {linkCopied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Link className="w-4 h-4" />
            )}
            {linkCopied ? "Copied!" : "Copy Link"}
          </Button>
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => onToggleStar?.(file.id)}
          >
            <Star
              className={`w-4 h-4 ${file.starred ? "fill-yellow-400 text-yellow-400" : ""}`}
            />
            {file.starred ? "Unstar" : "Star"}
          </Button>
        </div>

        {showShareInput && (
          <div className="flex gap-2 mt-2 animate-fade-in">
            <Input
              placeholder="Enter email to share..."
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleShare} disabled={!shareEmail}>
              <Copy className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowShareInput(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        <div className="pt-4 border-t border-border">
          <Button
            variant="destructive"
            className="w-full flex items-center gap-2"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4" />
            Delete File
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FileDetailDialog;
