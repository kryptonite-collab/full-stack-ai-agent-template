import { registerOTel } from "@vercel/otel";

export function register() {
  registerOTel({
    serviceName: "ai_agent_2-frontend",
  });
}
