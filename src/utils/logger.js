function now() {
  return new Date().toISOString();
}

function write(level, event, details = {}) {
  const payload = {
    time: now(),
    level,
    event,
    ...details,
  };
  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

export function logInfo(event, details) {
  write("info", event, details);
}

export function logWarn(event, details) {
  write("warn", event, details);
}

export function logError(event, details) {
  write("error", event, details);
}

export function truncate(value, limit = 120) {
  const text = String(value ?? "");
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}
