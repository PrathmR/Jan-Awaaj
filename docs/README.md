# How to Run the App (MVP)

This repo contains:
- `backend/` : Express API + MongoDB data layer
- `mobile/` : Expo (React Native) app

## 1) Setup MongoDB Atlas (recommended)
1. Create an Atlas account and project.
2. Create a cluster (choose free tier if you just want MVP).
3. Create a database user (username/password).
4. Configure **Network Access**:
   - In Atlas console: `Security` -> `Network Access` -> `IP Access List`
   - Add your current machine public IP (or temporarily `0.0.0.0/0` only for dev).
5. Get your connection string:
   - Atlas: `Database` -> `Connect` -> `Drivers` -> `Node.js`
   - Copy the `mongodb+srv://...` URI.

### How your backend creates the DB
MongoDB will create the database/collections automatically on first insert once the backend connects.

## 2) Setup backend environment (`backend/.env`)
1. Copy:
   - `backend/.env.example` -> `backend/.env`
2. Edit required fields:
   - `MONGODB_URI`
   - `AUTH_API_KEY` (authority auth key)
   - Set `MONGODB_URI` to your Atlas `mongodb+srv://...` connection string.

## 3) Run backend
```sh
cd backend
npm install
npm run dev
```
Backend listens on `PORT` (default `4000`) and serves uploads at:
- `http://localhost:4000/uploads/...`

## 4) Setup authority authentication (MVP)
Authority routes require the header:
- `x-api-key: <AUTH_API_KEY>`

In this MVP auth mode:
- `GET /api/complaints` is protected
- `PUT /api/complaints/:complaintId` is protected

If `AUTH_JWT_SECRET` is set, the backend also supports:
- `Authorization: Bearer <token>` (JWT)

### Authority self-registration (by department/category)
This MVP also supports simple self-registration + login for authorities using JWT.

1. Ensure `AUTH_JWT_SECRET` is set in `backend/.env`.
2. Register an authority account:
   - `POST /api/auth/register`
   - Body (JSON): `{ "phone": "9876543210", "departmentId": "public-works", "password": "StrongPass123" }`
   - Response: `{ ok: true }`
3. Log in:
   - `POST /api/auth/login`
   - Body (JSON): `{ "phone": "9876543210", "password": "StrongPass123" }`
   - Response: `{ "token": "<jwt>" }`
4. Call protected endpoints with:
   - `Authorization: Bearer <jwt>`

## 5) Run mobile
```sh
cd mobile
npm install
npm start
```

The mobile app uses the `Profile` tab to store the backend URL on-device:
- Default: `http://localhost:4000`

Open the `Profile` tab and update `Backend URL` if needed (especially when running on a physical phone).

## 6) Troubleshooting: MongoDB connection failed
If you see `MongooseServerSelectionError`:
- Confirm `backend/.env` `MONGODB_URI` is the correct Atlas `mongodb+srv://...` string.
- If Atlas rejects your connection, ensure your IP is whitelisted in Atlas `Network Access`.
- Ensure the username/password in the URI is correct.

Also confirm your Atlas cluster is in an active state (not suspended).

