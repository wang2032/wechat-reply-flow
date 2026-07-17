export function handleHealth(req, res) {
  res.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(
    JSON.stringify(
      {
        ok: true,
        service: "wechat-reply-flow",
        time: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
}
