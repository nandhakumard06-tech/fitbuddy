import { requireUser, enforceRateLimit } from "@/lib/auth";
import { ApiError, jsonSuccess } from "@/lib/api";
import { generatePlan } from "@/services/ai.service";
import { getById, COLLECTIONS, type Profile } from "@/lib/firestore";
import { apiHandler } from "../../_helpers";

export const POST = apiHandler(async (request) => {
  await enforceRateLimit("plan-generate", request, 10, 60_000);
  const user = await requireUser();

  const profile = await getById<Profile>(COLLECTIONS.profiles, user.id);
  if (!profile) {
    throw ApiError.notFound("Complete your profile before generating a plan.");
  }

  const result = await generatePlan(user, profile);
  return jsonSuccess(result, 201);
});