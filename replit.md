# CloudVault

A file management web application imported from Lovable.

## Overview
CloudVault is a frontend-only React application for file management with features including:
- File upload via drag & drop
- File organization (My Drive, Recent, Starred, Trash)
- Storage tracking
- Grid/list view toggle
- Search functionality

## Tech Stack
- React 18 with TypeScript
- Vite for development and build
- Tailwind CSS for styling
- Shadcn/UI components
- React Router for navigation
- TanStack Query for data fetching
- Lucide React for icons

## Project Structure
```
src/
├── components/
│   ├── files/       # File-related components (FileCard, FileGrid, UploadZone)
│   ├── layout/      # Layout components (Header, Sidebar)
│   └── ui/          # Shadcn UI components
├── hooks/           # Custom React hooks
├── lib/             # Utility functions
├── pages/           # Page components
├── App.tsx          # Main application component
├── main.tsx         # Entry point
└── index.css        # Global styles
```

## Development
- Run: `npm run dev` (starts on port 5000)
- Build: `npm run build`
- Preview: `npm run preview`

## Deployment
Configured for static deployment. Build output goes to `dist/` directory.
