# IntegrativeProject2026

## Project Description

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

---

## CheckLIst

•	[X] Live Deployment: Application is accessible via a public URL.
•	[X] Authentication: Secure login implemented for both Student and Professor roles.
•	[X] Role Separation: Students and Professors see distinctly different, role-appropriate interfaces.
•	[X] Real-Time Accuracy: Status updates propagate to other screens automatically without a page refresh (under 5 seconds).
•	[X] Professor UI: Professors can quickly update availability status and view their queue.
•	[X] Student UI: Students can view real-time availability and estimated wait times.
•	[X] Booking Flow: Students can successfully request a slot or join a virtual queue.
•	[x] Automated Cancellations: The system automatically checks the queue and promotes the next student when a booking is cancelled.
•	[X] Server Authority: At least one fairness rule (e.g., Max bookings, FIFO, Cool-down) is strictly enforced by the backend/server, rejecting invalid API requests.
•	[X] Mobile Responsiveness: A student can complete the entire booking flow on a mobile browser without horizontal scrolling or zooming.
Stretch Goals & Optional Features (Nice to Haves)
•	[X] Multiple Fairness Rules: Implemented and documented more than one server-side fairness constraint.
•	[notification = Toast] Advanced Notifications: Implemented email, SMS, or active push notifications for queue promotions.
•	[ ] Queue Timeouts: Implemented logic to skip a promoted student if they do not 'claim' their slot within a specific time limit.
•	[ ] Technical Documentation: Included architecture diagrams or detailed API contracts.
•	[ ] Custom Feature: _______________________________________
•	[ ] Custom Feature: _______________________________________

---
