import { useEffect, useMemo, useState } from "react";
import Modal from "../components/Modal";
import { useWorkspace } from "../context/WorkspaceContext";
import { todayString } from "../data/sampleData";
import { formatDate, formatDuration, weekDates } from "../utils/academics";

function makeRequestId() {
  return globalThis.crypto?.randomUUID?.()
    || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export default function StudyPage() {
  const {
    workspace,
    updateWorkspace,
    notify,
    studyStatus,
    studyError,
    loadStudy,
    saveStudySession,
    removeStudySession,
    saveStudyGoal
  } = useWorkspace();
  const [now, setNow] = useState(Date.now());
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedTimerModule, setSelectedTimerModule] = useState(workspace.modules[0]?.id || "");
  const [dialog, setDialog] = useState(null);
  const [sessionDraft, setSessionDraft] = useState(null);
  const [goalDraft, setGoalDraft] = useState("");
  const [savingTimer, setSavingTimer] = useState(false);
  const [savingSession, setSavingSession] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [actionError, setActionError] = useState("");
  const timer = workspace.timer;
  const today = todayString();
  const timerSeconds = timer
    ? timer.accumulated + (timer.running ? Math.max(0, (now - timer.startedAt) / 1000) : 0)
    : 0;
  useEffect(() => {
    if (!timer?.running) return undefined;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [timer?.running, timer?.startedAt]);

  const todaySeconds = workspace.sessions
    .filter((session) => session.date === today)
    .reduce((total, session) => total + session.seconds, 0);
  const todayMinutes = Math.floor(todaySeconds / 60);
  const goalPercent = workspace.goal ? Math.min(100, todayMinutes / workspace.goal * 100) : 0;
  const dates = weekDates(weekOffset);
  const weekValues = dates.map((date) =>
    workspace.sessions
      .filter((session) => session.date === date)
      .reduce((total, session) => total + session.seconds, 0) / 60
  );
  const weekTotal = weekValues.reduce((total, minutes) => total + minutes, 0);
  const chartMax = Math.max(workspace.goal || 0, ...weekValues, 1);
  const sessionsToday = useMemo(
    () => workspace.sessions.filter((session) => session.date === today),
    [workspace.sessions, today]
  );

  function openSessionEditor(session) {
    setActionError("");
    setSessionDraft(session
      ? {
          id: session.id,
          moduleId: session.moduleId,
          date: session.date,
          minutes: Math.max(1, Math.round(session.seconds / 60)),
          notes: session.notes || ""
        }
      : {
          id: "",
          requestId: makeRequestId(),
          moduleId: timer?.moduleId || workspace.modules[0]?.id || "",
          date: today,
          minutes: 30,
          notes: ""
        });
    setDialog("session");
  }

  async function saveSession(event) {
    event.preventDefault();
    setSavingSession(true);
    setActionError("");
    try {
      await saveStudySession({
        id: sessionDraft.id || undefined,
        requestId: sessionDraft.id ? undefined : sessionDraft.requestId,
        moduleId: sessionDraft.moduleId,
        date: sessionDraft.date,
        seconds: Number(sessionDraft.minutes) * 60,
        notes: sessionDraft.notes
      });
      setDialog(null);
      notify(sessionDraft.id ? "Study session updated." : "Study session saved.");
    } catch (error) {
      setActionError(error.message);
    } finally {
      setSavingSession(false);
    }
  }

  async function removeSession(id) {
    setSavingSession(true);
    setActionError("");
    try {
      await removeStudySession(id);
      setDialog(null);
      notify("Study session deleted.");
    } catch (error) {
      setActionError(error.message);
    } finally {
      setSavingSession(false);
    }
  }

  function startOrPauseTimer() {
    if (!timer) {
      if (!workspace.modules.length) {
        notify("Add a module in Academics before starting a timer.");
        return;
      }
      updateWorkspace((current) => ({
        ...current,
        timer: {
          moduleId: selectedTimerModule || current.modules[0].id,
          requestId: makeRequestId(),
          startedAt: Date.now(),
          accumulated: 0,
          running: true
        }
      }));
      setNow(Date.now());
      return;
    }
    const timestamp = Date.now();
    updateWorkspace((current) => ({
      ...current,
      timer: current.timer.running
        ? {
            ...current.timer,
            accumulated: current.timer.accumulated + Math.max(0, (timestamp - current.timer.startedAt) / 1000),
            running: false
          }
        : { ...current.timer, startedAt: timestamp, running: true }
    }));
    setNow(timestamp);
  }

  async function finishTimer() {
    if (savingTimer || !timer) return;
    const elapsedSeconds = timer.accumulated
      + (timer.running ? Math.max(0, (Date.now() - timer.startedAt) / 1000) : 0);
    const seconds = Math.floor(elapsedSeconds);
    if (seconds < 1) {
      updateWorkspace((current) => ({ ...current, timer: null }));
      notify("No study time to save.");
      return;
    }
    const requestId = timer.requestId || makeRequestId();
    if (!timer.requestId) {
      updateWorkspace((current) => ({
        ...current,
        timer: current.timer ? { ...current.timer, requestId } : null
      }));
    }
    setSavingTimer(true);
    setActionError("");
    try {
      await saveStudySession({
        requestId,
        moduleId: timer.moduleId,
        date: todayString(),
        seconds,
        notes: ""
      });
      updateWorkspace((current) => ({
        ...current,
        timer: current.timer?.requestId === requestId ? null : current.timer
      }));
      notify("Study session saved.");
    } catch (error) {
      setActionError(error.message);
    } finally {
      setSavingTimer(false);
    }
  }

  function discardTimer() {
    if (savingTimer) return;
    updateWorkspace((current) => ({ ...current, timer: null }));
    setActionError("");
    notify("Study session discarded.");
  }

  function moveWeek(change) {
    setWeekOffset((offset) => Math.min(0, offset + change));
  }

  async function saveGoal(event) {
    event.preventDefault();
    const goal = Number(goalDraft);
    if (!Number.isInteger(goal) || goal < 1 || goal > 1440) {
      setActionError("Daily study goal must be a whole number from 1 to 1440 minutes.");
      return;
    }
    setSavingGoal(true);
    setActionError("");
    try {
      await saveStudyGoal(goal);
      setDialog(null);
      notify("Daily study goal saved.");
    } catch (error) {
      setActionError(error.message);
    } finally {
      setSavingGoal(false);
    }
  }

  function closeDialog() {
    if (savingSession || savingGoal) return;
    setDialog(null);
    setActionError("");
  }

  return (
    <>
      <div className="pagehead">
        <div><div className="eyebrow">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</div><h1>Study</h1><p>Track your study sessions and manage your daily goal.</p></div>
        <div className="headbuttons"><button className="primary" type="button" onClick={() => openSessionEditor(null)} disabled={!workspace.modules.length}>＋ Add session</button></div>
      </div>
      {studyStatus === "error" && <div className="notice" role="alert">{studyError || "Study records could not be loaded."} <button type="button" onClick={loadStudy}>Retry</button></div>}
      {actionError && !dialog && <div className="notice" role="alert">{actionError}</div>}
      <section className="panel timerpanel big-timer study-timer-card">
        <div className="panelhead"><h2>Study timer</h2><span className="timerstatus">{timer?.running ? "● Studying" : timer ? "Paused" : "Ready"}</span></div>
        <select className="timerselect" aria-label="Module to study" value={timer?.moduleId || selectedTimerModule} disabled={Boolean(timer) || !workspace.modules.length} onChange={(event) => setSelectedTimerModule(event.target.value)}>
          {workspace.modules.map((module) => <option key={module.id} value={module.id}>{module.code} · {module.name}</option>)}
        </select>
        <div className="timerdigits" aria-live="off">{formatDuration(timerSeconds)}</div>
        <p className="timerhint">{timer ? "Your timer stays active while you move around this workspace." : "Choose a module and give it your attention."}</p>
        <div className="timerbuttons">
          <button className="primary timer-main-action" type="button" onClick={startOrPauseTimer} disabled={!timer && !workspace.modules.length || savingTimer}>{timer?.running ? "Pause session" : timer ? "Resume session" : "Start studying"}</button>
          {timer && <button className="secondary timer-save-action" type="button" onClick={finishTimer} disabled={savingTimer}>{savingTimer ? "Saving…" : "Finish & save"}</button>}
          {timer && <button className="secondary timer-discard-action" type="button" onClick={discardTimer} disabled={savingTimer}>Discard</button>}
        </div>
      </section>
      <div className="study-summary-grid">
        <section className="panel study-goal-card">
          <div className="panelhead"><h2>Your daily study goal</h2></div>
          {studyStatus === "loading"
            ? <div className="empty" role="status">Loading your saved goal…</div>
            : studyStatus === "error"
              ? <div className="empty" role="alert">Your saved daily goal is unavailable.</div>
              : workspace.goal == null
              ? <><div className="goalrow"><strong>Set a daily goal</strong><button className="goaledit" type="button" onClick={() => { setGoalDraft(""); setActionError(""); setDialog("goal"); }}>Set goal</button></div><p className="goalnote">Choose a daily target to track your progress.</p></>
              : <>
                  <div className="goalrow"><strong>{todayMinutes} <span>/ {workspace.goal} min</span></strong><button className="goaledit" type="button" onClick={() => { setGoalDraft(String(workspace.goal)); setActionError(""); setDialog("goal"); }}>Edit goal</button></div>
                  <div className="track" role="progressbar" aria-label="Daily study goal" aria-valuemin="0" aria-valuemax={workspace.goal} aria-valuenow={Math.min(todayMinutes, workspace.goal)}><div style={{ width: `${goalPercent}%` }} /></div>
                  <p className="goalnote">{goalPercent >= 100 ? "Goal reached. Make room for a well-earned break." : `${Math.max(0, workspace.goal - todayMinutes)} minutes to go. Small sessions add up.`}</p>
                </>}
        </section>
        <section className="panel weekly-study-card">
          <div className="panelhead"><div><h2>{weekOffset === 0 ? "Study this week" : "Study for the selected week"}</h2><p className="weekly-subtitle">Minutes recorded each day.</p></div></div>
          <div className="weekly-chart-top"><div className="weekly-total"><strong>{studyStatus === "loading" ? "…" : studyStatus === "error" ? "—" : `${Math.floor(weekTotal / 60)}h ${Math.floor(weekTotal % 60)}m`}</strong><span>total studied</span></div><div className="weeknav"><button type="button" aria-label="Previous study week" onClick={() => moveWeek(-1)}>‹</button><span>{formatDate(dates[0])} – {formatDate(dates[6])}</span><button type="button" aria-label="Next study week" disabled={weekOffset >= 0} onClick={() => moveWeek(1)}>›</button></div></div>
          {studyStatus === "loading"
            ? <div className="empty" role="status">Loading your saved study sessions…</div>
            : studyStatus === "error"
              ? <div className="empty" role="alert">Your weekly study summary is unavailable.</div>
              : !workspace.sessions.length
              ? <div className="empty">No study sessions recorded yet.</div>
              : <>
                  <div className="chart" role="img" aria-label={`Study minutes by day: ${weekValues.map((value, index) => `${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][index]} ${Math.floor(value)}`).join(", ")}`}>
                    {weekValues.map((value, index) => <div key={dates[index]} className={`chartcol ${dates[index] === today ? "current" : ""}`}><span className="chartvalue">{value ? `${Math.floor(value)}m` : ""}</span><div className="chartbar" style={{ height: `${Math.max(4, value / chartMax * 132)}px` }} /></div>)}
                  </div>
                  <div className="chartlabels">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day}>{day}</span>)}</div>
                </>}
        </section>
        <section className="panel study-sessions-card">
          <div className="panelhead"><h2>Today’s sessions</h2><span>{studyStatus === "loading" ? "Loading…" : studyStatus === "error" ? "Unavailable" : `${sessionsToday.length} sessions`}</span></div>
          <div className="goalrow"><strong>{studyStatus === "loading" ? "…" : studyStatus === "error" ? "—" : `${Math.floor(sessionsToday.reduce((total, session) => total + session.seconds, 0) / 60)} min`}</strong></div>
          {studyStatus === "loading"
            ? <div className="empty" role="status">Loading today’s sessions…</div>
            : studyStatus === "error"
              ? <div className="empty" role="alert">Today’s saved sessions are unavailable.</div>
              : sessionsToday.length
              ? sessionsToday.map((session) => <div className="sessionrow" key={session.id}><div>{workspace.modules.find((module) => module.id === session.moduleId)?.name || "Module"}<small>{formatDate(session.date)} · {formatDuration(session.seconds)}</small></div><div className="actions"><button type="button" data-editsession onClick={() => openSessionEditor(session)}>Edit</button><button type="button" data-deletesession onClick={() => { setActionError(""); setDialog({ type: "delete-session", id: session.id }); }}>Delete</button></div></div>)
              : <div className="empty">No sessions recorded today.<br />Start a timer or add a study session manually.</div>}
        </section>
      </div>
      {dialog === "session" && <Modal title={sessionDraft?.id ? "Edit study session" : "Add a study session"} onClose={closeDialog}>
        <form onSubmit={saveSession}>
          <div className="field"><label htmlFor="session-module">Module</label><select id="session-module" required value={sessionDraft.moduleId} onChange={(event) => setSessionDraft((draft) => ({ ...draft, moduleId: event.target.value }))}>{workspace.modules.map((module) => <option key={module.id} value={module.id}>{module.code} · {module.name}</option>)}</select></div>
          <div className="row"><div className="field"><label htmlFor="session-date">Study date</label><input id="session-date" type="date" required max={today} value={sessionDraft.date} onChange={(event) => setSessionDraft((draft) => ({ ...draft, date: event.target.value }))} /></div><div className="field"><label htmlFor="session-minutes">Duration (minutes)</label><input id="session-minutes" type="number" min="1" max="1440" step="1" required value={sessionDraft.minutes} onChange={(event) => setSessionDraft((draft) => ({ ...draft, minutes: event.target.value }))} /></div></div>
          {actionError && <p className="notice" role="alert">{actionError}</p>}
          <div className="dialogactions"><button className="secondary" type="button" onClick={closeDialog} disabled={savingSession}>Cancel</button><button className="primary" type="submit" disabled={savingSession}>{savingSession ? "Saving…" : "Save session"}</button></div>
        </form>
      </Modal>}
      {dialog === "goal" && <Modal title="Make the goal yours." onClose={closeDialog}>
        <form onSubmit={saveGoal}><div className="field"><label htmlFor="daily-goal">Daily study goal (minutes)</label><input id="daily-goal" type="number" min="1" max="1440" step="1" required value={goalDraft} onChange={(event) => setGoalDraft(event.target.value)} /></div>{actionError && <p className="notice" role="alert">{actionError}</p>}<div className="dialogactions"><button className="secondary" type="button" onClick={closeDialog} disabled={savingGoal}>Cancel</button><button className="primary" type="submit" disabled={savingGoal}>{savingGoal ? "Saving…" : "Save changes"}</button></div></form>
      </Modal>}
      {dialog?.type === "delete-session" && <Modal title="Delete this study session?" onClose={closeDialog}>
        <p className="notice">This recorded session will be removed from your summaries and weekly chart.</p>{actionError && <p className="notice" role="alert">{actionError}</p>}<div className="dialogactions"><button className="secondary" type="button" onClick={closeDialog} disabled={savingSession}>Cancel</button><button className="primary" type="button" onClick={() => removeSession(dialog.id)} disabled={savingSession}>{savingSession ? "Deleting…" : "Delete session"}</button></div>
      </Modal>}
    </>
  );
}
