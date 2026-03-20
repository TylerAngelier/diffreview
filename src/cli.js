#!/usr/bin/env node

import { Command } from "commander";
import { createServer } from "./server.js";
import { parseDiff } from "./diff-parser.js";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { resolve, basename } from "path";
import opener from "open";

const program = new Command();

program
  .name("diffreview")
  .description("Review git diffs with inline comments in your browser")
  .version("0.1.0")
  .argument("[ref]", "Git ref to diff against (default: staged changes)", null)
  .option("--cached", "Review staged changes (default)", false)
  .option("--branch <name>", "Review changes against a branch")
  .action(async (ref, opts) => {
    const cwd = process.cwd();

    if (!existsSync(resolve(cwd, ".git"))) {
      console.error("Error: Not a git repository");
      process.exit(1);
    }

    let diffOutput;
    try {
      if (opts.branch) {
        diffOutput = execSync(`git diff ${opts.branch}`, {
          cwd,
          encoding: "utf-8",
          maxBuffer: 50 * 1024 * 1024,
        });
      } else if (ref) {
        diffOutput = execSync(`git diff ${ref}`, {
          cwd,
          encoding: "utf-8",
          maxBuffer: 50 * 1024 * 1024,
        });
      } else {
        diffOutput = execSync("git diff --cached", {
          cwd,
          encoding: "utf-8",
          maxBuffer: 50 * 1024 * 1024,
        });
        if (!diffOutput.trim()) {
          diffOutput = execSync("git diff", {
            cwd,
            encoding: "utf-8",
            maxBuffer: 50 * 1024 * 1024,
          });
        }
      }
    } catch (e) {
      console.error("Error running git diff:", e.message);
      process.exit(1);
    }

    if (!diffOutput.trim()) {
      console.error("No changes to review.");
      process.exit(0);
    }

    const projectName = basename(cwd);
    const files = parseDiff(diffOutput);

    if (files.length === 0) {
      console.error("No parseable changes found.");
      process.exit(0);
    }

    const { url, close } = await createServer(files, projectName);

    console.log(`\n  diffreview`);
    console.log(`  ${files.length} file(s) changed`);
    console.log(`  Review at: ${url}`);
    console.log(`  Press Ctrl+C to exit\n`);

    opener(url);

    process.on("SIGINT", () => {
      console.log("\nShutting down...");
      close();
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      close();
      process.exit(0);
    });
  });

program.parse();
