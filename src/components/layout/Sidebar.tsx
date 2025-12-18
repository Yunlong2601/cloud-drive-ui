import { 
  Cloud, 
  FolderOpen, 
  Clock, 
  Star, 
  Trash2, 
  Settings,
  HardDrive,
  Plus,
  KeyRound,
  MessageSquare,
  LogOut,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  storageUsed: number;
  storageTotal: number;
  onChatOpen?: () => void;
  userRole?: "user" | "admin";
}

const navItems = [
  { id: "my-drive", label: "My Drive", icon: FolderOpen },
  { id: "recent", label: "Recent", icon: Clock },
  { id: "starred", label: "Starred", icon: Star },
  { id: "trash", label: "Trash", icon: Trash2 },
];

export function Sidebar({ activeSection, onSectionChange, storageUsed, storageTotal, onChatOpen, userRole }: SidebarProps) {
  const navigate = useNavigate();
  const storagePercentage = (storageUsed / storageTotal) * 100;

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      navigate("/login");
    }
  };
  
  const formatStorage = (bytes: number) => {
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <aside className="w-64 h-screen bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-soft">
          <Cloud className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-semibold text-foreground">CloudVault</span>
      </div>

      {/* New Upload Button */}
      <div className="px-4 mb-4">
        <Button variant="gradient" className="w-full justify-start gap-3" size="lg">
          <Plus className="w-5 h-5" />
          New Upload
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Storage Indicator */}
      <div className="p-4 m-3 rounded-xl bg-muted/50 border border-border">
        <div className="flex items-center gap-2 mb-3">
          <HardDrive className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Storage</span>
        </div>
        <Progress value={storagePercentage} className="h-2 mb-2" />
        <p className="text-xs text-muted-foreground">
          {formatStorage(storageUsed)} of {formatStorage(storageTotal)} used
        </p>
      </div>

      {/* Decrypt Link */}
      <div className="px-3 pb-1">
        <Link
          to="/decrypt"
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-200"
          data-testid="link-decrypt-page"
        >
          <KeyRound className="w-5 h-5" />
          Decrypt File
        </Link>
      </div>

      {/* Chat Button */}
      <div className="px-3 pb-2">
        <button
          onClick={onChatOpen}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-200"
          data-testid="button-open-chat"
        >
          <MessageSquare className="w-5 h-5" />
          Secure Chat
        </button>
      </div>

      {/* Admin Dashboard Link */}
      <div className="px-3 pb-2">
        <Link
          to="/admin"
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-200"
          data-testid="link-admin-dashboard"
        >
          <Shield className="w-5 h-5" />
          Admin Dashboard
        </Link>
      </div>

      {/* Settings */}
      <div className="p-3 border-t border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-200">
              <Settings className="w-5 h-5" />
              Settings
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 cursor-pointer">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
