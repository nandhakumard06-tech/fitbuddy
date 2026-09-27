import { requireUser, enforceRateLimit } from "@/lib/auth";
import { jsonSuccess } from "@/lib/api";
import { generateInsights } from "@/services/ai.service";
import { apiHandler } from "../../_helpers";

export const GET = apiHandler(async (request) => {
  await enforceRateLimit("ai-insights", request, 20, 60_000);
  const user = await requireUser();
  const insight = await generateInsights(user);
  return jsonSuccess({ insight });
});
