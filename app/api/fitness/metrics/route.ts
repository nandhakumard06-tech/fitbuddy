import { requireUser } from "@/lib/auth";
import { jsonSuccess } from "@/lib/api";
import { getFitnessMetrics } from "@/services/fitness.service";
import { apiHandler } from "../../_helpers";

export const GET = apiHandler(async () => {
  const user = await requireUser();
  const metrics = await getFitnessMetrics(user.id);
  return jsonSuccess({
    metrics: {
      ...metrics,
      assessment: metrics.assessment
        ? { ...metrics.assessment, createdAt: metrics.assessment.createdAt.toISOString() }
        : null,
      profile: metrics.profile
        ? { ...metrics.profile, completedAt: metrics.profile.completedAt?.toISOString() ?? null }
        : null,
    },
  });
});
