import { requireUser, enforceRateLimit } from "@/lib/auth";
import { getRequestBody, jsonSuccess } from "@/lib/api";
import { saveProfile } from "@/services/fitness.service";
import { apiHandler } from "../../_helpers";

export const POST = apiHandler(async (request) => {
  await enforceRateLimit("fitness-assessment", request, 20);
  const user = await requireUser();
  const body = await getRequestBody(request);
  const profile = await saveProfile(user.id, body as never);
  return jsonSuccess({
    profile: {
      ...profile,
      completedAt: profile.completedAt?.toISOString() ?? null,
    },
  });
});
