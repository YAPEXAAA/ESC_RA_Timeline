// Wraps fetch + JSON parsing so a route that doesn't reach its serverless
// function (returns the SPA's index.html instead of JSON — a 404 falling
// through to the client-side router) surfaces a clear, actionable error
// instead of a cryptic "Unexpected token '<'... is not valid JSON".
export async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const contentType = res.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    throw new Error(
      `Server didn't return JSON for ${url} (got ${res.status}). The API route may not be deployed.`
    );
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}
