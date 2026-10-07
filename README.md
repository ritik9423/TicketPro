# TicketPro — Enterprise Multi-Tenant Helpdesk & Ticketing SaaS Platform

[![Spring Boot 3.3](https://img.shields.io/badge/Spring%20Boot-3.3.4-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![React 19](https://img.shields.io/badge/React-19.2-blue.svg)](https://react.dev/)
[![Tailwind CSS 3.4](https://img.shields.io/badge/Tailwind%20CSS-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![Java 17](https://img.shields.io/badge/Java-17-orange.svg)](https://www.oracle.com/java/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-4479A1.svg)](https://www.mysql.com/)

TicketPro is a high-performance, enterprise-grade multi-tenant ticketing and helpdesk platform. Designed for modern support teams, it offers strict tenant isolation, dynamic industry-specific ticket forms, real-time WebSocket notifications, automated SLA breach tracking, customer satisfaction (CSAT) analytics, and comprehensive role-based access control (RBAC).

---

## 🏗️ Architecture Overview

```
                          ┌──────────────────────────┐
                          │   Spring Boot 3.3 API    │
                          │     (Port 8081 / 5000)   │
                          │   MySQL 8.0 + WebSockets │
                          └─────────────┬────────────┘
                                        │
                ┌───────────────────────┴───────────────────────┐
                ▼                                               ▼
┌───────────────────────────────┐               ┌───────────────────────────────┐
│   frontend (Port 5173)        │               │ frontend-super-admin (Port 5174)
│   Unified Multi-Tenant App    │               │ Global SaaS Administration    │
│  ├─ 🏢 Company Admin / Manager│               │  ├─ 🌐 Multi-Tenant Workspaces│
│  ├─ 🎧 Support Agent Desk     │               │  ├─ 🏢 Company Management     │
│  └─ 👤 Customer / End User    │               │  ├─ 📜 Global Audit Trails    │
│  (Role-Adaptive Dashboards)   │               │  └─ 📊 Platform Analytics     │
└───────────────────────────────┘               └───────────────────────────────┘
```

---

## 📁 Repository Structure

```
TicketPro/
├── backend/                     # Spring Boot API Backend (Java 17)
│   ├── pom.xml                  # Maven configuration & dependencies
│   ├── src/main/java/           # Controllers, Services, Entities, Repositories, Security
│   └── src/main/resources/      # application.properties & database configuration
│
├── frontend/                    # Unified Multi-Tenant Frontend (Port 5173)
│   ├── src/pages/               # Role-adaptive Dashboard, Tickets, Departments, KB, Profile
│   ├── src/components/          # Reusable UI primitives, Modals, Industry Engines
│   └── package.json             # React 19, Tailwind CSS, Vite configuration
│
├── frontend-super-admin/        # Dedicated Super Admin Portal (Port 5174)
│   ├── src/pages/               # Companies, Plans, Users, Audit Logs, Platform Reports
│   ├── src/components/          # Concentric Rings Donut, Multi-tenant Dashboards
│   └── package.json             # React 19, Tailwind CSS, Vite configuration
│
├── scripts/archive/             # Archived developer utilities & OCR helpers
└── uploads/                     # Local storage for ticket attachments & branding assets
```

---

## 👥 User Roles & Access Control

TicketPro operates on a 5-tier Role-Based Access Control (RBAC) model:

| Role | Interface | Primary Capabilities |
|---|---|---|
| **SUPER_ADMIN** | `frontend-super-admin` | Platform-wide company onboarding, SaaS subscription plans, global audit trails, tenant-wide SLA oversight. |
| **COMPANY_ADMIN** | `frontend` | Organization setup, departments & categories, agent invites, company SLA policies, branding customization. |
| **MANAGER** | `frontend` | Departmental ticket queue oversight, agent workload management, knowledge base curation, team escalations. |
| **AGENT** | `frontend` | Ticket queues, ticket claiming, internal notes, resolution workflow, live desk status, personal reply signatures. |
| **END_USER** | `frontend` | Ticket submission with dynamic category fields, conversation history, real-time updates, CSAT 5-star ratings. |

---

## ✨ Key Features

- **⚡ Real-Time Collaboration**: Instant comment dispatch, live typing, ticket updates, and badge counters via WebSockets (`STOMP`) and BroadcastChannel.
- **🎨 Dynamic Industry Intake Engine**: Category-driven forms with custom fields (text, number, dropdown, file upload, checkboxes) tailored for IT, HR, Banking, Healthcare, and Oil & Gas.
- **⏱️ Automated SLA Tracking**: Configurable SLA policies per priority with dynamic breach warnings and resolution timelines.
- **⭐ CSAT & Feedback Loops**: In-app 5-star customer feedback modal triggered upon ticket resolution with satisfaction analytics.
- **📊 Advanced Exporting & Reporting**: Export reports directly to Microsoft Excel (`.xlsx` via Apache POI) and CSV.
- **🏢 Multi-Tenant Isolation**: Complete data scoping by `companyCode` and `companyId` across all entities.
- **✉️ Inbound Email Integration**: Automated ticket intake from inbound emails with parsing and customer mapping.

---

## 🚀 Getting Started

### Prerequisites
- **Java 17+** (JDK)
- **Maven 3.9+**
- **Node.js 20+** & **npm 10+**
- **MySQL 8.0+** running locally or via Docker

---

### 1. Database Setup

Ensure MySQL is running, then create the database:
```sql
CREATE DATABASE TicketPro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Configure your credentials in `backend/src/main/resources/application.properties` or set them via a `.env` file in the `backend/` directory:
```properties
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/TicketPro?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
SPRING_DATASOURCE_USERNAME=root
SPRING_DATASOURCE_PASSWORD=your_password
```

---

### 2. Run Backend API

```bash
cd backend
mvn clean spring-boot:run
```
> The API server boots up on **`http://localhost:8081`** (or configured `PORT`).
> Swagger OpenAPI Docs are available at: `http://localhost:8081/swagger-ui.html`

---

### 3. Run Frontends

#### A. Unified Multi-Tenant Frontend (Admin, Agent, Customer)
```bash
cd frontend
npm install
npm run dev
```
> Runs at: **`http://localhost:5173`**

#### B. Super Admin Portal
```bash
cd frontend-super-admin
npm install
npm run dev
```
> Runs at: **`http://localhost:5174`**

---

## 🛠️ Tech Stack

- **Backend**: Java 17, Spring Boot 3.3.4, Spring Security, Spring Data JPA, Spring WebSocket, Apache POI, Hibernate, Lombok
- **Frontend**: React 19, Vite 8, Tailwind CSS, Lucide Icons, Radix UI Primitives, React Router 7
- **Database**: MySQL 8.0 with HikariCP connection pooling
- **Real-Time**: WebSockets (`spring-websocket` + `stomp`), BroadcastChannel API

---

## 📄 License
This project is proprietary and confidential. Created for the TicketPro Multi-Tenant SaaS Platform.
