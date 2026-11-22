// Injects the AI_* change budget from project .env into agent system prompts.
// Same shape as models.js: opencode does not load .env itself.
import { readEnv, watchEnv } from "../lib/env.js";

const AGENTS = [
  "planner",
  "builder",
  "improve",
  "code-review",
  "code-review-final",
];

const DEFAULT_LIMITS = {
  AI_MAX_NEW_FILES: 3,
  AI_MAX_MODIFIED_FILES: 5,
  AI_MAX_CHANGED_LINES: 200,
  AI_MAX_LINES_PER_FILE: 100,
};

function section(env) {
  const limit = (key) => {
    const n = Number(env[key]);
    return Number.isInteger(n) && n > 0 ? n : DEFAULT_LIMITS[key];
  };
  // Defaults are "on", so only an explicit `false` turns them off.
  const flag = (key) => env[key] !== "false";

  return [
    "## Change budget (from .env, injected at runtime)",
    "",
    "Hard limits for every task you plan, implement, or review. These override",
    "any other numbers in this prompt.",
    "",
    `- Max new files per task: ${limit("AI_MAX_NEW_FILES")}`,
    `- Max existing files modified per task: ${limit("AI_MAX_MODIFIED_FILES")}`,
    `- Max changed lines per task (added + deleted): ${limit("AI_MAX_CHANGED_LINES")}`,
    `- Max changed lines in any single file: ${limit("AI_MAX_LINES_PER_FILE")}`,
    `- Human approval required before each task: ${flag("AI_REQUIRE_TASK_APPROVAL") ? "yes" : "no"}`,
    `- Budget is enforced: ${flag("AI_ENFORCE_CHANGE_BUDGET") ? "yes" : "no"}`,
    "",
    "When enforced, a change that would exceed a limit must be split into",
    "smaller tasks, or stopped and reported as `BUDGET_EXCEPTION_REQUIRED`.",
    "Never raise a limit to make a change fit, and never drop tests to stay",
    "under one. Count added plus deleted lines; do not use net line counts.",
  ].join("\n");
}

export default {
  id: "budget",
  async setup(ctx) {
    const dir = ctx.location.directory;

    // Transforms replay on every reload, so .env is re-read per replay.
    await ctx.agent.transform((editor) => {
      const text = section(readEnv(dir, "AI"));
      for (const agent of AGENTS) {
        editor.update(agent, (draft) => {
          draft.system = draft.system ? `${draft.system}\n\n${text}` : text;
        });
      }
    });

    return watchEnv(ctx);
  },
};