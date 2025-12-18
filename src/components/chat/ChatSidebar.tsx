import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Plus, Send, Shield, Lock, X, ChevronLeft } from "lucide-react";

export interface ChatRoomData {
  id: number;
  name: string;
  description: string | null;
  requires2FA: boolean;
  createdAt: string;
}

export interface ChatMessageData {
  id: number;
  roomId: number;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_KEY_USER = "cloudvault_chat_user";
const STORAGE_KEY_ROOMS = "cloudvault_chat_rooms";
const STORAGE_KEY_MESSAGES = "cloudvault_chat_messages";

export function ChatSidebar({ isOpen, onClose }: ChatSidebarProps) {
  const { toast } = useToast();
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_USER) || "";
  });
  const [showNameInput, setShowNameInput] = useState(!userName);
  const [tempName, setTempName] = useState("");
  
  const [rooms, setRooms] = useState<ChatRoomData[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ROOMS);
    return saved ? JSON.parse(saved) : [
      { id: 1, name: "General", description: "Public discussion", requires2FA: false, createdAt: new Date().toISOString() },
      { id: 2, name: "Secure Files", description: "2FA protected room", requires2FA: true, createdAt: new Date().toISOString() },
    ];
  });
  
  const [messages, setMessages] = useState<ChatMessageData[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_MESSAGES);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [selectedRoom, setSelectedRoom] = useState<ChatRoomData | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDescription, setNewRoomDescription] = useState("");
  const [newRoomRequires2FA, setNewRoomRequires2FA] = useState(false);
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [twoFACode, setTwoFACode] = useState("");
  const [pendingRoom, setPendingRoom] = useState<ChatRoomData | null>(null);
  const [verifiedRooms, setVerifiedRooms] = useState<Set<number>>(new Set());
  const [generatedCode, setGeneratedCode] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ROOMS, JSON.stringify(rooms));
  }, [rooms]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSetUserName = () => {
    if (tempName.trim()) {
      setUserName(tempName.trim());
      localStorage.setItem(STORAGE_KEY_USER, tempName.trim());
      setShowNameInput(false);
    }
  };

  const handleSelectRoom = (room: ChatRoomData) => {
    if (room.requires2FA && !verifiedRooms.has(room.id)) {
      setPendingRoom(room);
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedCode(code);
      setShow2FADialog(true);
      toast({ title: `2FA Code: ${code}`, description: "Enter this code to access the room" });
      return;
    }
    setSelectedRoom(room);
  };

  const handleVerify2FA = () => {
    if (twoFACode === generatedCode && pendingRoom) {
      setVerifiedRooms(prev => new Set(prev).add(pendingRoom.id));
      setSelectedRoom(pendingRoom);
      setShow2FADialog(false);
      setPendingRoom(null);
      setTwoFACode("");
      setGeneratedCode("");
      toast({ title: "Verification successful" });
    } else {
      toast({ title: "Invalid code", variant: "destructive" });
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedRoom || !userName) return;
    
    const message: ChatMessageData = {
      id: Date.now(),
      roomId: selectedRoom.id,
      senderId: userName.toLowerCase().replace(/\s/g, "_"),
      senderName: userName,
      content: newMessage.trim(),
      createdAt: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, message]);
    setNewMessage("");
  };

  const handleCreateRoom = () => {
    if (!newRoomName.trim()) return;
    
    const newRoom: ChatRoomData = {
      id: Date.now(),
      name: newRoomName.trim(),
      description: newRoomDescription.trim() || null,
      requires2FA: newRoomRequires2FA,
      createdAt: new Date().toISOString(),
    };
    
    setRooms(prev => [...prev, newRoom]);
    setShowCreateRoom(false);
    setNewRoomName("");
    setNewRoomDescription("");
    setNewRoomRequires2FA(false);
    toast({ title: "Room created successfully" });
  };

  const roomMessages = messages.filter(m => m.roomId === selectedRoom?.id);

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-screen w-80 bg-card border-l border-border flex flex-col z-50 shadow-lg">
      <div className="p-4 border-b flex items-center justify-between gap-2">
        {selectedRoom ? (
          <button
            onClick={() => setSelectedRoom(null)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            data-testid="button-back-to-rooms"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm">Rooms</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <span className="font-semibold">Chat</span>
          </div>
        )}
        <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-chat">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {showNameInput ? (
        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">Enter your name to start chatting</p>
          <Input
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            placeholder="Your name"
            data-testid="input-user-name"
            onKeyDown={(e) => e.key === "Enter" && handleSetUserName()}
          />
          <Button onClick={handleSetUserName} className="w-full" data-testid="button-set-name">
            Start Chatting
          </Button>
        </div>
      ) : selectedRoom ? (
        <>
          <div className="p-3 border-b flex items-center gap-2">
            <span className="font-medium truncate">{selectedRoom.name}</span>
            {selectedRoom.requires2FA && (
              <Badge variant="outline" className="shrink-0">
                <Lock className="w-3 h-3 mr-1" />
                Secure
              </Badge>
            )}
          </div>

          <ScrollArea className="flex-1 p-3">
            <div className="space-y-3">
              {roomMessages.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No messages yet. Start the conversation!
                </p>
              )}
              {roomMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-2 ${message.senderId === userName.toLowerCase().replace(/\s/g, "_") ? "justify-end" : ""}`}
                >
                  {message.senderId !== userName.toLowerCase().replace(/\s/g, "_") && (
                    <Avatar className="w-7 h-7 shrink-0">
                      <AvatarFallback className="text-xs">
                        {message.senderName[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg p-2 ${
                      message.senderId === userName.toLowerCase().replace(/\s/g, "_")
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {message.senderId !== userName.toLowerCase().replace(/\s/g, "_") && (
                      <p className="text-xs font-medium mb-0.5 opacity-80">
                        {message.senderName}
                      </p>
                    )}
                    <p className="text-sm break-words">{message.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="p-3 border-t">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex gap-2"
            >
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1"
                data-testid="input-chat-message"
              />
              <Button type="submit" size="icon" data-testid="button-send-message">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </>
      ) : (
        <>
          <div className="p-3">
            <Button
              onClick={() => setShowCreateRoom(true)}
              className="w-full"
              size="sm"
              data-testid="button-create-room"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Room
            </Button>
          </div>

          <ScrollArea className="flex-1 px-2">
            <div className="space-y-1 pb-2">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => handleSelectRoom(room)}
                  className="w-full p-3 rounded-md text-left transition-colors hover:bg-muted"
                  data-testid={`button-room-${room.id}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate text-sm">{room.name}</span>
                    {room.requires2FA && (
                      <Badge variant="secondary" className="shrink-0">
                        <Shield className="w-3 h-3 mr-1" />
                        2FA
                      </Badge>
                    )}
                  </div>
                  {room.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {room.description}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>

          <div className="p-3 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Avatar className="w-5 h-5">
                <AvatarFallback className="text-[10px]">{userName[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="truncate">{userName}</span>
              <button
                onClick={() => setShowNameInput(true)}
                className="ml-auto text-primary hover:underline"
                data-testid="button-change-name"
              >
                Change
              </button>
            </div>
          </div>
        </>
      )}

      <Dialog open={showCreateRoom} onOpenChange={setShowCreateRoom}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Chat Room</DialogTitle>
            <DialogDescription>Create a new room for secure messaging</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="room-name">Room Name</Label>
              <Input
                id="room-name"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="General"
                data-testid="input-new-room-name"
              />
            </div>
            <div>
              <Label htmlFor="room-description">Description (optional)</Label>
              <Input
                id="room-description"
                value={newRoomDescription}
                onChange={(e) => setNewRoomDescription(e.target.value)}
                placeholder="A place to chat..."
                data-testid="input-new-room-description"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-0.5">
                <Label>Require 2FA</Label>
                <p className="text-sm text-muted-foreground">
                  Users must verify with a code to join
                </p>
              </div>
              <Switch
                checked={newRoomRequires2FA}
                onCheckedChange={setNewRoomRequires2FA}
                data-testid="switch-room-2fa"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateRoom(false)} data-testid="button-cancel-create-room">
              Cancel
            </Button>
            <Button
              onClick={handleCreateRoom}
              disabled={!newRoomName.trim()}
              data-testid="button-confirm-create-room"
            >
              Create Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={show2FADialog} onOpenChange={setShow2FADialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Enter the verification code shown in the notification to access this secure room.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="2fa-code">Verification Code</Label>
              <Input
                id="2fa-code"
                value={twoFACode}
                onChange={(e) => setTwoFACode(e.target.value)}
                placeholder="000000"
                maxLength={6}
                className="text-center text-2xl tracking-widest"
                data-testid="input-room-2fa-code"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShow2FADialog(false)} data-testid="button-cancel-2fa">
              Cancel
            </Button>
            <Button
              onClick={handleVerify2FA}
              disabled={twoFACode.length !== 6}
              data-testid="button-verify-room-2fa"
            >
              Verify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
