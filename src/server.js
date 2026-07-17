import { createServer } from "node:http";
import { loadEnvConfig } from "./config/env.js";
import { handleHealth } from "./controllers/health.controller.js";
import { createWechatController } from "./controllers/wechat.controller.js";
import { createWechatSignatureVerifier } from "./services/signature.service.js";
import { logInfo, logWarn } from "./utils/logger.js";

export function startServer() {
  const config = loadEnvConfig();
  const verifySignature = createWechatSignatureVerifier(config.token);
  const handleWechatRequest = createWechatController({
    path: config.path,
    verifySignature,
  });

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    if (url.pathname === "/health") {
      logInfo("service.health", {
        method: req.method,
        path: url.pathname,
        remoteAddress: req.socket?.remoteAddress ?? "unknown",
      });
      handleHealth(req, res);
      return;
    }

    const handled = await handleWechatRequest(req, res, url);
    if (handled) return;

    logWarn("service.not_found", {
      method: req.method,
      path: url.pathname,
      remoteAddress: req.socket?.remoteAddress ?? "unknown",
    });
    res.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8",
    });
    res.end("Not Found");
  });

  server.listen(config.port, config.host, () => {
    logInfo("service.start", {
      host: config.host,
      port: config.port,
      path: config.path,
      mode: "wechat-reply-flow",
    });
  });

  return server;
}
