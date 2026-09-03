#!/usr/bin/env node
import { Command } from "commander";
import { runInit } from "./init.js";
import { runPush } from "./push.js";
import { runWatchLoop, formatWatchPath } from "./watch.js";
import { runWhoami } from "./whoami.js";
import { NEITHER_CLI_VERSION } from "./version.js";

const program = new Command();
program.name("neither").description("Neither decision-memory CLI").version(NEITHER_CLI_VERSION);

program
  .command("init")
  .description("Scaffold .neither/config.json (set NEITHER_API_KEY in your shell)")
  .action(async () => {
    try {
      const result = await runInit();
      process.stdout.write(
        `[neither init] wrote ${result.configPath}\n` +
          `[neither init] export NEITHER_API_KEY=sk_ctx_… (workspace key with can_ingest)\n`,
      );
      process.exit(0);
    } catch (e) {
      console.error(e instanceof Error ? e.message : String(e));
      process.exit(1);
    }
  });

program
  .command("whoami")
  .description("Print workspace identity for the configured API key")
  .option("--json", "Emit JSON")
  .action(async (opts: { json?: boolean }) => {
    try {
      const result = await runWhoami({ json: Boolean(opts.json) });
      if (!result.ok) {
        console.error(`[neither whoami] offline — ${result.message}`);
        process.exit(2);
      }
      process.exit(0);
    } catch (e) {
      console.error(e instanceof Error ? e.message : String(e));
      process.exit(1);
    }
  });

program
  .command("push")
  .description("Push local markdown/text docs to Neither via /api/ingest/batch")
  .argument("[path]", "Directory or file to push", "./docs")
  .option("--batch-size <n>", "Items per batch request", "20")
  .action(async (targetPath: string, opts: { batchSize: string }) => {
    const batchSize = Math.max(1, parseInt(opts.batchSize, 10) || 20);
    try {
      const summary = await runPush(targetPath, { batchSize });
      for (const batch of summary.batches) {
        process.stdout.write(
          `[neither push] batch ${batch.batchIndex}: ${batch.itemCount} files → HTTP ${batch.status}\n`,
        );
      }
      process.stdout.write(
        `[neither push] ${summary.ok ? "ok" : "failed"} — ${summary.filesPushed}/${summary.filesDiscovered} files\n`,
      );
      process.exit(summary.ok ? 0 : 1);
    } catch (e) {
      console.error(e instanceof Error ? e.message : String(e));
      process.exit(1);
    }
  });

program
  .command("watch")
  .description("Poll a docs folder and push when markdown files change")
  .argument("[path]", "Directory to watch", "./docs")
  .option("--poll <ms>", "Poll interval in milliseconds", "2000")
  .action(async (targetPath: string, opts: { poll: string }) => {
    const pollMs = Math.max(250, parseInt(opts.poll, 10) || 2000);
    const abs = formatWatchPath(targetPath);
    process.stdout.write(`[neither watch] watching ${abs} every ${pollMs}ms (Ctrl+C to stop)\n`);
    try {
      const result = await runWatchLoop({
        rootDir: targetPath,
        pollMs,
        onTick: ({ changed, pushed }) => {
          if (changed.length > 0) {
            process.stdout.write(
              `[neither watch] ${changed.length} changed → push ${pushed ? "ok" : "failed"}\n`,
            );
          }
        },
      });
      process.stdout.write(
        `[neither watch] stopped (${result.interrupted ? "SIGINT" : "done"}, ${result.ticks} ticks)\n`,
      );
      process.exit(result.interrupted ? 130 : 0);
    } catch (e) {
      console.error(e instanceof Error ? e.message : String(e));
      process.exit(1);
    }
  });

program.parseAsync(process.argv).catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
