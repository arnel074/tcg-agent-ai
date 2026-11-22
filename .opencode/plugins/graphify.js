// graphify OpenCode plugin (V2). Auto-discovered from .opencode/plugins/.
// Injects a knowledge graph reminder before the first shell command of the
// session when the graph exists.
//
// IMPORTANT: keep the reminder string free of backticks and $(...) constructs.
// Plain words render fine in opencode's TUI.
import { existsSync } from "fs";
import { join } from "path";

export default {
  id: "graphify",
  async setup(ctx) {
    let reminded = false;

    await ctx.tool.hook("execute.before", (event) => {
      if (reminded) return;
      if (event.tool !== "bash" && event.tool !== "shell") return;
      if (
        !existsSync(join(ctx.location.directory, "graphify-out", "graph.json"))
      )
        return;

      if (typeof event.input?.command !== "string") return;

      // ';' not '&&' — Windows PowerShell 5.1 rejects '&&' as a statement
      // separator, breaking the first command of the session (#1646).
      event.input.command =
        'echo "[graphify] knowledge graph at graphify-out/. For focused questions, run graphify query with your question (scoped subgraph, usually much smaller than GRAPH_REPORT.md) instead of grepping raw files. Read GRAPH_REPORT.md only for broad architecture context." ; ' +
        event.input.command;
      reminded = true;
    });
  },
};