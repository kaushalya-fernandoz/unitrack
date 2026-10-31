export async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    }
  });
  let payload = {};
  try {
    payload = await response.json();
  } catch {
    if (response.ok) throw new Error("The server returned an invalid response.");
  }
  if (!response.ok) {
    const error = new Error(payload.message || "The request could not be completed.");
    error.status = response.status;
    error.code = payload.error;
    throw error;
  }
  return payload;
}

export function authRequest(path, options = {}) {
  return apiRequest(`/api/auth${path}`, options);
}
