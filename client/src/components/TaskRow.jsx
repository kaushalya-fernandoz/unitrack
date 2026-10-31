import { todayString } from "../data/sampleData";
import { formatDate } from "../utils/academics";

export default function TaskRow({ task, module, onToggle, onOpen, showPriority = true, showDueDate = true, saving = false }) {
  const today = todayString();
  return (
    <div className={`taskrow unified-task ${task.done ? "done" : ""}`}>
      <button className={`check ${task.done ? "done" : ""}`} type="button" onClick={() => onToggle(task)} disabled={saving} aria-label={`${task.done ? "Reopen" : "Complete"} ${task.title}`}>
        {task.done ? "✓" : ""}
      </button>
      <div className="taskbody unified-task-body">
        <button type="button" className={task.done ? "taskdone" : ""} onClick={() => onOpen(task)}>{task.title}</button>
        <small className="unified-task-module">{module?.code || ""} · {module?.name || "Module"}</small>
        <span className="unified-task-type">{task.type}</span>
      </div>
      <div className="unified-task-end">
        {showDueDate && <span className={`due ${task.date < today && !task.done ? "overdue" : ""}`}>{task.date === today ? "Today" : formatDate(task.date)}</span>}
        {showPriority && <span className={`unified-task-priority ${(task.priority || "Medium").toLowerCase()}`}>{task.priority || "Medium"}</span>}
      </div>
    </div>
  );
}
