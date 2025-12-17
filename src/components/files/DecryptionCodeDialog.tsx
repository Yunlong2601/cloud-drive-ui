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
import { Key, Mail, Lock, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DecryptionCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  recipientEmail: string;
  expectedCode: string;
  onSuccess: () => void;
}

export function DecryptionCodeDialog({
  open,
  onOpenChange,
  fileName,
  recipientEmail,
  expectedCode,
  onSuccess,
}: DecryptionCodeDialogProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSendCode = async () => {
    setSending(true);
    setError("");
    
    try {
      const response = await fetch('/api/send-decryption-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: recipientEmail,
          code: expectedCode,
          fileName: fileName,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send email');
      }
      
      setEmailSent(true);
    } catch (err) {
      setError('Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleVerify = () => {
    if (code === expectedCode) {
      setError("");
      onSuccess();
      setCode("");
      setEmailSent(false);
      onOpenChange(false);
    } else {
      setError("Invalid decryption code. Please try again.");
    }
  };

  const handleClose = () => {
    setCode("");
    setError("");
    setEmailSent(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-orange-500" />
            Maximum Security File
          </DialogTitle>
          <DialogDescription>
            This file requires a secondary decryption code to download
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <p className="text-sm font-medium text-foreground">{fileName}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Mail className="w-3 h-3" />
              Code will be sent to: {recipientEmail}
            </p>
          </div>

          {!emailSent ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Click the button below to receive a one-time decryption code via email
              </p>
              <Button
                onClick={handleSendCode}
                className="w-full"
                disabled={sending}
                data-testid="button-send-code"
              >
                <Mail className="w-4 h-4 mr-2" />
                {sending ? "Sending..." : "Send Decryption Code"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-700 dark:text-green-400">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Code sent to {recipientEmail}</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="decryption-code" className="flex items-center gap-2 text-sm">
                  <Key className="w-4 h-4" />
                  Enter Decryption Code
                </Label>
                <Input
                  id="decryption-code"
                  type="text"
                  placeholder="Enter the 6-digit code"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setError("");
                  }}
                  className={cn(error && "border-destructive")}
                  maxLength={6}
                  data-testid="input-decryption-code"
                />
                {error && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {error}
                  </p>
                )}
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Check your email for the decryption code. The code expires in 10 minutes.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            data-testid="button-cancel-decryption"
          >
            Cancel
          </Button>
          {emailSent && (
            <Button
              onClick={handleVerify}
              disabled={code.length < 6}
              data-testid="button-verify-code"
            >
              Verify & Download
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
