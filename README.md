# UniTrack

UniTrack is the EE4207 Web Application Development project: a full-stack
academic tracker built with React, Vite, Express, Mongoose, and MongoDB.
Students can manage semesters, modules, grades, tasks, study sessions, and
a daily study goal in an account-specific workspace.

## Local setup

Requirements: Node.js/npm and a MongoDB connection available to the backend.

1. Install frontend dependencies:

   ```powershell
   cd client
   npm.cmd install
   ```

2. Install backend dependencies:

   ```powershell
   cd ..\server
   npm.cmd install
   ```

3. Create `server/.env` from `server/.env.example` and set `MONGO_URI` to your
   MongoDB connection string. Keep `.env` private and do not commit it.
   `PORT` defaults to `5000`; `FRONTEND_ORIGIN` defaults to the local Vite
   address shown in the example. The server creates a `JWT_SECRET` locally if
   it is not already configured.

4. Start the backend in one terminal:

   ```powershell
   cd server
   npm.cmd run dev
   ```

5. Start the frontend in another terminal:

   ```powershell
   cd client
   npm.cmd run dev
   ```

6. Open <http://127.0.0.1:5173>. The backend health endpoints are
   <http://127.0.0.1:5000/api/health> and
   <http://127.0.0.1:5000/api/ready>. Vite proxies `/api` requests to port
   `5000`.

## Data and application structure

The Express API is in `server/routes`; Mongoose schemas are in
`server/models`. Users own their semester, module, task, and study-session
records. The daily study goal is stored on the user record. Authentication
uses an HttpOnly cookie. The React application is in `client/src`, with
separate pages, reusable components, API clients, and workspace state.

New accounts start without academic, task, or study records. The landing-page
examples are illustrative sample data and are not attached to real accounts.

## Project verification and submission

Build the frontend with `cd client; npm.cmd run build`. The package manifests
currently do not define a project-specific automated test command.

## Deploying to Vercel

Create two Vercel projects connected to this repository. Assign the frontend
the production domain `unitrack.vercel.app` and the backend
`unitrack-api.vercel.app` (or use the actual assigned domains consistently
below). The frontend rewrite in `client/vercel.json` sends `/api/*` requests
to the backend; keep that rewrite before the React Router `/index.html`
fallback. If Vercel assigns a different backend domain, update the rewrite
destination to that exact HTTPS origin.

**Backend project**

- Root Directory: `server`
- Framework Preset: Express
- Build Command and Output Directory: use Vercel's detected defaults; no
  separate static output directory is needed.
- Add these Production Environment Variables in Project Settings:
  - `MONGO_URI`: the existing MongoDB Atlas connection string.
  - `JWT_SECRET`: generate a new, strong secret (for example, run
    `node -e "process.stdout.write(require('crypto').randomBytes(64).toString('base64url'))"`
    locally) and enter its output directly in Vercel. Do not put this value
    in source control or a frontend variable.
  - `FRONTEND_ORIGIN`: the exact production frontend origin, such as
    `https://unitrack.vercel.app`, with no trailing slash.
- For Preview deployments, configure `MONGO_URI`, a separate `JWT_SECRET`,
  and `FRONTEND_ORIGIN` for the stable frontend preview domain you use.
- Do not set `PORT`; Vercel provides its own function runtime.

**Frontend project**

- Root Directory: `client`
- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- No backend credentials or `JWT_SECRET` belong in this project. The API
  client uses same-origin `/api` paths; `client/vercel.json` proxies them to
  the backend and falls back to `index.html` for client-side routes.

**Deployment order**

1. Create and configure the backend project and its environment variables,
   then deploy it.
2. Verify its `/api/health` and `/api/ready` endpoints; readiness must report
   a connected database.
3. Confirm the deployed backend hostname matches the rewrite destination in
   `client/vercel.json` (change the destination if it differs).
4. Create and deploy the frontend project, then test registration, login,
   refresh, and logout through the frontend domain.
5. In MongoDB Atlas, allow the Vercel backend's outbound access using an
   available static-egress or secure-networking option; do not broaden the
   database allowlist unnecessarily.

The backend requires `JWT_SECRET` from the Vercel environment and never
creates a production `.env` file. Authentication remains in an HttpOnly,
Secure production cookie. Because the frontend proxies API calls on its own
origin, the cookie can use `SameSite=Lax`; mutating API requests continue to
require an explicitly allowed `Origin`.

For the mini-project submission, prepare the required report (maximum 10
pages) with setup instructions, an ERD, and user-interface screenshots, and
record a demonstration video (maximum 5 minutes, camera on). Submit the
GitHub repository link using the instructor's form and follow the required
index-number file-naming convention. Check the course's academic-integrity
and AI-use expectations and be prepared to explain the implementation.
