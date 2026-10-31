import { apiRequest } from "./auth";

export function getTasks() {
  return apiRequest("/api/tasks", { method: "GET" });
}

export function createTask(task) {
  return apiRequest("/api/tasks", { method: "POST", body: JSON.stringify(task) });
}

export function updateTask(id, task) {
  return apiRequest(`/api/tasks/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(task) });
}

export function setTaskCompletion(id, done, completedAt) {
  return apiRequest(`/api/tasks/${encodeURIComponent(id)}/completion`, {
    method: "PATCH",
    body: JSON.stringify({ done, completedAt })
  });
}

export function deleteTask(id) {
  return apiRequest(`/api/tasks/${encodeURIComponent(id)}`, { method: "DELETE" });
}
