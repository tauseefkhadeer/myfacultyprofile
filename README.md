# Karnataka Schools - Lightweight Management & Feedback App

A lightweight Node.js + Express + EJS + Prisma (SQLite) app to manage schools (grades 1–10), with role-based access, profiles, directories, and simple feedback.

## Stack
- Node.js 22, Express 5
- EJS templates, Bootstrap 5
- Prisma ORM with SQLite
- Sessions with `express-session` + `connect-sqlite3`

## Quick start

1. Install dependencies
```bash
npm install
```

2. Configure env (already defaults to SQLite)
```bash
echo 'DATABASE_URL="file:./dev.db"' > .env
```

3. Create DB and generate client
```bash
npm run prisma:migrate
npm run prisma:generate
```

4. Seed demo data (4 schools, admins, 12 faculty per school, 100 students per school, sample reviews)
```bash
npm run seed
```

5. Run the server
```bash
npm run start
```

Open `http://localhost:3000` (port shown in console if different).

## Logins (demo)
- Super Admin: `superadmin@example.com` / `Password@123`
- School Admins: e.g. `sunrise-principal@example.com`, `green-principal@example.com` / `Password@123`
- Academic Admins: e.g. `sunrise-academic@example.com` / `Password@123`
- Faculty: e.g. `sunrise-fac1@example.com` / `Password@123`
- Students: e.g. `sunrise-stu1@example.com` / `Password@123`
- Parents (70%): e.g. `sunrise-par1@example.com` / `Password@123`

## Features
- Role-based dashboards: Super Admin (all schools), School/Academic Admin, Faculty, Student/Parent
- Directories for Faculty, Students, Admins with search/filters and CSV export
- Review system: Students/Parents rate faculty (1–5); Faculty leave private notes on students
- Simple aggregates on dashboards (averages)

## Notes
- Password reset route is a stub (`/reset`).
- Faculty can only see their assigned students; students/parents see only their profile.
- This is a lightweight demo; extend with authorization checks and validation as needed.
