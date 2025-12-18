# CloudVault

A file management web application with multi-level security.

## Overview
CloudVault is a React application for secure file management with features including:
- File upload via drag & drop
- File organization (My Drive, Recent, Starred, Trash)
- Storage tracking
- Grid/list view toggle
- Search functionality
- **File Security Levels**: Standard, High, and Maximum security options
- **End-to-End Encryption**: Maximum security files are encrypted client-side
- **Secure Chat**: Integrated chat sidebar with room-based messaging and 2FA protection

## Security Feature Architecture
The security system supports three levels:
1. **Standard**: Basic file storage
2. **High**: Enhanced security indication
3. **Maximum**: End-to-end encryption with email-based decryption codes

### Maximum Security Flow
1. **Upload**: When uploading with Maximum security, the file is encrypted using AES-GCM encryption
2. **Email**: The 6-digit decryption code is sent to the specified recipient email
3. **Download**: User downloads an `.encrypted` file
4. **Decrypt**: User navigates to `/decrypt` page, uploads the encrypted file, enters the code, and downloads the decrypted file

### Encryption Implementation
- Uses Web Crypto API with AES-GCM algorithm
- Key derivation uses PBKDF2 with 100,000 iterations
- Encrypted package includes: metadata, salt, IV, and encrypted content
- Located in `src/lib/crypto.ts`

### Email Integration
Email sending for decryption codes uses Gmail SMTP with nodemailer.

**Configuration:**
- `GMAIL_USER`: The Gmail address used for sending
- `GMAIL_APP_PASSWORD`: Gmail app password for authentication
- Backend server runs on port 3001
- API endpoint: `POST /api/send-decryption-code`

**Architecture:**
- Express server (`server/index.ts`) handles email sending
- Vite proxies `/api` requests to the backend in development
- The workflow runs both servers: `npx tsx server/index.ts & npm run dev`

## Tech Stack
- React 18 with TypeScript
- Vite for development and build
- Tailwind CSS for styling
- Shadcn/UI components
- React Router for navigation
- TanStack Query for data fetching
- Lucide React for icons
- Web Crypto API for encryption

## Secure Chat Feature
The chat sidebar provides secure messaging integrated into the main interface:
- **Room-based messaging**: Create and join chat rooms
- **2FA protection**: Rooms can require verification codes
- **localStorage persistence**: Messages and rooms persist locally
- **Simple user identification**: Enter a display name to start chatting

### Data Structures (shared/schema.ts)
- `chatRooms`: Room definitions with 2FA flag
- `chatMessages`: Messages linked to rooms and users
- `chat2FACodes`: Verification codes for secure rooms

## Project Structure
```
src/
├── components/
│   ├── chat/        # Chat components (ChatSidebar)
│   ├── files/       # File-related components (FileCard, FileGrid, UploadZone)
│   ├── layout/      # Layout components (Header, Sidebar)
│   └── ui/          # Shadcn UI components
├── hooks/           # Custom React hooks
├── lib/             # Utility functions (including crypto.ts, queryClient.ts)
├── pages/           # Page components (Index, Decrypt, Chat)
├── App.tsx          # Main application component
├── main.tsx         # Entry point
└── index.css        # Global styles

server/
└── index.ts         # Express backend for email sending

shared/
└── schema.ts        # Database schema (Drizzle ORM)
```

## Pages
- `/` - Main file management interface
- `/decrypt` - Decrypt encrypted files

## Development
- Run: Workflow starts both frontend and backend
- Build: `npm run build`
- Preview: `npm run preview`

## Deployment
Configured for static deployment. Build output goes to `dist/` directory.
Note: For production, the email backend would need separate deployment.
