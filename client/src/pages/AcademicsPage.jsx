import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../components/Modal";
import { useWorkspace } from "../context/WorkspaceContext";
import { addDays, todayString } from "../data/sampleData";
import { allModules, calculateGpa, formatDate, gradeOptions, gradePoints, gpaText, isNonGpa } from "../utils/academics";

export default function AcademicsPage() {
  const {
    workspace,
    notify,
    academicsStatus,
    academicsError,
    loadAcademics,
    saveSemester: persistSemester,
    removeSemester: persistRemoveSemester,
    saveModule: persistModule,
    removeModule: persistRemoveModule,
    saveModuleGrade
  } = useWorkspace();
  const navigate = useNavigate();
  const [tab, setTab] = useState("Modules");
  const [semesterFilter, setSemesterFilter] = useState("all");
  const [dialog, setDialog] = useState(null);
  const [draft, setDraft] = useState(null);
  const [simulatedGrades, setSimulatedGrades] = useState({});
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");
  const modules = allModules(workspace);
  const filteredModules = semesterFilter === "all" ? modules : modules.filter((module) => module.semesterId === semesterFilter);
  const simulatorModules = useMemo(() => modules.filter((module) => !isNonGpa(module)), [modules]);

  function openModule(module) {
    setPageError("");
    setDraft(module
      ? { ...module, isGpa: !isNonGpa(module) }
      : { id: "", name: "", code: "", credits: 3, semesterId: workspace.semesters[0]?.id || "", isGpa: true });
    setDialog({ type: "module", id: module?.id });
  }

  async function saveModule(event) {
    event.preventDefault();
    const name = draft.name.trim();
    const code = draft.code.trim();
    const credits = Number(draft.credits);
    if (!name || !code) {
      setPageError("Enter a module name and code.");
      return;
    }
    if (draft.isGpa && credits <= 0) {
      setPageError("GPA modules need positive credits. Choose Non-GPA for a non-credit module.");
      return;
    }
    if (!draft.semesterId) {
      setPageError("Add a semester before creating a module.");
      return;
    }
    setSaving(true);
    setPageError("");
    try {
      await persistModule({
        ...draft,
        name,
        code,
        credits,
        isGpa: draft.isGpa,
        grade: draft.isGpa ? draft.grade || "" : ["High", "Medium", "Low"].includes(draft.grade) ? draft.grade : ""
      });
      setDialog(null);
      notify(draft.id ? "Module updated." : "Module added.");
    } catch (error) {
      setPageError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveSemester(event) {
    event.preventDefault();
    if (!draft.name.trim() || draft.end <= draft.start) {
      setPageError(draft.end <= draft.start ? "End date must be after the start date." : "Enter a semester name.");
      return;
    }
    setSaving(true);
    setPageError("");
    try {
      await persistSemester({ ...draft, name: draft.name.trim() });
      setDialog(null);
      notify(draft.id ? "Semester updated." : "Semester added.");
    } catch (error) {
      setPageError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteModule(id) {
    const used = workspace.tasks.some((task) => task.moduleId === id)
      || workspace.sessions.some((session) => session.moduleId === id)
      || workspace.timer?.moduleId === id;
    if (used) {
      setPageError("Reassign or remove this module’s tasks and sessions, and stop its timer before deleting.");
      return;
    }
    setSaving(true);
    setPageError("");
    try {
      await persistRemoveModule(id);
      setDialog(null);
      notify("Module and its saved grade deleted.");
    } catch (error) {
      setPageError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteSemester(id) {
    if (modules.some((module) => module.semesterId === id)) {
      setPageError("Move or delete this semester’s modules first.");
      return;
    }
    setSaving(true);
    setPageError("");
    try {
      await persistRemoveSemester(id);
      setDialog(null);
      notify("Semester deleted.");
    } catch (error) {
      setPageError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function updateGrade(moduleId, grade) {
    const module = modules.find((item) => item.id === moduleId);
    if (!module) return;
    setSaving(true);
    setPageError("");
    try {
      await saveModuleGrade(module, grade);
      notify("Grade saved. GPA updated.");
    } catch (error) {
      setPageError(error.message);
    } finally {
      setSaving(false);
    }
  }

  function openSimulator() {
    setSimulatedGrades(Object.fromEntries(modules.map((module) => [module.id, module.grade || ""])));
    setDialog({ type: "simulator" });
  }

  const projectedGpa = calculateGpa(simulatorModules.map((module) => ({ ...module, grade: simulatedGrades[module.id] ?? module.grade })));

  return (
    <>
      <div className="pagehead">
        <div><div className="eyebrow">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</div><h1>Your semester, <span className="accent-text">organized.</span></h1><p>Every module, every grade, and the bigger picture.</p></div>
        <div className="headbuttons">{tab !== "Grades" && <button className="primary" type="button" disabled={academicsStatus !== "ready" || saving} onClick={() => {
          setPageError("");
          if (tab === "Semesters") {
            setDraft({ id: "", name: "", start: todayString(), end: addDays(todayString(), 120) });
            setDialog({ type: "semester" });
          } else {
            openModule(null);
          }
        }}>＋ Add {tab === "Semesters" ? "semester" : "module"}</button>}</div>
      </div>
      <div className="tabs" role="tablist" aria-label="Academics sections">{["Modules", "Semesters", "Grades"].map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? "selected" : ""} onClick={() => setTab(item)}>{item}</button>)}</div>
      {academicsStatus === "loading" && <section className="panel" role="status">Loading your saved academic records…</section>}
      {academicsStatus === "error" && <section className="panel empty" role="alert"><p>{academicsError || "Your academic records could not be loaded."}</p><button className="secondary" type="button" onClick={loadAcademics}>Try again</button></section>}
      {academicsStatus === "ready" && pageError && <p className="notice" role="alert">{pageError}</p>}
      {academicsStatus === "ready" && (tab === "Semesters" ? <section className="panel"><div className="semestergrid">
        {workspace.semesters.map((semester) => {
          const semesterGpa = calculateGpa(modules.filter((module) => module.semesterId === semester.id));
          const status = semester.end < todayString() ? "finished" : semester.start > todayString() ? "upcoming" : "active";
          return <article className="semcard" key={semester.id}><span className={`badge ${status}`}>{status === "finished" ? "Finished" : status === "upcoming" ? "Upcoming" : "Active"}</span><h3>{semester.name}</h3><p>{formatDate(semester.start)} – {formatDate(semester.end)}<br />{modules.filter((module) => module.semesterId === semester.id).length} modules · SGPA {gpaText(semesterGpa)}</p><button className="textlink" type="button" data-editsemester onClick={() => { setDraft({ ...semester }); setDialog({ type: "semester", id: semester.id }); }}>Edit semester ›</button><button className="textlink danger-action" type="button" onClick={() => setDialog({ type: "delete-semester", id: semester.id })}>Delete</button></article>;
        })}
        {!workspace.semesters.length && <div className="empty">Add a semester to organize your modules.</div>}
      </div></section> : <section className="panel">
        <div className="panelhead"><h2>{tab === "Grades" ? "Module grades" : "Your modules"}</h2><select className="timerselect" style={{ width: "auto", maxWidth: 220 }} aria-label="Filter semester" value={semesterFilter} onChange={(event) => setSemesterFilter(event.target.value)}><option value="all">All semesters</option>{workspace.semesters.map((semester) => <option value={semester.id} key={semester.id}>{semester.name}</option>)}</select></div>
        {tab === "Grades" ? <>
          <div className="gpacard"><strong>{gpaText(calculateGpa(filteredModules))}</strong><div><h2>{semesterFilter === "all" ? "Cumulative GPA" : "Semester GPA"}</h2><p>Credit-weighted average on a 4.00 scale.<br />Non-GPA and ungraded modules are excluded.</p></div><button id="simulate" className="textlink whatif-action" type="button" onClick={openSimulator}>What if? ↗</button></div>
          <div className="tablewrap"><table><thead><tr><th>MODULE</th><th>CREDITS</th><th>GRADE</th><th>POINTS</th></tr></thead><tbody>{filteredModules.map((module) => {
            const nonGpa = isNonGpa(module);
            return <tr key={module.id}><td><strong>{module.name}</strong><small>{module.code} · {workspace.semesters.find((semester) => semester.id === module.semesterId)?.name || ""}</small></td><td>{module.credits}{nonGpa && <small>Non-GPA</small>}</td><td><select value={module.grade || ""} aria-label={`Grade for ${module.name}`} disabled={saving} onChange={(event) => updateGrade(module.id, event.target.value)}><option value="">No grade</option>{(nonGpa ? ["High", "Medium", "Low"] : gradeOptions).map((grade) => <option key={grade} value={grade}>{grade}</option>)}</select></td><td>{!nonGpa && module.grade in gradePoints ? gradePoints[module.grade].toFixed(1) : "—"}</td></tr>;
          })}</tbody></table></div>
          <p className="notice">Calculation: Σ(credits × grade points) ÷ Σ(eligible credits). Non-GPA modules are excluded from both grade points and GPA credits.</p>
        </> : <div className="modulecards">{filteredModules.map((module) => {
          const tasks = workspace.tasks.filter((task) => task.moduleId === module.id);
          const minutes = workspace.sessions.filter((session) => session.moduleId === module.id).reduce((total, session) => total + Math.floor(session.seconds / 60), 0);
          return <article className="modulebox" key={module.id}><div className="module-meta"><span className="module-code-badge">{module.code}</span><span className="module-credits-badge">{module.credits} credits</span>{isNonGpa(module) && <span className="module-credits-badge">Non-GPA</span>}</div><h3>{module.name}</h3><p>{workspace.semesters.find((semester) => semester.id === module.semesterId)?.name || "Semester"}<br />{tasks.filter((task) => !task.done).length} open tasks · {minutes} min studied</p><footer><button className="textlink" type="button" data-editmodule onClick={() => openModule(module)}>Edit module</button><button className="textlink" type="button" onClick={() => navigate(`/tasks?module=${encodeURIComponent(module.id)}`)}>View tasks ›</button></footer></article>;
        })}{!filteredModules.length && <div className="empty">No modules in this semester.</div>}</div>}
      </section>)}
      {dialog?.type === "module" && <Modal title={draft.id ? "Edit module" : "Add a module"} onClose={() => setDialog(null)}>
        <form onSubmit={saveModule}>
          {pageError && <p className="notice" role="alert">{pageError}</p>}
          {!workspace.semesters.length && <p className="notice">Add a semester before creating a module.</p>}
          <div className="field"><label htmlFor="module-name">Module name</label><input id="module-name" required maxLength="80" value={draft.name} disabled={saving} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></div>
          <div className="row"><div className="field"><label htmlFor="module-code">Module code</label><input id="module-code" required value={draft.code} disabled={saving} onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))} /></div><div className="field"><label htmlFor="module-credits">Credits</label><input id="module-credits" type="number" min="0" max="30" required value={draft.credits} disabled={saving} onChange={(event) => setDraft((current) => ({ ...current, credits: event.target.value }))} /></div></div>
          <div className="field"><label htmlFor="module-grading">Module grading</label><select id="module-grading" value={draft.isGpa ? "gpa" : "nongpa"} disabled={saving} onChange={(event) => setDraft((current) => ({ ...current, isGpa: event.target.value === "gpa" }))}><option value="gpa">GPA</option><option value="nongpa">Non-GPA</option></select></div>
          <div className="field"><label htmlFor="module-semester">Semester</label><select id="module-semester" value={draft.semesterId} required disabled={saving || !workspace.semesters.length} onChange={(event) => setDraft((current) => ({ ...current, semesterId: event.target.value }))}>{workspace.semesters.map((semester) => <option value={semester.id} key={semester.id}>{semester.name}</option>)}</select></div>
          {draft.id && <button type="button" className="danger-action" disabled={saving} onClick={() => { setPageError(""); setDialog({ type: "delete-module", id: draft.id }); }}>Delete module</button>}
          <div className="dialogactions"><button type="button" className="secondary" disabled={saving} onClick={() => setDialog(null)}>Cancel</button><button className="primary" type="submit" disabled={saving || !workspace.semesters.length}>{saving ? "Saving…" : "Save changes"}</button></div>
        </form>
      </Modal>}
      {dialog?.type === "semester" && <Modal title={draft.id ? "Edit semester" : "Add a semester"} onClose={() => setDialog(null)}>
        <form onSubmit={saveSemester}>{pageError && <p className="notice" role="alert">{pageError}</p>}<div className="field"><label htmlFor="semester-name">Semester name</label><input id="semester-name" maxLength="70" required value={draft.name} disabled={saving} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></div><div className="row"><div className="field"><label htmlFor="semester-start">Start date</label><input id="semester-start" type="date" required value={draft.start} disabled={saving} onChange={(event) => setDraft((current) => ({ ...current, start: event.target.value }))} /></div><div className="field"><label htmlFor="semester-end">End date</label><input id="semester-end" type="date" required value={draft.end} disabled={saving} onChange={(event) => setDraft((current) => ({ ...current, end: event.target.value }))} /></div></div><div className="dialogactions"><button type="button" className="secondary" disabled={saving} onClick={() => setDialog(null)}>Cancel</button><button className="primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button></div></form>
      </Modal>}
      {dialog?.type === "simulator" && <Modal title="Explore your possible GPA." onClose={() => setDialog(null)}>
        <p className="notice">Try expected grades. These changes do not alter your saved grades.</p>
        <div className="simrows">{simulatorModules.map((module) => <div className="simrow" key={module.id}><span>{module.code} · {module.name}</span><select aria-label={`Expected grade for ${module.name}`} value={simulatedGrades[module.id] || ""} onChange={(event) => setSimulatedGrades((current) => ({ ...current, [module.id]: event.target.value }))}><option value="">No grade</option>{gradeOptions.map((grade) => <option key={grade} value={grade}>{grade}</option>)}</select></div>)}</div>
        <div className="calcresult">{gpaText(projectedGpa)}</div><p className="smallnote">Projected CGPA · Credit-weighted across eligible modules.</p><div className="dialogactions"><button className="primary" type="button" onClick={() => setDialog(null)}>Done</button></div>
      </Modal>}
      {(dialog?.type === "delete-module" || dialog?.type === "delete-semester") && <Modal title={`Delete ${dialog.type === "delete-module" ? "module" : "semester"}?`} onClose={() => setDialog(null)}>
        <p className="notice">{dialog.type === "delete-module" ? "This module and its saved grade will be removed." : "The semester can only be deleted if it has no modules."}</p>{pageError && <p className="notice" role="alert">{pageError}</p>}<div className="dialogactions"><button className="secondary" type="button" disabled={saving} onClick={() => setDialog(null)}>Cancel</button><button className="primary" type="button" disabled={saving} onClick={() => dialog.type === "delete-module" ? deleteModule(dialog.id) : deleteSemester(dialog.id)}>{saving ? "Deleting…" : "Delete"}</button></div>
      </Modal>}
    </>
  );
}
