import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useWorkspace } from "../context/WorkspaceContext";
import { todayString } from "../data/sampleData";

const navigation = [
  ["Overview", "/overview", "overview"],
  ["Study", "/study", "study"],
  ["Academics", "/academics", "academics"],
  ["Tasks", "/tasks", "tasks"],
  ["Profile", "/profile", "profile"]
];

const icons = {
  overview: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  study: <><circle cx="12" cy="13" r="8" /><path d="M12 8v5l3 2M9 2h6" /></>,
  academics: <><path d="m2 9 10-5 10 5-10 5L2 9Zm4 3v6c4 3 8 3 12 0v-6M22 9v8" /></>,
  tasks: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="m8 9 2 2 4-4m-6 9h8" /></>,
  profile: <><circle cx="12" cy="8" r="4" /><path d="M4 22v-3a8 8 0 0 1 16 0v3" /></>
};

export default function WorkspaceLayout() {
  const { workspace, toast, clearToast, logout } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();
  const title = navigation.find(([, path]) => path === location.pathname)?.[0] || "Overview";
  const today = todayString();
  const currentSemester = workspace.semesters.find((semester) => semester.start <= today && semester.end >= today);
  const taskBadgeCount = workspace.tasks.filter((task) => !task.done && task.date <= today).length;

  async function handleLogout() {
    const timer = workspace.timer;
    const elapsed = timer
      ? timer.accumulated + (timer.running ? Math.max(0, (Date.now() - timer.startedAt) / 1000) : 0)
      : 0;
    if (location.pathname === "/study" && elapsed > 0
      && !window.confirm("You have unsaved study time. Log out and clear the timer?")) return;
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      navigate("/login", {
        replace: true,
        state: { message: `Your local workspace was cleared, but the server could not confirm logout: ${error.message}` }
      });
    }
  }

  return (
    <div className="workspace-shell">
      <aside>
        <a className="brand" href="/" onClick={(event) => { event.preventDefault(); navigate("/"); }}>
          <img src="/assets/unitrack-logo-white.png" alt="" />unitrack
        </a>
        <div className="navlabel">YOUR WORKSPACE</div>
        <nav className="workspace-nav" aria-label="Workspace">
          {navigation.map(([label, path, icon]) => (
            <button key={path} type="button" className={location.pathname === path ? "active" : ""} onClick={() => navigate(path)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">{icons[icon]}</svg>{label}
              {label === "Tasks" && taskBadgeCount > 0 && <span className="navbadge">{taskBadgeCount}</span>}
              {label === "Study" && workspace.timer && <span className="navbadge">●</span>}
            </button>
          ))}
        </nav>
        <div className="sidebottom">
          <div className="semesterlabel">CURRENT SEMESTER</div>
          <strong>{currentSemester?.name || "Semester not set"}</strong>
          <p>{workspace.profile.university}</p>
          <button className="account" type="button" onClick={() => navigate("/profile")}>
            <span className="avatar">{workspace.profile.name[0] || "S"}</span>
            <span><strong id="sidename">{workspace.profile.name}</strong><small>Student · UniTrack account</small></span>
          </button>
          <button className="workspace-logout" type="button" onClick={handleLogout}><span>Logout</span><span aria-hidden="true">↗</span></button>
        </div>
      </aside>
      <main>
        <div className="topbar">
          <span>Workspace / {title}</span>
          <div><span className="demolabel"><i /> ACCOUNT WORKSPACE</span><a href="/" onClick={(event) => { event.preventDefault(); navigate("/"); }}><span>Back to home</span><span aria-hidden="true">↗</span></a></div>
        </div>
        <div id="page"><Outlet /></div>
        <footer><span>UniTrack · Your semester, clearly.</span><span>Academics, tasks, and study sessions are saved to your account.</span></footer>
      </main>
      <div id="toast" role="status" aria-live="polite" style={{ display: toast ? "block" : "none" }}>
        {toast?.message}
        {toast?.undo && <button type="button" onClick={() => { toast.undo(); clearToast(); }}>Undo</button>}
      </div>
    </div>
  );
}
