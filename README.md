# Unnati SHG Voice Command Automation

A modern, multilingual Self Help Group (SHG) management platform designed for rural and semi-urban financial communities. This project helps SHGs digitally manage members, savings, loans, meetings, documents, reports, and voice-driven assistance in a simple, user-friendly interface.

The platform is built for SHG leaders, members, and administrators who need a complete digital workspace to track group performance, monitor repayments, manage finances, and reduce manual paperwork.

<p align="center">
  <img src="frontend/public/unnati-logo.svg" alt="Unnati logo" width="180" />
</p>

## Overview

Unnati SHG Management System is a full-stack web application that streamlines the operations of Self Help Groups by combining financial tracking, member management, and community operations into one dashboard.

It supports:

- SHG registration and profile management
- Member onboarding and role assignment
- Savings tracking and monthly collections
- Loan application, approval, and repayment monitoring
- Meeting scheduling and attendance records
- Notification and reminder workflows
- Document uploads and document management
- Financial reporting and group insights
- Multilingual support (English, Hindi, Marathi)
- Voice-command assistant to trigger common actions quickly

## Why this project matters

Many SHGs still depend on spreadsheets, handwritten registers, or fragmented manual systems. This creates problems like:

- delayed record updates,
- difficulty in tracking savings and loan dues,
- missing attendance or meeting logs,
- poor visibility into member financial status,
- limited access for rural users who prefer simple interfaces.

Unnati addresses these challenges by providing a digital platform that is easy to understand, accessible, and tailored to SHG operations.

## Key features

### 1. SHG and member management
- Create and manage SHG profiles
- Assign group roles like President, Treasurer, and Member
- Maintain member identity, contact details, and status
- Track group information such as village, district, and formation date

### 2. Savings management
- Record monthly savings collection
- Track dues and contribution history
- Monitor active savings balances for each member
- Generate financial summaries for the group

### 3. Loan management
- Apply for loans through the platform
- Track loan requests and approval workflow
- Monitor outstanding balances and EMI schedules
- View repayment and overdue status
- Support repayment and collection tracking

### 4. Meeting and attendance tracking
- Create meeting records and schedules
- Record attendance and participation
- Maintain updates and compliance records for each group session

### 5. Notifications and reminders
- Send reminders for overdue payments
- Notify members about due dates and repayment status
- Keep the SHG informed through scheduled workflows

### 6. Reports and insights
- Generate financial summary reports
- Review group and member insights
- Monitor savings, loans, income, expenses, and goals
- Generate passbook-like financial records

### 7. Documents and compliance
- Upload and manage supporting documents
- Attach proof, records, and official files related to members or SHGs

### 8. Multilingual and accessible UX
- Interface designed for diverse regional users
- Support for Hindi and Marathi language labels
- Easy navigation for non-technical field users

### 9. Voice command assistance
- Navigate to registered application modules using English, Hindi, or Marathi phrases.
- Ask supported questions about the member count, group balance, or a named member's savings and loans.
- The assistant answers SHG, financial-health, and application-use questions, and supports typed or voice commands in English, Hindi, Marathi, and mixed language. Gemini interprets requests that the local intent matcher cannot resolve, keeps bounded recent-turn context, and may only choose accessible modules, supported current-data queries, or existing allowlisted actions.
- Admin write actions use guided collection, a preview, explicit confirmation, and the existing authenticated APIs. The assistant does not directly access MongoDB or perform arbitrary writes.
- English, Hindi, and Marathi voice input, conversational responses, and spoken replies use the Gemini API. If the conversational service is unavailable, the assistant reports that rather than claiming to answer.
- Configure `GEMINI_API_KEY` in `backend/.env` for Gemini conversation and voice features. The API key stays on the backend; do not put it in frontend environment variables.
- See [AI_ASSISTANT_ARCHITECTURE.md](./AI_ASSISTANT_ARCHITECTURE.md) for supported actions, permissions, privacy boundaries, and setup details.

## Tech stack

### Frontend
- React
- Vite
- JavaScript
- CSS-based responsive UI
- Localized multi-language support

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT authentication
- File upload support
- REST API architecture

### Infrastructure and utilities
- CORS enabled for client-server integration
- Environment-based configuration using `.env`
- Scheduled reminder jobs for due EMI notifications

## Project structure

```text
Self Help Group Management System/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── config/
│   ├── seed/
│   ├── uploads/
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   ├── public/
│   ├── .env.example
│   ├── package.json
│   └── index.html
├── README.md
└── .gitignore
```

## Core modules

The system is organized around these functional areas:

- Authentication and role-based access
- SHG management
- Member registration and profile control
- Savings and finance tracking
- Loan application and repayment processing
- Payment collection workflows
- Meetings and attendance management
- Notifications and reminders
- Report generation
- Documents and resource management

## User roles

### Admin / President
- Manage group configuration
- View overall SHG analytics
- Approve or review loan requests
- Monitor finances and attendance
- Handle group operations and notifications

### Member
- View personal savings and loan details
- Access passbook or balance-related data
- Submit loan applications where applicable
- View group meeting and document information

## How it works

1. An SHG is created with a unique SHG code and group details.
2. Members are registered under that SHG and linked to user accounts.
3. Savings collections and loan records are maintained digitally.
4. Financial reports and reminders are generated automatically.
5. Group leadership can monitor activities from a centralized dashboard.
6. Users can access data in a simple interface with optional voice support.

## Use cases

This platform is ideal for:

- SHG federations and women’s groups
- Rural financial institutions and field programs
- NGO-supported livelihood initiatives
- Community-based microfinance organizations
- Local cooperative savings groups

## Getting started

### Prerequisites

Before running the project, make sure you have:

- Node.js (v18 or later recommended)
- npm or yarn
- MongoDB running locally or a MongoDB connection string

### Backend setup

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### Production build

```bash
cd frontend
npm run build
```

## Environment configuration

The app relies on environment variables for backend configuration. Example values can be found in:

- `backend/.env.example`
- `frontend/.env.example`

Typical backend settings include:

- MongoDB URI
- JWT secret
- Port configuration
- Client origin for CORS
- Gemini API key for multilingual voice input and spoken replies. Add `GEMINI_API_KEY` to `backend/.env`; the key must never be placed in frontend configuration.

## Demo and sample data

The backend includes seed scripts for generating sample SHG data, which are useful for demonstrations and local testing.

```bash
cd backend
npm run seed
npm run seed:demo
```

## Security and best practices

- Passwords are hashed before storage
- JWT is used for authenticated API access
- Role-based route protection is applied in the backend
- Sensitive data should be kept in environment variables
- Use a secure MongoDB deployment in production

## Future enhancements

Possible improvements for the next version include:

- AI-powered summaries for SHG financial trends
- SMS and WhatsApp integration for reminders
- Dashboards for branch or district-level reporting
- Mobile-first responsive design for field use
- More advanced analytics and export features
- Better offline support for rural connectivity

## License

This project is currently under active development and is configured for internal or project-based use unless otherwise specified.

## Acknowledgements

This project is designed to support grassroot financial inclusion and community-led economic development.

Built to help SHGs manage their day-to-day financial and operational workflow more efficiently, transparently, and digitally.

## Project identity

Name: Unnati SHG Voice Command Automation

Focus: Empowering Self Help Groups with digital financial management, collaboration, and voice-enabled accessibility.

---

If you want, I can also make this README more GitHub-style with:

- a banner image section,
- badges for tech stack,
- a screenshot preview section,
- a more polished project tagline and contributor section.
