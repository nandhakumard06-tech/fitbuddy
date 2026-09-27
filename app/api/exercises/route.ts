import { requireUser } from "@/lib/auth";
import { jsonSuccess } from "@/lib/api";
import { queryWhere, COLLECTIONS, type Exercise } from "@/lib/firestore";
import { apiHandler } from "../_helpers";

export const GET = apiHandler(async () => {
  await requireUser();
  const exercises = await queryWhere<Exercise>(
    COLLECTIONS.exercises,
    [],
    { orderBy: { field: "muscleGroup", direction: "asc" } }
  );
  const sorted = [...exercises].sort((a, b) => a.name.localeCompare(b.name));
  return jsonSuccess({ exercises: sorted });
});