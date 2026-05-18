# IntegrativeProject2026

##Project Description

This project is a real-time office hours booking and queue management system designed to improve communication between students and professors. The application allows students to view professor availability in real time, join a queue, and book office hour slots efficiently without confusion or long wait times.

Professors can manage their availability, monitor student queues, and update their status through a dedicated interface. The system automatically updates information across users in near real time, ensuring students always have access to accurate availability and estimated wait times.

Built with a React and TypeScript frontend, a Node.js and Express backend, and Supabase for database management, the application focuses on reliability, fairness, and ease of use for both students and professors.

---

## Team (Group 6)
- **Lukas Perkov** – QA  
- **Joey Knowles** – Frontend  
- **Sam Gaudet** – Backend  

---

## Live Application
Access the deployed app here:  
- http://3.220.113.128/

---

## Test Credentials

| Role       | Email                      | Password     |
|------------|----------------------------|--------------|
| Student    | student1@university.edu    | Password123! |
| Professor  | prof.martin@university.edu | Password123! |

---

## Tech Stack

- **Frontend:** React + TypeScript (Vite), deployed via nginx on AWS EC2  
- **Backend:** Node.js + Express + TypeScript, proxied through nginx  
- **Database:** Supabase (PostgreSQL) with Row Level Security  
- **Real-time:** Short polling every 4 seconds (professor status, queue, bookings)  

---

## Quick Start Guide

### Backend

To start the backend server, first navigate to the backend directory of the project. Open a terminal and run the following commands:

```bash
cd Backend
npm install
npm run dev
```

### Frontend

To start the frontend, first navigate to the frontend directory of the project. Open a terminal and run the following commands:

```bash
cd frontend
npm install
npm run dev
```
