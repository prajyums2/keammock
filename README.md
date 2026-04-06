# KEAM Mock Test Platform

A professional, multi-tenant Computer-Based Test (CBT) platform for KEAM B.Tech entrance exam preparation.

## Architecture

```
Super Admin (you)
  └── Manages institutions, platform-wide settings
  └── Creates institution admin accounts

Institution Admin
  └── Creates & manages exams, questions, students
  └── Assigns tests, monitors performance
  └── Scoped to their institution only

Student
  └── Registers with institution code
  └── Takes assigned mock tests
  └── Views scores, analytics, mistakes
```

## KEAM B.Tech Exam Pattern

| | Details |
|---|---|
| **Questions** | 150 MCQs (single correct, 5 options) |
| **Duration** | 180 minutes |
| **Total Marks** | 600 |
| **Mathematics** | 75 Q × 4 marks = 300 |
| **Physics** | 45 Q × 4 marks = 180 |
| **Chemistry** | 30 Q × 4 marks = 120 |
| **Marking** | +4 correct, -1 wrong, 0 unattempted |

## Tech Stack

**Server:** Node.js, Express, MongoDB, JWT, express-validator, express-rate-limit
**Client:** React 18, TypeScript, Vite, Tailwind CSS, React Query, Zustand, Recharts, KaTeX

## Getting Started

```bash
npm install          # root
npm run dev          # starts server (5000) + client (5173)
```

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@keam.com | Keam@2026 |
| Student | student@keam.com | Keam@2026 |

## Features

### Super Admin
- Manage institutions
- Platform-wide statistics
- Full access to all data

### Institution Admin
- Create/edit/delete exams (auto-scoped to institution)
- Add questions with LaTeX support ($x^2$, $$\int_0^1 x dx$$)
- Manage students within institution
- View submissions and analytics
- Assign tests to students

### Student
- Register with institution code
- Take CBT-style mock tests
- Anti-cheating (tab switch detection, fullscreen enforcement)
- Scratchpad for rough work
- View detailed results with analytics
- Review mistakes with notes
- Performance trend across tests

## LaTeX Support

Questions support KaTeX rendering:
- Inline: `$E = mc^2$` → renders inline
- Block: `$$\int_0^1 x^2 dx$$` → renders as display math

## API Endpoints

### Auth
- `POST /api/auth/register` — Create user
- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Get current user
- `GET /api/auth/users` — List users (scoped to institution)
- `PUT/DELETE /api/auth/users/:id` — Manage users

### Exams (institution-scoped)
- `GET /api/exams` — List exams
- `POST /api/exams` — Create exam
- `PUT/DELETE /api/exams/:id` — Manage exam
- `GET /api/exams/:id/questions` — Get questions (no answers)

### Questions
- `GET /api/questions/exam/:examId` — List questions
- `POST /api/questions` — Add question (MCQ, 5 options)
- `POST /api/questions/bulk` — Bulk import
- `PUT/DELETE /api/questions/:id` — Manage question

### Results
- `POST /api/results/start` — Start test
- `POST /api/results/save-progress` — Auto-save
- `POST /api/results/submit` — Submit & score
- `GET /api/results/my-results` — My results
- `GET /api/results/:id/analytics` — Detailed analytics

### Institutions
- `GET /api/institutions` — List institutions
- `POST /api/institutions` — Create institution (super admin)
- `GET /api/institutions/:id/students` — List students

### Bookmarks
- `GET /api/bookmarks/my-mistakes` — Review mistakes
- `POST /api/bookmarks` — Add note to mistake

## License

MIT
