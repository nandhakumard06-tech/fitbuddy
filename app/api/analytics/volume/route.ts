import { requireUser } from "@/lib/auth";
import { jsonSuccess } from "@/lib/api";
import { getVolumeOverTime } from "@/services/analytics.service";
import { apiHandler } from "../../_helpers";

export const GET = apiHandler(async (request) => {
  const user = await requireUser();
  const daysParam = new URL(request.url).searchParams.get("days");
  const days = daysParam ? Number(daysParam) : 90;
  const data = await getVolumeOverTime(user.id, days);
  return jsonSuccess({ data });
});
