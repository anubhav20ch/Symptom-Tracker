// Shared pagination helpers (API-3, PERF-5): every list endpoint uses the
// same defaults and the same response envelope, so clients only learn one
// shape: { items, total, limit, offset }.
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

// `defaultLimit`/`maxLimit` overrides exist for lists that drive live
// behaviour (e.g. the reminder scheduler and in-tab alarm poll need to see
// every active reminder, not a silently-truncated first page) — those
// routes raise the default rather than skipping pagination altogether, so
// the response shape stays identical everywhere.
function parsePagination(query = {}, { defaultLimit = DEFAULT_LIMIT, maxLimit = MAX_LIMIT } = {}) {
  let limit = parseInt(query.limit, 10);
  let offset = parseInt(query.offset, 10);
  if (!Number.isFinite(limit) || limit <= 0) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;
  if (!Number.isFinite(offset) || offset < 0) offset = 0;
  return { limit, offset };
}

// Keeps each route's existing named key (e.g. "entries", "medications")
// rather than forcing a generic "items" key, so existing frontend call
// sites that read response.data.<resourceKey> keep working unchanged while
// every list response gains the same total/limit/offset metadata.
function paginatedResponse(resourceKey, rows, total, { limit, offset }) {
  return { [resourceKey]: rows, total, limit, offset };
}

module.exports = { parsePagination, paginatedResponse, DEFAULT_LIMIT, MAX_LIMIT };
