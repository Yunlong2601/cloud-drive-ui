import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Download, AlertCircle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface DownloadCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  expectedCode: string;
  onSuccess: () => void;
}

export function DownloadCodeDialog({
  open,
  onOpenChange,
  fileName,
  expectedCode,
  onSuccess,
}: DownloadCodeDialogProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const handleVerify = () => {
    if (code === expectedCode) {
      setError("");
      onSuccess();
      setCode("");
      onOpenChange(false);
    } else {
      setError("Incorrect password. Please try again.");
    }
  };

  const handleClose = () => {
    setCode("");
    setError("");
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && code.length >= 4) {
      handleVerify();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-orange-500" />
            Protected File - Level 1
          </DialogTitle>
          <DialogDescription>
            Enter the download password to access this file
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <p className="text-sm font-medium text-foreground">{fileName}</p>
            <p className="text-xs text-muted-foreground">
              This file requires a password to download
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="download-code" className="flex items-center gap-2 text-sm">
              <Lock className="w-4 h-4" />
              Download Password
            </Label>
            <Input
              id="download-code"
              type="password"
              placeholder="Enter password"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError("");
              }}
              onKeyDown={handleKeyDown}
              className={cn(error && "border-destructive")}
              data-testid="input-download-password"
            />
            {error && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </p>
            )}
          </div>

          <div className="p-3 rounded-lg bg-orange-500/10 text-orange-700 dark:text-orange-400">
            <p className="text-xs">
              After downloading, you will receive a second code via email to decrypt the file on your device.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            data-testid="button-cancel-download"
          >
            Cancel
          </Button>
          <Button
            onClick={handleVerify}
            disabled={code.length < 4}
            data-testid="button-verify-download"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Encrypted File
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
