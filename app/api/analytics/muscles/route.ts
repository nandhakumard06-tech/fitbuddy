import { requireUser } from "@/lib/auth";
import { jsonSuccess } from "@/lib/api";
import { getMuscleGroupDistribution } from "@/services/analytics.service";
import { apiHandler } from "../../_helpers";

export const GET = apiHandler(async () => {
  const user = await requireUser();
  const data = await getMuscleGroupDistribution(user.id);
  return jsonSuccess({ data });
});
