ESI Progress Tracker

A collaborative web platform for students and professors to organize, monitor, and evaluate academic work.

## Features
- Student dashboard: upload work (PDF/ZIP/links), notes, milestones, progress timeline, view feedback/grades
- Professor dashboard: view students/groups, track submissions, comment/feedback, approve/resubmit, class analytics
- Authentication: student/professor roles (mock for local dev)
- Progress tracking: per project or per student
- Analytics: submission statistics and progress summaries

## Tech Stack
- Backend: Node.js + Express (TypeScript)
- Frontend: React (Vite + TypeScript)
- Storage: JSON files (development). Swap with DB later.

## Monorepo Structure

```
backend/
  src/
    server.ts
    routes/
    models/
    services/
  data/
frontend/
  src/
shared/
```

## Getting Started

1) Backend
- Install: `cd backend && npm i`
- Dev: `npm run dev`
- Env: `PORT=4000`

2) Frontend
- Install: `cd frontend && npm i`
- Dev: `npm run dev`
- Open: http://localhost:5173

Note: The backend uses file-based JSON storage under `backend/data/` for quick iteration. Replace with a real database in production.

## Roadmap
- Replace mock auth with real auth (JWT + sessions)
- File uploads (Multer/S3) replacing base64 stub
- Database integration (PostgreSQL + Prisma)
- Role/permission hardening
- Realtime notifications

## License
MIT


