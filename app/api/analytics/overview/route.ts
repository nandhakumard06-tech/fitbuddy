import { requireUser } from "@/lib/auth";
import { jsonSuccess } from "@/lib/api";
import { getOverview, getWeeklyConsistency } from "@/services/analytics.service";
import { apiHandler } from "../../_helpers";

export const GET = apiHandler(async () => {
  const user = await requireUser();
  const [overview, consistency] = await Promise.all([
    getOverview(user.id),
    getWeeklyConsistency(user.id),
  ]);
  return jsonSuccess({ overview, consistency });
});
