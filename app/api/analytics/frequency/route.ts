import { requireUser } from "@/lib/auth";
import { jsonSuccess } from "@/lib/api";
import { getWorkoutFrequency } from "@/services/analytics.service";
import { apiHandler } from "../../_helpers";

export const GET = apiHandler(async (request) => {
  const user = await requireUser();
  const weeksParam = new URL(request.url).searchParams.get("weeks");
  const weeks = weeksParam ? Number(weeksParam) : 12;
  const data = await getWorkoutFrequency(user.id, weeks);
  return jsonSuccess({ data });
});
