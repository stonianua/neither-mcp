import { stat } from "node:fs/promises";
import path from "node:path";
import { collectPushFiles, runPush, type NeitherCliConfig } from "./push.js";

export type WatchState = {
  mtimes: Map<string, number>;
  running: boolean;
  interrupted: boolean;
};

export async function snapshotMtimes(
  rootDir: string,
  cwd = process.cwd(),
): Promise<Map<string, number>> {
  const files = await collectPushFiles(rootDir, cwd);
  const mtimes = new Map<string, number>();
  for (const abs of files) {
    const s = await stat(abs);
    mtimes.set(abs, s.mtimeMs);
  }
  return mtimes;
}

export function diffChangedFiles(
  previous: Map<string, number>,
  current: Map<string, number>,
): string[] {
  const changed: string[] = [];
  for (const [file, mtime] of current) {
    const prev = previous.get(file);
    if (prev === undefined || prev !== mtime) {
      changed.push(file);
    }
  }
  return changed.sort();
}

export type WatchRunOptions = {
  rootDir: string;
  pollMs: number;
  cwd?: string;
  config?: NeitherCliConfig;
  batchSize?: number;
  maxTicks?: number;
  onTick?: (info: { changed: string[]; pushed: boolean }) => void;
};

export async function runWatchLoop(opts: WatchRunOptions): Promise<{
  ok: boolean;
  ticks: number;
  interrupted: boolean;
}> {
  const pollMs = Math.max(250, opts.pollMs);
  const cwd = opts.cwd ?? process.cwd();
  let mtimes = await snapshotMtimes(opts.rootDir, cwd);
  let ticks = 0;
  let interrupted = false;

  const handleSigint = () => {
    interrupted = true;
  };
  process.once("SIGINT", handleSigint);

  try {
    while (!interrupted && (opts.maxTicks == null || ticks < opts.maxTicks)) {
      await new Promise((resolve) => setTimeout(resolve, pollMs));
      if (interrupted) break;
      ticks += 1;
      const next = await snapshotMtimes(opts.rootDir, cwd);
      const changed = diffChangedFiles(mtimes, next);
      mtimes = next;
      let pushed = false;
      if (changed.length > 0) {
        const summary = await runPush(opts.rootDir, {
          cwd,
          config: opts.config,
          batchSize: opts.batchSize,
        });
        pushed = summary.ok;
      }
      opts.onTick?.({ changed, pushed });
    }
  } finally {
    process.removeListener("SIGINT", handleSigint);
  }

  return { ok: !interrupted, ticks, interrupted };
}

export function formatWatchPath(rootDir: string, cwd = process.cwd()): string {
  return path.resolve(cwd, rootDir);
}
