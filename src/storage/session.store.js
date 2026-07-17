const sessions = new Map();

export function getSession(openid) {
  if (!sessions.has(openid)) {
    sessions.set(openid, {
      step: "idle",
      updatedAt: Date.now(),
    });
  }
  return sessions.get(openid);
}

export function updateSession(openid, patch) {
  const current = getSession(openid);
  const next = {
    ...current,
    ...patch,
    updatedAt: Date.now(),
  };
  sessions.set(openid, next);
  return next;
}
