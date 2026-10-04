# 🚀 Task Manager  
### _Internal Task & Project Tracking System for Wideline IT Solutions_

Task Manager is an internal staff-tracking and workflow management application built for **Wideline IT Solutions**.  
It centralizes all **client projects**, **staff tasks**, and **progress tracking** to ensure smooth operations and complete visibility across the organization.

---

## 📌 Overview

This application helps the company:

- 📁 Manage and organize **client projects**
- 📝 Create, assign, and track **staff tasks**
- 👥 Monitor **team workloads**
- 📊 Visualize **overall project and task progress**

Designed for internal use, it ensures transparency, efficiency, and accountability across all teams.

---

## 🔧 Features

- **Project Management**  
  Create, update, categorize, and monitor active and completed projects.

- **Task Assignment**  
  Assign tasks to staff with deadlines, priority levels, and progress indicators.

- **Progress Visualization**  
  High-level overview of project status, task completion rates, and staff performance.

- **Clean & User-Friendly Interface**  
  Built for productivity and minimal training.

---

## 📚 Tech Stack 

- **Frontend:** Next SSR / TS / Tailwind  
- **Backend:** Next SSR / TS  
- **Database:** MongoDB  
- **Authentication:** Next Auth  
- **Deployment:** Vercel ( Current ) 

---

## 🛠️ Installation & Setup

```bash
mkdir taskmanagement
cd taskmanagement
git clone https://github.com/DevLogifex/taskmanagement.git .
npm install --legacy-peer-deps
npm run dev
```

---

## 👨‍💻 Development Team

| Name | Role | GitHub |
|------|------|--------|
| **Muhammed Gasal C** | Lead Developer | [github.com/gasal246](https://github.com/gasal246) |
| **Anas Malik P** | Lead Developer | [github.com/anasmalikp](https://github.com/anasmalikp) |

### Release Version

- **Current:** alpha.26.1.3
- **Last Updated:** Alpha 26.1.3

## Performance and security rollout

Use Node.js 22 or newer. See [the rollout guide](scripts/performance-and-security-rollout.md) for the implemented changes, reviewed legacy enquiry ownership migration, paginated task/history APIs, durable background jobs, index setup, regression checks and the staging test for 3,000 concurrent sessions. Review and migrate legacy enquiry ownership before deploying the business-scoped authorization changes. After building, `npm run test:list-ui` runs isolated pagination and rendering checks in local Chrome/Chromium.

Task activity/comment notifications, enquiry forwarding/facility matching, project approval/assignments, team changes, calendar invitations, legacy task-assignment notifications and upload cleanup now require a job consumer. Configure the target MongoDB replica set and apply the declared indexes, then run `npm run worker:jobs` as a supervised Node.js process, or configure the protected scheduler described in the guide. The web server alone does not drain the queue. Superadmins can review and retry failed jobs at `/superadmin/jobs`.

The facility map now uses indexed map coordinates and server clusters. Existing facilities require the reviewed `migrate:camp-map-points` backfill before switching map traffic; see the rollout guide. Calendar feeds return at most 100 items by default (200 maximum), with a cursor for the next page and counts over the entire matching set.
