import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Navigate, Outlet, RouterProvider, useBlocker, useLocation } from "react-router-dom";
import WorkspaceLayout from "./components/WorkspaceLayout";
import { useWorkspace, WorkspaceProvider } from "./context/WorkspaceContext";
import AcademicsPage from "./pages/AcademicsPage";
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import OverviewPage from "./pages/OverviewPage";
import ProfilePage from "./pages/ProfilePage";
import StudyPage from "./pages/StudyPage";
import TasksPage from "./pages/TasksPage";
import "./styles/overview.css";
import "./styles/design-system.css";
import "./styles/task-rows.css";
import "./styles/home.css";
import "./styles/auth.css";
import "./styles/app.css";

function ProtectedRoute({ children }) {
  const { authStatus, authError, restoreSession } = useWorkspace();
  const location = useLocation();

  if (authStatus === "loading") {
    return <main className="auth-check" role="status">Checking your session…</main>;
  }
  if (authStatus === "error") {
    return <main className="auth-check" role="alert">
      <p>{authError || "Your session could not be checked."}</p>
      <button className="primary" type="button" onClick={restoreSession}>Try again</button>
    </main>;
  }
  if (authStatus !== "authenticated") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

function StudyNavigationGuard() {
  const { workspace } = useWorkspace();
  const timerRef = React.useRef(workspace.timer);
  timerRef.current = workspace.timer;

  const hasUnsavedTime = React.useCallback(() => {
    const timer = timerRef.current;
    if (!timer) return false;
    const elapsed = timer.accumulated
      + (timer.running ? Math.max(0, (Date.now() - timer.startedAt) / 1000) : 0);
    return elapsed > 0;
  }, []);
  const shouldBlock = React.useCallback(({ currentLocation, nextLocation }) =>
    currentLocation.pathname === "/study"
    && nextLocation.pathname !== "/study"
    && hasUnsavedTime(), [hasUnsavedTime]);
  const blocker = useBlocker(shouldBlock);

  React.useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (window.confirm("You have unsaved study time. Leave Study? The timer will keep running, but it is not saved yet.")) blocker.proceed();
    else blocker.reset();
  }, [blocker]);

  React.useEffect(() => {
    const warnBeforeUnload = (event) => {
      if (!hasUnsavedTime()) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [hasUnsavedTime]);

  return <Outlet />;
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <StudyNavigationGuard />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "login", element: <AuthPage /> },
      { path: "register", element: <AuthPage register /> },
      {
        element: <ProtectedRoute><WorkspaceLayout /></ProtectedRoute>,
        children: [
          { path: "overview", element: <OverviewPage /> },
          { path: "study", element: <StudyPage /> },
          { path: "academics", element: <AcademicsPage /> },
          { path: "tasks", element: <TasksPage /> },
          { path: "profile", element: <ProfilePage /> }
        ]
      },
      { path: "*", element: <Navigate to="/" replace /> }
    ]
  },
]);

function App() {
  return <WorkspaceProvider><RouterProvider router={router} /></WorkspaceProvider>;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
