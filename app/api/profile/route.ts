import { requireUser } from "@/lib/auth";
import { jsonSuccess } from "@/lib/api";
import { getProfile } from "@/services/fitness.service";
import { apiHandler } from "../_helpers";

export const GET = apiHandler(async () => {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  return jsonSuccess({
    profile: {
      ...profile,
      completedAt: profile.completedAt?.toISOString() ?? null,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
      user: {
        id: profile.user.id,
        name: profile.user.name,
        email: profile.user.email,
        xp: profile.user.xp,
      },
    },
  });
});
