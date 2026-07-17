function jsonResponse(res, statusCode, body) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(body, null, 2));
}

export function createUserController({ userStore }) {
  return async function handleUserRequest(url, res) {
    if (!url.pathname.startsWith("/api/users")) {
      return false;
    }

    const parts = url.pathname.split("/").filter(Boolean);

    if (parts.length === 2) {
      const limit = Number.parseInt(url.searchParams.get("limit") ?? "20", 10);
      const rows = await userStore.listUsers(Number.isNaN(limit) ? 20 : limit);
      jsonResponse(res, 200, { items: rows });
      return true;
    }

    if (parts.length === 3) {
      const openid = decodeURIComponent(parts[2]);
      const row = await userStore.getUser(openid);
      if (!row) {
        jsonResponse(res, 404, { error: "user not found" });
        return true;
      }

      jsonResponse(res, 200, { item: row });
      return true;
    }

    jsonResponse(res, 404, { error: "not found" });
    return true;
  };
}
