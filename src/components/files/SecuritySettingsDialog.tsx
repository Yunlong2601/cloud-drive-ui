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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Shield, ShieldCheck, ShieldAlert, Mail, Lock, Key } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SecurityLevel } from "./FileCard";

interface SecuritySettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: File[];
  onConfirm: (settings: SecuritySettings) => void;
}

export interface SecuritySettings {
  securityLevel: SecurityLevel;
  recipientEmail?: string;
  downloadCode?: string;
}

const securityOptions = [
  {
    value: "standard" as SecurityLevel,
    label: "Standard",
    description: "Basic protection with single-layer encryption",
    icon: Shield,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
  {
    value: "high" as SecurityLevel,
    label: "High",
    description: "Enhanced encryption with stronger algorithms",
    icon: ShieldCheck,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    value: "maximum" as SecurityLevel,
    label: "Maximum",
    description: "Double encryption - recipient gets email code to decrypt",
    icon: ShieldAlert,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
];

export function SecuritySettingsDialog({
  open,
  onOpenChange,
  files,
  onConfirm,
}: SecuritySettingsDialogProps) {
  const [securityLevel, setSecurityLevel] = useState<SecurityLevel>("standard");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [downloadCode, setDownloadCode] = useState("");

  const handleConfirm = () => {
    onConfirm({
      securityLevel,
      recipientEmail: securityLevel === "maximum" ? recipientEmail : undefined,
      downloadCode: securityLevel === "maximum" ? downloadCode : undefined,
    });
    setSecurityLevel("standard");
    setRecipientEmail("");
    setDownloadCode("");
    onOpenChange(false);
  };

  const isMaximumSecurity = securityLevel === "maximum";
  const canConfirm = !isMaximumSecurity || (isMaximumSecurity && recipientEmail.includes("@") && downloadCode.length >= 4);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Security Settings
          </DialogTitle>
          <DialogDescription>
            Choose the security level for {files.length} file{files.length > 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup
            value={securityLevel}
            onValueChange={(value) => setSecurityLevel(value as SecurityLevel)}
            className="space-y-3"
          >
            {securityOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = securityLevel === option.value;
              return (
                <div
                  key={option.value}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                  onClick={() => setSecurityLevel(option.value)}
                  data-testid={`security-option-${option.value}`}
                >
                  <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                  <div className={cn("p-2 rounded-lg", option.bgColor)}>
                    <Icon className={cn("w-4 h-4", option.color)} />
                  </div>
                  <div className="flex-1">
                    <Label
                      htmlFor={option.value}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {option.label}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {option.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </RadioGroup>

          {isMaximumSecurity && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="space-y-2">
                <Label htmlFor="download-code" className="flex items-center gap-2 text-sm">
                  <Lock className="w-4 h-4" />
                  Download Password (Level 1)
                </Label>
                <Input
                  id="download-code"
                  type="text"
                  placeholder="Set a password to download this file"
                  value={downloadCode}
                  onChange={(e) => setDownloadCode(e.target.value)}
                  data-testid="input-download-code"
                />
                <p className="text-xs text-muted-foreground">
                  Recipients need this password to download the file
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipient-email" className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4" />
                  Recipient Email (Level 2)
                </Label>
                <Input
                  id="recipient-email"
                  type="email"
                  placeholder="Enter recipient's email for decryption code"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  data-testid="input-recipient-email"
                />
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Key className="w-3 h-3" />
                  A second code will be emailed to decrypt the file after downloading
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-security"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm}
            data-testid="button-confirm-security"
          >
            Upload with {securityLevel} security
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
