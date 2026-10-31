import { apiRequest } from "./auth";

export function getAcademics() {
  return apiRequest("/api/academics", { method: "GET" });
}

export function createSemester(semester) {
  return apiRequest("/api/academics/semesters", { method: "POST", body: JSON.stringify(semester) });
}

export function updateSemester(id, semester) {
  return apiRequest(`/api/academics/semesters/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(semester) });
}

export function deleteSemester(id) {
  return apiRequest(`/api/academics/semesters/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function createModule(module) {
  return apiRequest("/api/academics/modules", { method: "POST", body: JSON.stringify(module) });
}

export function updateModule(id, module) {
  return apiRequest(`/api/academics/modules/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(module) });
}

export function deleteModule(id) {
  return apiRequest(`/api/academics/modules/${encodeURIComponent(id)}`, { method: "DELETE" });
}
