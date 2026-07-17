export function loadEnvConfig() {
  const token = process.env.WECHAT_TOKEN;
  if (!token) {
    throw new Error("Missing env WECHAT_TOKEN");
  }

  return {
    token,
    host: process.env.HOST ?? "0.0.0.0",
    port: Number.parseInt(process.env.PORT ?? "3000", 10),
    path: process.env.WECHAT_PATH ?? "/wechat",
  };
}
