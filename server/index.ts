import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setupSimpleAuth, isSimpleAuthenticated } from './simpleAuth';
import { storage } from './storage';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = 3001;

app.use(cors());
app.use(express.json());

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
  console.error('WARNING: Missing email configuration. Please set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.');
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_USER || '',
    pass: GMAIL_APP_PASSWORD || '',
  },
});

async function initializeApp() {
  setupSimpleAuth(app);

  app.post('/api/send-decryption-code', async (req, res) => {
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      return res.status(500).json({ error: 'Email service not configured' });
    }

    const { email, code, fileName } = req.body;

    if (!email || !code || !fileName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const mailOptions = {
      from: GMAIL_USER,
      to: email,
      subject: `CloudVault - Decryption Code for ${fileName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4f46e5;">CloudVault Security</h2>
          <p>A decryption code has been requested for the file:</p>
          <p><strong>${fileName}</strong></p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Your decryption code is:</p>
            <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1f2937; margin: 10px 0;">${code}</p>
          </div>
          <p style="color: #6b7280; font-size: 14px;">This code is required to decrypt the maximum-security protected file. Do not share this code with anyone you don't trust.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">This email was sent by CloudVault. If you did not request this code, please ignore this email.</p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      res.json({ success: true, message: 'Decryption code sent successfully' });
    } catch (error) {
      console.error('Email send error:', error);
      res.status(500).json({ error: 'Failed to send email' });
    }
  });

  app.get('/api/chat/rooms', isSimpleAuthenticated, async (req, res) => {
    try {
      const rooms = await storage.getChatRooms();
      res.json(rooms);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      res.status(500).json({ error: 'Failed to fetch rooms' });
    }
  });

  app.post('/api/chat/rooms', isSimpleAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const { name, description, requires2FA } = req.body;
      const room = await storage.createChatRoom({
        name,
        description,
        createdBy: userId,
        requires2FA: requires2FA || false,
      });
      res.json(room);
    } catch (error) {
      console.error('Error creating room:', error);
      res.status(500).json({ error: 'Failed to create room' });
    }
  });

  app.get('/api/chat/rooms/:roomId/messages', isSimpleAuthenticated, async (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      const messages = await storage.getChatMessages(roomId);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  app.post('/api/chat/2fa/request', isSimpleAuthenticated, async (req: any, res) => {
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      return res.status(500).json({ error: 'Email service not configured' });
    }

    try {
      const userId = req.session.user.id;
      const user = req.session.user;
      const { roomId } = req.body;

      if (!user?.email) {
        return res.status(400).json({ error: 'User email not found' });
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await storage.create2FACode({
        userId,
        roomId,
        code,
        verified: false,
        expiresAt,
      });

      const mailOptions = {
        from: GMAIL_USER,
        to: user.email,
        subject: 'CloudVault Chat - 2FA Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4f46e5;">CloudVault Chat Security</h2>
            <p>Your two-factor authentication code for secure chat access:</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1f2937; margin: 10px 0;">${code}</p>
            </div>
            <p style="color: #6b7280; font-size: 14px;">This code expires in 10 minutes.</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      res.json({ success: true, message: '2FA code sent to your email' });
    } catch (error) {
      console.error('Error sending 2FA code:', error);
      res.status(500).json({ error: 'Failed to send 2FA code' });
    }
  });

  app.post('/api/chat/2fa/verify', isSimpleAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const { roomId, code } = req.body;

      const verified = await storage.verify2FACode(userId, roomId, code);
      if (verified) {
        res.json({ success: true, message: 'Verification successful' });
      } else {
        res.status(400).json({ error: 'Invalid or expired code' });
      }
    } catch (error) {
      console.error('Error verifying 2FA:', error);
      res.status(500).json({ error: 'Failed to verify code' });
    }
  });

  app.get('/api/chat/2fa/status/:roomId', isSimpleAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const roomId = parseInt(req.params.roomId);
      
      const room = await storage.getChatRoom(roomId);
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }

      if (!room.requires2FA) {
        return res.json({ verified: true, required: false });
      }

      const verification = await storage.getValid2FAVerification(userId, roomId);
      res.json({ verified: !!verification, required: true });
    } catch (error) {
      console.error('Error checking 2FA status:', error);
      res.status(500).json({ error: 'Failed to check 2FA status' });
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', (roomId: number) => {
      socket.join(`room-${roomId}`);
      console.log(`User ${socket.id} joined room ${roomId}`);
    });

    socket.on('leave-room', (roomId: number) => {
      socket.leave(`room-${roomId}`);
      console.log(`User ${socket.id} left room ${roomId}`);
    });

    socket.on('send-message', async (data: { roomId: number; userId: string; content: string }) => {
      try {
        const message = await storage.createChatMessage({
          roomId: data.roomId,
          userId: data.userId,
          content: data.content,
        });
        
        const user = await storage.getUser(data.userId);
        io.to(`room-${data.roomId}`).emit('new-message', {
          ...message,
          user: user ? { firstName: user.firstName, lastName: user.lastName, profileImageUrl: user.profileImageUrl } : null
        });
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

initializeApp();
