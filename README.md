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

For the mini-project submission, prepare the required report (maximum 10
pages) with setup instructions, an ERD, and user-interface screenshots, and
record a demonstration video (maximum 5 minutes, camera on). Submit the
GitHub repository link using the instructor's form and follow the required
index-number file-naming convention. Check the course's academic-integrity
and AI-use expectations and be prepared to explain the implementation.
