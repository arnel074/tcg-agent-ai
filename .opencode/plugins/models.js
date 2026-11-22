// Assigns each agent's model from LLM_* in project .env — opencode does not
// load .env itself, so agent models are applied from the plugin context.
import { readEnv, watchEnv } from "../lib/env.js";

const AGENT_VARS = {
  pipeline: "LLM_PIPELINE",
  builder: "LLM_BUILD",
  planner: "LLM_PLAN",
  "code-review": "LLM_REVIEW",
  investigate: "LLM_INVESTIGATE",
  improve: "LLM_IMPROVE",
  "code-review-final": "LLM_REVIEW_FINAL",
};

export default {
  id: "models",
  async setup(ctx) {
    const dir = ctx.location.directory;

    // editor.get() only lists registry entries, but update() resolves agents
    // defined in .opencode/agents/*.md — so update each id directly. Transforms
    // replay on every reload, so .env is re-read per replay, not captured here.
    await ctx.agent.transform((editor) => {
      const env = readEnv(dir, "LLM");
      for (const [agent, varName] of Object.entries(AGENT_VARS)) {
        const value = env[varName];
        if (!value || !value.includes("/")) continue;
        const [providerID, ...rest] = value.split("/");
        editor.update(agent, (draft) => {
          draft.model = { providerID, id: rest.join("/") };
        });
      }
    });

    return watchEnv(ctx);
  },
};