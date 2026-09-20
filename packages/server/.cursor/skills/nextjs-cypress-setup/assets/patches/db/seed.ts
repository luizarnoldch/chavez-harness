import "dotenv/config";

/**
 * Seed is intentionally empty for e2e: tests create their own users/data.
 * Kept callable so reset → seed always runs as a pair.
 */
export async function seedDatabase() {
  // no-op
}

async function main() {
  await seedDatabase();
  console.log("Database seed complete");
  process.exit(0);
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
