import { useNavigate } from "react-router-dom";
import TaskRow from "../components/TaskRow";
import { useWorkspace } from "../context/WorkspaceContext";
import { addDays, todayString } from "../data/sampleData";
import { allModules, calculateGpa, formatDate, formatLongDate, gpaText, weekDates } from "../utils/academics";
import { useState } from "react";

export default function OverviewPage() {
  const { workspace, notify, academicsStatus, academicsError, tasksStatus, tasksError, studyStatus, studyError, updateTaskCompletion } = useWorkspace();
  const navigate = useNavigate();
  const [weekOffset, setWeekOffset] = useState(0);
  const academicsLoading = academicsStatus === "loading";
  const modules = allModules(workspace);
  const currentSemester = workspace.semesters.find((semester) => semester.start <= todayString() && semester.end >= todayString());
  const semesterModules = currentSemester ? modules.filter((module) => module.semesterId === currentSemester.id) : [];
  const dates = weekDates(weekOffset);
  const studiedSeconds = workspace.sessions.filter((session) => dates.includes(session.date)).reduce((total, session) => total + session.seconds, 0);
  const hours = Math.floor(studiedSeconds / 3600);
  const minutes = Math.floor((studiedSeconds % 3600) / 60);
  const openTasks = workspace.tasks.filter((task) => !task.done).sort((a, b) => a.date.localeCompare(b.date));
  const overdue = openTasks.filter((task) => task.date < todayString()).length;
  const dueToday = openTasks.filter((task) => task.date === todayString()).length;
  const cumulativeGpa = calculateGpa(modules);
  const semesterGpa = calculateGpa(semesterModules);

  async function toggleTask(task) {
    try {
      await updateTaskCompletion(task, !task.done, task.done ? null : todayString());
      notify(task.done ? "Task reopened." : "Task completed.", async () => {
        try {
          await updateTaskCompletion(task, task.done, task.completedAt);
          notify("Task status restored.");
        } catch (error) {
          notify(`Task status could not be restored: ${error.message}`);
        }
      });
    } catch (error) {
      notify(`Task status could not be updated: ${error.message}`);
    }
  }

  function openTask(task) {
    navigate(`/tasks?task=${encodeURIComponent(task.id)}`);
  }

  return (
    <>
      <header className="overview-welcome overview-welcome-spacious">
        <p>Your semester, at a glance</p>
        <h1>Welcome, <span className="accent-text">{workspace.profile.name}</span></h1>
        <p>{formatLongDate(todayString())}</p>
      </header>
      <div className="overview-summary-pair">
        <section className="panel overview-gpa-summary">
          <h2>GPA</h2><p className="summary-label">Cumulative GPA</p>
          <div className="summary-big-number">{academicsLoading ? "…" : gpaText(cumulativeGpa)}<small>/ 4.00</small>{!academicsLoading && cumulativeGpa == null && academicsStatus === "ready" && <p className="overview-empty-note">No graded GPA modules yet.</p>}</div>
          <div className="summary-semester">
            <div><span>Current semester</span><strong>{academicsLoading ? "Loading…" : currentSemester?.name || "No active semester"}</strong></div>
            <div><span>Semester GPA</span><strong>{academicsLoading ? "…" : currentSemester ? gpaText(semesterGpa) : "—"}</strong></div>
          </div>
          {academicsStatus === "error" && <p className="overview-empty-note" role="alert">{academicsError || "Academic records could not be loaded."}</p>}
          <p className="overview-feature-note">Manage semesters and modules, record grades, and track your GPA.</p>
          <button className="primary" type="button" onClick={() => navigate("/academics")}>Open Academics ↗</button>
        </section>
        <section className="panel overview-week-summary">
          <h2>Study summary</h2><p className="summary-label">Study time {weekOffset === 0 ? "this week" : "for the selected week"}</p>
          <div className="summary-big-number">{studyStatus === "loading" ? "…" : studyStatus === "error" ? "—" : <>{hours}<small>h</small> {minutes}<small>m</small></>}</div>
          {studyStatus === "error"
            ? <p className="week-explanation" role="alert">{studyError || "Saved study sessions could not be loaded."}</p>
            : <p className="week-explanation">{studyStatus === "loading" ? "Loading your saved study sessions…" : `You have studied for ${hours} ${hours === 1 ? "hour" : "hours"} and ${minutes} ${minutes === 1 ? "minute" : "minutes"} ${weekOffset === 0 ? "this week" : "during the selected week"}.`}</p>}
          <p className="overview-feature-note">Use the study timer, log sessions, and follow your daily goal.</p>
          <div className="summary-week-controls">
            <div className="week-range-controls">
              <button type="button" className="secondary" aria-label="Previous study week" onClick={() => setWeekOffset((offset) => offset - 1)}>‹</button>
              <span className="week-range-pill">{formatDate(dates[0])} – {formatDate(dates[6])}</span>
              <button type="button" className="secondary" aria-label="Next study week" disabled={weekOffset >= 0} onClick={() => setWeekOffset((offset) => Math.min(0, offset + 1))}>›</button>
            </div>
            <button type="button" className="secondary" disabled={weekOffset === 0} onClick={() => setWeekOffset(0)}>This week</button>
          </div>
          <button className="primary" type="button" onClick={() => navigate("/study")}>Open Study ↗</button>
        </section>
      </div>
      <section className="panel dashboard-tasks overview-next-deadlines">
        <div className="panelhead deadlines-head">
          <div><h2>Assignments &amp; deadlines</h2><p className="overview-feature-note">Add tasks, set priorities, and manage due dates.</p><p className="deadline-summary">{tasksStatus === "loading" ? "Loading task summary…" : tasksStatus === "error" ? "Task summary unavailable" : `${overdue} overdue · ${dueToday} due today`}</p></div>
          <button className="textlink" type="button" onClick={() => navigate("/tasks")}>View all tasks ↗</button>
        </div>
        {tasksStatus === "loading"
          ? <div className="empty" role="status">Loading your saved tasks…</div>
          : tasksStatus === "error"
            ? <div className="empty" role="alert">{tasksError || "Your tasks could not be loaded."}</div>
            : openTasks.length
          ? openTasks.slice(0, 4).map((task) => <TaskRow key={task.id} task={task} module={workspace.modules.find((item) => item.id === task.moduleId)} onToggle={toggleTask} onOpen={openTask} />)
          : <div className="empty">No open tasks. Add a task when you have a new deadline.</div>}
      </section>
    </>
  );
}
