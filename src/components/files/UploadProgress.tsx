import { X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface UploadingFile {
  id: string;
  name: string;
  progress: number;
  status: "uploading" | "completed" | "error";
  error?: string;
}

interface UploadProgressProps {
  files: UploadingFile[];
  onDismiss: (id: string) => void;
  onClearAll: () => void;
}

export function UploadProgress({ files, onDismiss, onClearAll }: UploadProgressProps) {
  if (files.length === 0) return null;

  const completedCount = files.filter(f => f.status === "completed").length;
  const uploadingCount = files.filter(f => f.status === "uploading").length;

  return (
    <div className="fixed bottom-6 right-6 w-80 bg-card border border-border rounded-xl shadow-elevated overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          {uploadingCount > 0 ? (
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-file-image" />
          )}
          <span className="text-sm font-medium text-foreground">
            {uploadingCount > 0 
              ? `Uploading ${uploadingCount} file${uploadingCount > 1 ? 's' : ''}` 
              : `${completedCount} upload${completedCount > 1 ? 's' : ''} complete`
            }
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClearAll} className="text-xs">
          Clear all
        </Button>
      </div>

      {/* File List */}
      <div className="max-h-64 overflow-y-auto">
        {files.map((file) => (
          <div key={file.id} className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
              {file.status === "uploading" && (
                <Progress value={file.progress} className="h-1 mt-2" />
              )}
              {file.status === "error" && (
                <p className="text-xs text-destructive mt-1">{file.error}</p>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {file.status === "completed" && (
                <CheckCircle2 className="w-4 h-4 text-file-image" />
              )}
              {file.status === "error" && (
                <AlertCircle className="w-4 h-4 text-destructive" />
              )}
              {file.status === "uploading" && (
                <span className="text-xs text-muted-foreground">{file.progress}%</span>
              )}
              
              <button 
                onClick={() => onDismiss(file.id)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
