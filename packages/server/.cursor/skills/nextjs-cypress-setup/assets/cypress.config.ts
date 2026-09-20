import { defineConfig } from "cypress";
import { spawnSync } from "node:child_process";

function runBunScript(scriptPath: string) {
  const result = spawnSync("bun", ["run", scriptPath], {
    cwd: process.cwd(),
    encoding: "utf-8",
    env: process.env,
  });

  if (result.status !== 0) {
    const message = [result.stderr, result.stdout].filter(Boolean).join("\n");
    throw new Error(message || `${scriptPath} failed`);
  }

  return null;
}

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    supportFile: "cypress/support/e2e.ts",
    specPattern: "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 720,
    setupNodeEvents(on) {
      on("task", {
        "db:reset"() {
          return runBunScript("src/db/scripts/reset.ts");
        },
        "db:seed"() {
          return runBunScript("src/db/scripts/seed.ts");
        },
      });
    },
  },
});
