# StyleFit AI Demo

A small but fully working demo for an AI-powered virtual try-on and size recommendation workflow.

## What is included

- Product URL validation for supported platforms
- Product extraction workflow with review/edit screen
- Category-aware size recommendation engine
- Camera preview and measurement guidance flows
- Size-specific garment visualization
- Result save/history actions
- Basic admin dashboard and privacy consent flows

## Stack

- Frontend: React + Vite + TypeScript
- Backend: Express + TypeScript
- Database: SQLite via Prisma
- Auth: JWT-based demo auth

## Run locally

1. Install dependencies:
   npm install
2. Generate the Prisma client:
   npx prisma generate
3. Push the SQLite schema:
   npx prisma db push
4. Start the app:
   npm run dev

The frontend runs on port 5173 and the API runs on port 4000.

## Demo notes

This project demonstrates the full user flow with production-oriented architecture, but it intentionally uses safe demo fallbacks when real AI or live web scraping is unavailable. The app clearly marks estimated or AI-generated information so it never misrepresents real product data.

## Environment variables

Copy .env.example to .env and update values for production use.
