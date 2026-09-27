import { requireUser } from "@/lib/auth";
import { jsonSuccess } from "@/lib/api";
import { listPlans } from "@/services/workout.service";
import { apiHandler } from "../_helpers";

export const GET = apiHandler(async () => {
  const user = await requireUser();
  const plans = await listPlans(user.id);
  return jsonSuccess({
    plans: plans.map((plan) => ({
      ...plan,
      createdAt: plan.createdAt.toISOString(),
    })),
  });
});
