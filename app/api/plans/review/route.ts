import { requireUser } from "@/lib/auth";
import { getRequestBody, jsonSuccess } from "@/lib/api";
import { reviewAdaptedPlan, getPendingAdaptedPlan } from "@/services/ai.service";
import { apiHandler } from "../../_helpers";

export const POST = apiHandler(async (request) => {
  const user = await requireUser();
  const body = (await getRequestBody(request)) as {
    planId?: string;
    accept?: boolean;
  };

  const planId = typeof body.planId === "string" ? body.planId : "";
  const accept = body.accept === true;

  const result = await reviewAdaptedPlan(user, planId, accept);
  return jsonSuccess(result);
});

export const GET = apiHandler(async () => {
  const user = await requireUser();
  const pending = await getPendingAdaptedPlan(user.id);
  return jsonSuccess({ pending });
});