# EPIP — Employee Performance Intelligence Platform
**Sangria Edutainment Pvt Ltd**

## Overview
EPIP is a web-based employee performance management system built for Sangria Edutainment Pvt Ltd.

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS + Framer Motion |
| Backend | Node.js + Express |
| Database | PostgreSQL 17 |
| Auth | JWT + bcrypt |
| Storage | Local (uploads/) |

## User Roles
| Role | Login Method |
|---|---|
| Super Admin | Email + Password |
| HR Admin | Email + Password |
| Manager | Username + Password (set by Super Admin) |
| Employee | Username + Password (set by Manager) |

## Quick Start

### 1. Install dependencies
```bash
cd frontend && npm install
cd ../backend && npm install
```

### 2. Setup database
```bash
cd backend
node migrations/run.js
node seeders/run.js
node src/scripts/seedDemoUsers.js
```

### 3. Start backend
```bash
cd backend
npm run dev
```

### 4. Start frontend
```bash
cd frontend
npm run dev
```

### 5. Open browser
```
http://localhost:5173
```

## Demo Credentials

### Super Admin
- Email: `ruthishsagar68@gmail.com`
- Password: `Ruthishsagar68`

### HR Admin
- Email: `hr@epip.com`
- Password: `hr123`

### Managers
| Username | Password |
|---|---|
| mgr.michael | Manager@123 |
| mgr.lisa | Manager@456 |
| mgr.david | Manager@789 |

### Employees
| Username | Password |
|---|---|
| emp.emily | Emily@2026 |
| emp.james | James@2026 |
| emp.priya | Priya@2026 |
| emp.daniel | Daniel@2026 |
| emp.aisha | Aisha@2026 |

## Add New User (Super Admin)
```bash
cd backend
node src/scripts/createUser.js --name "John Doe" --username john.doe --password John@2026 --role employee
```

## Project Structure
```
EPIP/
├── frontend/          # React + Vite frontend
├── backend/           # Node.js + Express backend
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── middleware/
│   ├── migrations/    # PostgreSQL schema
│   └── seeders/       # Demo data
└── README.md
```
