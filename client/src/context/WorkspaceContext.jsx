import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { authRequest } from "../api/auth";
import * as academicsApi from "../api/academics";
import * as studyApi from "../api/study";
import * as tasksApi from "../api/tasks";
import { createEmptyWorkspace } from "../data/sampleData";

const WorkspaceContext = createContext(null);

function withAcademicRecords(workspace, records) {
  return {
    ...workspace,
    semesters: records.semesters,
    modules: records.modules,
    grades: Object.fromEntries(records.modules.map((module) => [module.id, module.grade || ""])),
    moduleSemester: Object.fromEntries(records.modules.map((module) => [module.id, module.semesterId])),
    pastModules: []
  };
}

function withStudyRecords(workspace, records) {
  return {
    ...workspace,
    sessions: records.sessions,
    goal: records.goal
  };
}

export function WorkspaceProvider({ children }) {
  const [workspace, setWorkspace] = useState(() => createEmptyWorkspace());
  const [authUser, setAuthUser] = useState(null);
  const [authStatus, setAuthStatus] = useState("loading");
  const [authError, setAuthError] = useState("");
  const [academicsStatus, setAcademicsStatus] = useState("idle");
  const [academicsError, setAcademicsError] = useState("");
  const [tasksStatus, setTasksStatus] = useState("idle");
  const [tasksError, setTasksError] = useState("");
  const [studyStatus, setStudyStatus] = useState("idle");
  const [studyError, setStudyError] = useState("");
  const [toast, setToast] = useState(null);
  const sessionVersion = useRef(0);

  const loadAcademics = useCallback(async () => {
    const version = sessionVersion.current;
    setAcademicsStatus("loading");
    setAcademicsError("");
    try {
      const records = await academicsApi.getAcademics();
      if (version !== sessionVersion.current) return false;
      setWorkspace((current) => withAcademicRecords(current, records));
      setAcademicsStatus("ready");
      return true;
    } catch (error) {
      if (version !== sessionVersion.current) return false;
      setAcademicsError(error.message);
      setAcademicsStatus("error");
      return false;
    }
  }, []);

  const loadTasks = useCallback(async () => {
    const version = sessionVersion.current;
    setTasksStatus("loading");
    setTasksError("");
    try {
      const { tasks } = await tasksApi.getTasks();
      if (version !== sessionVersion.current) return false;
      setWorkspace((current) => ({ ...current, tasks }));
      setTasksStatus("ready");
      return true;
    } catch (error) {
      if (version !== sessionVersion.current) return false;
      setTasksError(error.message);
      setTasksStatus("error");
      return false;
    }
  }, []);

  const loadStudy = useCallback(async () => {
    const version = sessionVersion.current;
    setStudyStatus("loading");
    setStudyError("");
    try {
      const records = await studyApi.getStudy();
      if (version !== sessionVersion.current) return false;
      setWorkspace((current) => withStudyRecords(current, records));
      setStudyStatus("ready");
      return true;
    } catch (error) {
      if (version !== sessionVersion.current) return false;
      setStudyError(error.message);
      setStudyStatus("error");
      return false;
    }
  }, []);

  const restoreSession = useCallback(async () => {
    const version = ++sessionVersion.current;
    setAuthStatus("loading");
    setAuthError("");
    try {
      const { user } = await authRequest("/me");
      if (version !== sessionVersion.current) return;
      setAuthUser(user);
      setWorkspace(createEmptyWorkspace(user));
      setAuthStatus("authenticated");
      await Promise.all([loadAcademics(), loadTasks(), loadStudy()]);
    } catch (error) {
      if (version !== sessionVersion.current) return;
      if (error.status === 401) {
        setAuthUser(null);
        setWorkspace(createEmptyWorkspace());
        setAuthStatus("unauthenticated");
        return;
      }
      setAuthError(error.message);
      setAuthStatus("error");
    }
  }, [loadAcademics, loadStudy, loadTasks]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const authenticate = useCallback(async (action, values) => {
    const version = ++sessionVersion.current;
    const { user } = await authRequest(`/${action}`, {
      method: "POST",
      body: JSON.stringify(values)
    });
    if (version !== sessionVersion.current) return user;
    setAuthUser(user);
    setWorkspace(createEmptyWorkspace(user));
    setAuthError("");
    setAuthStatus("authenticated");
    setToast(null);
    await Promise.all([loadAcademics(), loadTasks(), loadStudy()]);
    return user;
  }, [loadAcademics, loadStudy, loadTasks]);

  const logout = useCallback(async () => {
    ++sessionVersion.current;
    setAuthUser(null);
    setWorkspace(createEmptyWorkspace());
    setAuthStatus("unauthenticated");
    setAuthError("");
    setAcademicsStatus("idle");
    setAcademicsError("");
    setTasksStatus("idle");
    setTasksError("");
    setStudyStatus("idle");
    setStudyError("");
    setToast(null);
    try {
      await authRequest("/logout", { method: "POST" });
    } catch (error) {
      throw error;
    }
  }, []);

  const updateWorkspace = useCallback((updater) => {
    setWorkspace((current) => updater(current));
  }, []);

  const saveSemester = useCallback(async (semester) => {
    const version = sessionVersion.current;
    const result = semester.id
      ? await academicsApi.updateSemester(semester.id, semester)
      : await academicsApi.createSemester(semester);
    const saved = result.semester;
    if (version !== sessionVersion.current) return saved;
    setWorkspace((current) => ({
      ...current,
      semesters: semester.id
        ? current.semesters.map((item) => item.id === saved.id ? saved : item)
        : [...current.semesters, saved]
    }));
    return saved;
  }, []);

  const removeSemester = useCallback(async (id) => {
    const version = sessionVersion.current;
    await academicsApi.deleteSemester(id);
    if (version !== sessionVersion.current) return;
    setWorkspace((current) => ({
      ...current,
      semesters: current.semesters.filter((semester) => semester.id !== id)
    }));
  }, []);

  const saveModule = useCallback(async (module) => {
    const version = sessionVersion.current;
    const result = module.id
      ? await academicsApi.updateModule(module.id, module)
      : await academicsApi.createModule(module);
    const saved = result.module;
    if (version !== sessionVersion.current) return saved;
    setWorkspace((current) => ({
      ...current,
      modules: module.id
        ? current.modules.map((item) => item.id === saved.id ? saved : item)
        : [...current.modules, saved],
      grades: { ...current.grades, [saved.id]: saved.grade || "" },
      moduleSemester: { ...current.moduleSemester, [saved.id]: saved.semesterId }
    }));
    return saved;
  }, []);

  const removeModule = useCallback(async (id) => {
    const version = sessionVersion.current;
    await academicsApi.deleteModule(id);
    if (version !== sessionVersion.current) return;
    setWorkspace((current) => {
      const grades = { ...current.grades };
      const moduleSemester = { ...current.moduleSemester };
      delete grades[id];
      delete moduleSemester[id];
      return {
        ...current,
        modules: current.modules.filter((module) => module.id !== id),
        grades,
        moduleSemester
      };
    });
  }, []);

  const saveModuleGrade = useCallback(async (module, grade) => {
    const version = sessionVersion.current;
    const result = await academicsApi.updateModule(module.id, { ...module, grade });
    const saved = result.module;
    if (version !== sessionVersion.current) return saved;
    setWorkspace((current) => ({
      ...current,
      modules: current.modules.map((item) => item.id === saved.id ? saved : item),
      grades: { ...current.grades, [saved.id]: saved.grade || "" }
    }));
    return saved;
  }, []);

  const saveTask = useCallback(async (task) => {
    const version = sessionVersion.current;
    const result = task.id
      ? await tasksApi.updateTask(task.id, task)
      : await tasksApi.createTask(task);
    const saved = result.task;
    if (version !== sessionVersion.current) return saved;
    setWorkspace((current) => ({
      ...current,
      tasks: task.id
        ? current.tasks.map((item) => item.id === saved.id ? saved : item)
        : [...current.tasks, saved]
    }));
    return saved;
  }, []);

  const updateTaskCompletion = useCallback(async (task, done, completedAt) => {
    const version = sessionVersion.current;
    const { task: saved } = await tasksApi.setTaskCompletion(task.id, done, completedAt);
    if (version !== sessionVersion.current) return saved;
    setWorkspace((current) => ({
      ...current,
      tasks: current.tasks.map((item) => item.id === saved.id ? saved : item)
    }));
    return saved;
  }, []);

  const removeTask = useCallback(async (id) => {
    const version = sessionVersion.current;
    await tasksApi.deleteTask(id);
    if (version !== sessionVersion.current) return;
    setWorkspace((current) => ({
      ...current,
      tasks: current.tasks.filter((task) => task.id !== id)
    }));
  }, []);

  const saveStudySession = useCallback(async (session) => {
    const version = sessionVersion.current;
    const result = session.id
      ? await studyApi.updateStudySession(session.id, session)
      : await studyApi.createStudySession(session);
    const saved = result.session;
    if (version !== sessionVersion.current) return saved;
    setWorkspace((current) => ({
      ...current,
      sessions: session.id
        ? current.sessions.map((item) => item.id === saved.id ? saved : item)
        : current.sessions.some((item) => item.id === saved.id)
          ? current.sessions
          : [...current.sessions, saved]
    }));
    return saved;
  }, []);

  const removeStudySession = useCallback(async (id) => {
    const version = sessionVersion.current;
    await studyApi.deleteStudySession(id);
    if (version !== sessionVersion.current) return;
    setWorkspace((current) => ({
      ...current,
      sessions: current.sessions.filter((session) => session.id !== id)
    }));
  }, []);

  const saveStudyGoal = useCallback(async (goal) => {
    const version = sessionVersion.current;
    const result = await studyApi.updateStudyGoal(goal);
    if (version !== sessionVersion.current) return result.goal;
    setWorkspace((current) => ({ ...current, goal: result.goal }));
    return result.goal;
  }, []);

  const updateProfile = useCallback(async (profile) => {
    const version = sessionVersion.current;
    const { user } = await authRequest("/profile", {
      method: "PUT",
      body: JSON.stringify({
        fullName: profile.name,
        university: profile.university,
        degree: profile.degree,
        email: profile.email,
        academicYear: profile.year
      })
    });
    if (version !== sessionVersion.current) return user;
    setAuthUser(user);
    setWorkspace((current) => ({
      ...current,
      profile: {
        name: user.fullName,
        university: user.university,
        degree: user.degree,
        year: user.academicYear ?? "",
        email: user.email
      }
    }));
    return user;
  }, []);

  const notify = useCallback((message, undo) => {
    setToast({ message, undo });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const value = useMemo(
    () => ({
      workspace,
      updateWorkspace,
      notify,
      toast,
      clearToast: () => setToast(null),
      authUser,
      authStatus,
      authError,
      authenticate,
      logout,
      updateProfile,
      restoreSession,
      academicsStatus,
      academicsError,
      loadAcademics,
      tasksStatus,
      tasksError,
      loadTasks,
      studyStatus,
      studyError,
      loadStudy,
      saveStudySession,
      removeStudySession,
      saveStudyGoal,
      saveTask,
      updateTaskCompletion,
      removeTask,
      saveSemester,
      removeSemester,
      saveModule,
      removeModule,
      saveModuleGrade
    }),
    [workspace, updateWorkspace, notify, toast, authUser, authStatus, authError, authenticate, logout, updateProfile, restoreSession, academicsStatus, academicsError, loadAcademics, tasksStatus, tasksError, loadTasks, studyStatus, studyError, loadStudy, saveStudySession, removeStudySession, saveStudyGoal, saveTask, updateTaskCompletion, removeTask, saveSemester, removeSemester, saveModule, removeModule, saveModuleGrade]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return context;
}
