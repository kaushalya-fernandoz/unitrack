import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Modal from "../components/Modal";
import TaskRow from "../components/TaskRow";
import { useWorkspace } from "../context/WorkspaceContext";
import { addDays, todayString } from "../data/sampleData";
import { formatDate } from "../utils/academics";

const taskViews = ["Today", "Upcoming", "Completed"];
const priorityRank = { High: 0, Medium: 1, Low: 2 };

export default function TasksPage() {
  const {
    workspace,
    notify,
    academicsStatus,
    tasksStatus,
    tasksError,
    loadTasks,
    saveTask: persistTask,
    updateTaskCompletion,
    removeTask: persistRemoveTask
  } = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();
  const [view, setView] = useState("Today");
  const [moduleFilter, setModuleFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sort, setSort] = useState("date");
  const [draft, setDraft] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState("");
  const [pageError, setPageError] = useState("");
  const handledSearch = useRef("");
  const today = todayString();

  useEffect(() => {
    if (tasksStatus !== "ready" || academicsStatus !== "ready") return;
    const params = new URLSearchParams(location.search);
    if (handledSearch.current === location.search) return;
    const taskId = params.get("task");
    const moduleId = params.get("module");
    if (taskId && workspace.tasks.some((task) => task.id === taskId)) {
      const task = workspace.tasks.find((item) => item.id === taskId);
      setView(task.date <= todayString() ? "Today" : "Upcoming");
      openTask(task);
    } else if (params.get("action") === "add") {
      setView("Today");
      openTask(null);
    } else if (moduleId) {
      setView("Upcoming");
      setModuleFilter(moduleId);
    }
    handledSearch.current = location.search;
  }, [location.search, workspace.tasks, tasksStatus, academicsStatus]);

  const matchingTasks = useMemo(() => {
    return workspace.tasks.filter((task) => {
      if (moduleFilter && task.moduleId !== moduleFilter) return false;
      if (typeFilter && task.type !== typeFilter) return false;
      if (view === "Completed") return task.done;
      if (task.done) return false;
      if (view === "Today") return task.date <= today;
      return task.date > today;
    }).sort((left, right) => {
      if (sort === "priority") return priorityRank[left.priority] - priorityRank[right.priority] || left.date.localeCompare(right.date);
      if (sort === "title") return left.title.localeCompare(right.title);
      return left.date.localeCompare(right.date);
    });
  }, [workspace.tasks, moduleFilter, typeFilter, view, sort, today]);

  const groupedTasks = useMemo(() => {
    const groups = new Map();
    matchingTasks.forEach((task) => {
      const groupDate = view === "Completed" ? task.completedAt || task.date : task.date;
      const groupKey = view === "Today" && task.date < today ? "overdue" : groupDate;
      const label = view === "Today" && task.date < today
        ? "Overdue"
        : view === "Today" && task.date === today
          ? "Today"
          : view === "Upcoming" && task.date === addDays(today, 1)
            ? "Tomorrow"
            : formatDate(groupDate, { day: "numeric", month: "long", year: "numeric" });
      if (!groups.has(groupKey)) groups.set(groupKey, { label, tasks: [] });
      groups.get(groupKey).tasks.push(task);
    });
    return [...groups.entries()]
      .sort(([leftDate], [rightDate]) => {
        if (view === "Today") {
          if (leftDate === "overdue") return -1;
          if (rightDate === "overdue") return 1;
        }
        return view === "Completed"
          ? rightDate.localeCompare(leftDate)
          : leftDate.localeCompare(rightDate);
      })
      .map(([, group]) => group);
  }, [matchingTasks, view, today]);

  const todayTasks = workspace.tasks.filter((task) => task.date === today);
  const completedTodayCount = todayTasks.filter((task) => task.done).length;

  function openTask(task) {
    if (!workspace.modules.length) {
      notify("Add a module in Academics before creating a task.");
      navigate("/academics");
      return;
    }
    setDraft(task
      ? { ...task }
      : { id: "", title: "", moduleId: moduleFilter || workspace.modules[0].id, type: "Assignment", date: today, priority: "Medium", done: false, notes: "" });
    setDialog({ type: "task" });
  }

  async function saveTask(event) {
    event.preventDefault();
    const task = {
      ...draft,
      title: draft.title.trim(),
      notes: draft.notes.trim(),
      completedAt: draft.done ? (draft.completedAt || today) : null
    };
    if (!task.title) {
      setPageError("Enter a task title.");
      return;
    }
    setSaving(true);
    setPageError("");
    try {
      await persistTask(task);
      setDialog(null);
      navigate("/tasks", { replace: true });
      notify(draft.id ? "Task updated." : "Task added.");
      if (!draft.id && task.date > today && view === "Today") setView("Upcoming");
    } catch (error) {
      setPageError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleTask(task) {
    setPendingTaskId(task.id);
    setPageError("");
    try {
      await updateTaskCompletion(task, !task.done, task.done ? null : today);
      notify(task.done ? "Task reopened." : "Task completed.", async () => {
        try {
          await updateTaskCompletion(task, task.done, task.completedAt);
          notify("Task status restored.");
        } catch (error) {
          notify(`Task status could not be restored: ${error.message}`);
        }
      });
    } catch (error) {
      setPageError(error.message);
    } finally {
      setPendingTaskId("");
    }
  }

  async function deleteTask(id) {
    setSaving(true);
    setPageError("");
    try {
      await persistRemoveTask(id);
      setDialog(null);
      navigate("/tasks", { replace: true });
      notify("Task deleted.");
    } catch (error) {
      setPageError(error.message);
    } finally {
      setSaving(false);
    }
  }

  function selectView(nextView) {
    setView(nextView);
  }

  return (
    <>
      <div className="pagehead taskmanager-heading">
        <div><div className="eyebrow">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</div><h1>Your next steps</h1><p>{moduleFilter ? `${workspace.modules.find((module) => module.id === moduleFilter)?.code || ""} · Tasks for this module.` : "Assignments, quizzes, projects, and deadlines. All in one place."}</p></div>
        <div className="headbuttons"><button className="primary" type="button" disabled={tasksStatus !== "ready" || academicsStatus !== "ready"} onClick={() => { setPageError(""); openTask(null); }}>＋ Add task</button></div>
      </div>
      <div className="taskmanager-tabs" role="tablist" aria-label="Task views">
        {taskViews.map((item) => <button key={item} type="button" role="tab" aria-selected={view === item} className={view === item ? "selected" : ""} onClick={() => selectView(item)}>{item}</button>)}
      </div>
      <div className="taskmanager-toolbar">
        <div className="filters">
          <select aria-label="Filter by module" value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)}><option value="">All modules</option>{workspace.modules.map((module) => <option value={module.id} key={module.id}>{module.code} · {module.name}</option>)}</select>
          <select aria-label="Filter by type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="">All types</option>{["Assignment", "Project", "Exam", "Quiz", "Study"].map((type) => <option key={type}>{type}</option>)}</select>
          <select aria-label="Sort tasks" value={sort} onChange={(event) => setSort(event.target.value)}><option value="date">Sort: Due date</option><option value="priority">Sort: Priority</option><option value="title">Sort: Title (A–Z)</option></select>
        </div>
      </div>
      {tasksStatus === "loading" && <div className="panel" role="status">Loading your saved tasks…</div>}
      {tasksStatus === "error" && <div className="panel empty" role="alert"><p>{tasksError || "Your tasks could not be loaded."}</p><button className="secondary" type="button" onClick={loadTasks}>Try again</button></div>}
      {tasksStatus === "ready" && pageError && !dialog && <p className="notice" role="alert">{pageError}</p>}
      {tasksStatus === "ready" && pendingTaskId && <p className="smallnote" role="status">Saving task status…</p>}
      {tasksStatus === "ready" && <div className="taskmanager-list" aria-busy={Boolean(pendingTaskId)}>
        {groupedTasks.map(({ label, tasks }) => <section key={label} className="taskmanager-group"><h2 className={`group ${label === "Overdue" ? "overdue" : ""}`}>{label}<small>{tasks.length} {tasks.length === 1 ? "task" : "tasks"}</small></h2>{tasks.map((task) => <TaskRow key={task.id} task={task} module={workspace.modules.find((module) => module.id === task.moduleId)} onToggle={toggleTask} onOpen={() => { setPageError(""); openTask(task); }} showDueDate={false} saving={Boolean(pendingTaskId)} />)}</section>)}
        {!matchingTasks.length && <div className="empty"><strong>A little breathing room.</strong>No tasks match this view.</div>}
      </div>}
      {tasksStatus === "ready" && view === "Today" && <div className="taskmanager-week"><div><strong>A little progress, every day.</strong><p>{todayTasks.length ? `${completedTodayCount} of ${todayTasks.length} tasks completed` : "No tasks due today"}</p></div>{todayTasks.length > 0 && <div className="track" role="progressbar" aria-label="Today’s task progress" aria-valuemin="0" aria-valuemax={todayTasks.length} aria-valuenow={completedTodayCount}><div style={{ width: `${completedTodayCount / todayTasks.length * 100}%` }} /></div>}</div>}
      {dialog?.type === "task" && <Modal title={draft.id ? "Make it your own." : "A little less to remember."} onClose={() => { setDialog(null); navigate("/tasks", { replace: true }); }}>
        <form onSubmit={saveTask}>
          {pageError && <p className="notice" role="alert">{pageError}</p>}
          <div className="field"><label htmlFor="task-title">Task title</label><input id="task-title" required maxLength="120" placeholder="What do you need to work on?" value={draft.title} disabled={saving} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} /></div>
          <div className="field"><label htmlFor="task-module">Module</label><select id="task-module" required value={draft.moduleId} disabled={saving} onChange={(event) => setDraft((current) => ({ ...current, moduleId: event.target.value }))}>{workspace.modules.map((module) => <option value={module.id} key={module.id}>{module.code} · {module.name}</option>)}</select></div>
          <div className="row"><div className="field"><label htmlFor="task-type">Type</label><select id="task-type" value={draft.type} disabled={saving} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value }))}>{["Assignment", "Project", "Exam", "Quiz", "Study"].map((type) => <option key={type}>{type}</option>)}</select></div><div className="field"><label htmlFor="task-date">Due date</label><input id="task-date" type="date" required value={draft.date} disabled={saving} onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))} /></div></div>
          <div className="row"><div className="field"><label htmlFor="task-priority">Priority</label><select id="task-priority" value={draft.priority} disabled={saving} onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value }))}>{["Low", "Medium", "High"].map((priority) => <option key={priority}>{priority}</option>)}</select></div><div className="field"><label htmlFor="task-status">Status</label><select id="task-status" value={draft.done ? "done" : "open"} disabled={saving} onChange={(event) => setDraft((current) => ({ ...current, done: event.target.value === "done" }))}><option value="open">To do</option><option value="done">Completed</option></select></div></div>
          <div className="field"><label htmlFor="task-notes">Notes</label><textarea id="task-notes" placeholder="Keep useful details here." value={draft.notes} disabled={saving} maxLength="2000" onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} /></div>
          <div className="formfoot">{draft.id && <button className="delete" type="button" disabled={saving} onClick={() => { setPageError(""); setDialog({ type: "delete-task", id: draft.id }); }}>Delete task</button>}<button type="button" className="secondary" disabled={saving} onClick={() => { setDialog(null); navigate("/tasks", { replace: true }); }}>Cancel</button><button className="primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save task"}</button></div>
        </form>
      </Modal>}
      {dialog?.type === "delete-task" && <Modal title="Delete this task?" onClose={() => setDialog(null)}>
        <p className="notice">This task will be permanently removed from your account.</p>{pageError && <p className="notice" role="alert">{pageError}</p>}<div className="dialogactions"><button className="secondary" type="button" disabled={saving} onClick={() => setDialog(null)}>Cancel</button><button className="primary" type="button" disabled={saving} onClick={() => deleteTask(dialog.id)}>{saving ? "Deleting…" : "Delete"}</button></div>
      </Modal>}
    </>
  );
}
