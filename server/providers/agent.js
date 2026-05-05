// Claude Code CLI provider — uses your existing `claude` login, no API key needed.
// Requires: claude CLI installed and authenticated (`claude auth login`).
import { spawn } from "child_process";
import { writeFileSync, unlinkSync, openSync, closeSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

function runClaude(prompt, { systemPrompt, allowWebSearch = false, timeoutMs = 90000 } = {}) {
  return new Promise((resolve, reject) => {
    // Write prompt to a temp file — most reliable way to pass large text to claude CLI
    const tmpFile = join(tmpdir(), "sierra-" + Date.now() + "-" + Math.random().toString(36).slice(2) + ".txt");

    try {
      writeFileSync(tmpFile, prompt, "utf8");
    } catch (e) {
      return reject(new Error("Failed to write prompt temp file: " + e.message));
    }

    const args = [
      "--print",
      "--output-format", "text",
      "--dangerously-skip-permissions",
    ];

    if (systemPrompt) args.push("--system-prompt", systemPrompt);
    if (allowWebSearch) args.push("--allowedTools", "WebSearch");

    let stdinFd;
    try {
      stdinFd = openSync(tmpFile, "r");
    } catch (e) {
      try { unlinkSync(tmpFile); } catch {}
      return reject(new Error("Failed to open prompt temp file: " + e.message));
    }

    const proc = spawn("claude", args, {
      env: process.env,
      stdio: [stdinFd, "pipe", "pipe"],
    });

    // Parent closes its copy of the fd; child process has its own
    try { closeSync(stdinFd); } catch {}

    const cleanup = () => { try { unlinkSync(tmpFile); } catch {} };

    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      cleanup();
      reject(new Error("claude subprocess timed out after " + Math.round(timeoutMs / 1000) + "s"));
    }, timeoutMs);

    let output = "";
    let error = "";
    proc.stdout.on("data", d => { output += d; });
    proc.stderr.on("data", d => { error += d; });
    proc.on("close", code => {
      clearTimeout(timer);
      cleanup();
      if (code === 0) resolve(output.trim());
      else reject(new Error("claude exit " + code + ": " + error.slice(0, 400)));
    });
    proc.on("error", e => {
      clearTimeout(timer);
      cleanup();
      reject(e);
    });
  });
}

export async function search(searchQuery) {
  return runClaude(searchQuery, { allowWebSearch: true, timeoutMs: 600000 });
}

export async function classify(systemPrompt, content) {
  return runClaude(content, { systemPrompt, allowWebSearch: false, timeoutMs: 600000 });
}
