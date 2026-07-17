import { createServer } from "node:http";
import { loadEnvConfig } from "./config/env.js";
import { handleHealth } from "./controllers/health.controller.js";
import { createWechatController } from "./controllers/wechat.controller.js";
import { createUserController } from "./controllers/user.controller.js";
import { createAiChatService } from "./services/ai-chat.service.js";
import { createConversationService } from "./services/conversation.service.js";
import { createPostgresStore } from "./storage/postgres.js";
import { createWechatUserSyncService } from "./services/user-sync.service.js";
import { createWechatSignatureVerifier } from "./services/signature.service.js";
import { logError, logInfo, logWarn } from "./utils/logger.js";

export async function startServer() {
  const config = loadEnvConfig();
  const userStore = createPostgresStore(config.databaseUrl);
  await userStore.ensureInitialized();
  const userSyncService = createWechatUserSyncService(userStore);
  const aiChatService = createAiChatService({
    apiKey: config.aiApiKey,
    baseUrl: config.aiBaseUrl,
    model: config.aiModel,
    temperature: config.aiTemperature,
    systemPrompt: config.aiSystemPrompt,
    userStore,
  });
  const conversationService = createConversationService({
    userStore,
    aiChatService,
  });
  const verifySignature = createWechatSignatureVerifier(config.token);
  const handleWechatRequest = createWechatController({
    path: config.path,
    verifySignature,
    userSyncService,
    conversationService,
  });
  const handleUserRequest = createUserController({ userStore });

  const server = createServer(async (req, res) => {
    try {
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

      const userHandled = await handleUserRequest(url, res);
      if (userHandled) return;

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
    } catch (error) {
      logError("service.request_error", {
        method: req.method,
        path: req.url ?? "/",
        remoteAddress: req.socket?.remoteAddress ?? "unknown",
        error: error instanceof Error ? error.message : String(error),
      });
      if (!res.headersSent) {
        res.writeHead(500, {
          "Content-Type": "text/plain; charset=utf-8",
        });
        res.end("internal server error");
      }
    }
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
