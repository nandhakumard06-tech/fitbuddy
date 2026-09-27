import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(fileName: string): void {
  const file = resolve(process.cwd(), fileName);
  if (!existsSync(file)) return;

  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

async function main(): Promise<void> {
  loadEnvFile(".env.local");

  const [{ docRef, firestore }, { exerciseLibrary, achievementDefinitions }] =
    await Promise.all([
      import("@/lib/firestore"),
      import("./seed-data"),
    ]);

  const base = new Date(2026, 0, 1);
  const batch = firestore.batch();

  for (const exercise of exerciseLibrary) {
    batch.set(
      docRef("exercises", exercise.code),
      {
        code: exercise.code,
        name: exercise.name,
        description: exercise.description,
        muscleGroup: exercise.muscleGroup,
        secondaryMuscles: exercise.secondaryMuscles ?? [],
        equipment: exercise.equipment ?? [],
        difficulty: exercise.difficulty,
        movementType: exercise.movementType,
        instructions: exercise.instructions ?? [],
        safetyNotes: exercise.safetyNotes ?? null,
        createdAt: base,
        updatedAt: base,
      },
      { merge: true }
    );
  }

  for (const achievement of achievementDefinitions) {
    batch.set(
      docRef("achievements", achievement.key),
      {
        key: achievement.key,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        xpReward: achievement.xpReward,
        createdAt: base,
      },
      { merge: true }
    );
  }

  await batch.commit();

  console.log(
    `Seeded ${exerciseLibrary.length} exercises and ${achievementDefinitions.length} achievements.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});