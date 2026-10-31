import { apiRequest } from "./auth";

export function getStudy() {
  return apiRequest("/api/study", { method: "GET" });
}

export function createStudySession(session) {
  return apiRequest("/api/study/sessions", { method: "POST", body: JSON.stringify(session) });
}

export function updateStudySession(id, session) {
  return apiRequest(`/api/study/sessions/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(session) });
}

export function deleteStudySession(id) {
  return apiRequest(`/api/study/sessions/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function updateStudyGoal(goal) {
  return apiRequest("/api/study/goal", { method: "PUT", body: JSON.stringify({ goal }) });
}
