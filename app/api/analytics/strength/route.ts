import { requireUser } from "@/lib/auth";
import { jsonSuccess } from "@/lib/api";
import { getPersonalRecords, getStrengthProgress } from "@/services/analytics.service";
import { apiHandler } from "../../_helpers";

export const GET = apiHandler(async () => {
  const user = await requireUser();
  const [records, strength] = await Promise.all([
    getPersonalRecords(user.id),
    getStrengthProgress(user.id),
  ]);
  return jsonSuccess({ records, strength });
});
