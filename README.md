ESI Progress Tracker
====================

A full-stack workspace that helps ESI students and professors organise deliverables, collaborate on feedback, and monitor academic progress in real time.

---

## ✨ Features

### Collaborative dashboards
- **Student experience**: submit files/links, track milestones, version history, announcements, and group discussions.
- **Professor experience**: compact submission queue, inline feedback, grading, analytics, announcements, and assignment templates.
- **Group workspace**: dedicated discussion board with live polling, per-thread forms, and role-aware navigation.

### Communication & notifications
- Pin global announcements, manage per-group discussions, and keep activity in sync with auto-refreshing message feeds.
- Personalised avatars, unread counters, and live sync indicators for a modern messaging feel.

### Authentication & theming
- Dual-role (student/professor) login with a new two-panel hero layout.
- Role-specific theming across dashboards, navigation, and chat bubbles.

### Data & storage
- Node.js + Express API backed by SQLite (via `better-sqlite3`) for users, submissions, announcements, and group content.
- JSON-based seed data automatically migrated into SQLite on first run.

---

## 🛠 Tech Stack

| Layer     | Tools |
|-----------|-------|
| Frontend  | React (Vite + TypeScript), CSS modules, custom design system |
| Backend   | Node.js, Express, TypeScript, better-sqlite3 |
| Tooling   | ESLint, pnpm/npm scripts, Vite, concurrently |

---

## 📁 Project Structure

```
backend/
  src/
    server.ts         # Express app + routes
    data/             # SQLite database + seed JSON
frontend/
  src/
    pages/            # Route-specific screens (dashboards, login, etc.)
    components/       # Shared UI components
    styles/           # Global + feature-specific styles
```

---

## 🚀 Getting Started

### 1. Backend API
```bash
cd backend
npm install
npm run dev
# API available at http://localhost:4000
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
# App available at http://localhost:5173
```

The backend relies on the SQLite database located in `backend/data/database.sqlite`. Seed data is migrated automatically from JSON the first time the server runs.

---

## 🧭 Roadmap

- Real authentication layer (JWT + refresh tokens, password reset)
- File storage integration (S3 or alternative)
- Fine-grained permissions per cohort/class
- Push notifications & scheduled reminders
- CI/CD pipeline and production-ready deployment configuration

---

## 📄 License

MIT
