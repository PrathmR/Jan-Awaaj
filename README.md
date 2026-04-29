# Citizen Grievance App (MVP)

This repository contains a minimal MVP for the citizen grievance app:
- `backend/`: Express REST API + MongoDB (complaints + community feed)
- `mobile/`: Expo React Native app (Home feed, File Complaint, Tracking, Profile)

## Backend (Express + Mongo)
1. Start MongoDB (or point `backend/.env` to MongoDB Atlas).
2. Copy `backend/.env.example` to `backend/.env` and set:
   - `MONGODB_URI`
   - `AUTH_API_KEY` (used by authority endpoints)
3. Run:
   - `cd backend`
   - `npm install`
   - `npm run dev`

Backend will listen on `PORT` (default `4000`) and serve uploads at `/uploads/...`.

## Mobile (Expo)
1. `cd mobile`
2. `npm install`
3. Update the app's `Backend URL` in the `Profile` tab (default is `http://localhost:4000`).
4. Run:
   - `npm start`

## MVP API highlights
- `POST /api/complaints` (multipart: optional `photo`)
- `GET /api/complaints/:complaintId`
- `PUT /api/complaints/:complaintId` (authority, requires `x-api-key`)
- `GET /api/posts?nearby=lat,lon&radiusKm=3` (public feed)
- `POST /api/posts/:postId/vote` and `POST /api/posts/:postId/comments`

