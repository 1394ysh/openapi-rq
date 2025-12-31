#!/usr/bin/env node
/**
 * orq (OpenAPI React Query)
 * CLI for generating React Query API code from OpenAPI specs
 */
import { Command } from "commander";
import chalk from "chalk";
import { createRequire } from "module";
import { runInteractiveMode } from "./cli/commands/generate.js";
import { runInit } from "./cli/commands/init.js";
import { listSpecs } from "./cli/commands/list.js";
import { runAdd } from "./cli/commands/add.js";
import { runRemove } from "./cli/commands/remove.js";
import { runSync } from "./cli/commands/sync.js";
import { runCreate } from "./cli/commands/create.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");

const program = new Command();

program
  .name("orq")
  .description("OpenAPI to React Query code generator")
  .version(version);

// Initialize command
program
  .command("init")
  .description("Initialize project configuration and utility files")
  .option("-o, --output <path>", "Output directory path")
  .option("-f, --force", "Overwrite existing configuration")
  .action(async (options) => {
    try {
      await runInit(options);
    } catch (error) {
      if (error instanceof Error) {
        console.error(chalk.red(`Error: ${error.message}`));
      }
      process.exit(1);
    }
  });

// Generate command
program
  .command("generate")
  .aliases(["g", "gen"])
  .description("Generate API code interactively")
  .option("-s, --spec <name>", "Specify OpenAPI spec name directly")
  .option("-o, --output <path>", "Output directory path")
  .option("-a, --all", "Generate all APIs from the spec")
  .option("--overwrite", "Overwrite existing files without asking")
  .action(async (options) => {
    try {
      await runInteractiveMode(options);
    } catch (error) {
      if (error instanceof Error) {
        console.error(chalk.red(`Error: ${error.message}`));
      }
      process.exit(1);
    }
  });

// List specs command
program
  .command("list")
  .alias("ls")
  .description("List available OpenAPI specs")
  .action(async () => {
    try {
      await listSpecs();
    } catch (error) {
      if (error instanceof Error) {
        console.error(chalk.red(`Error: ${error.message}`));
      }
      process.exit(1);
    }
  });

// Add spec command
program
  .command("add")
  .description("Add a new OpenAPI spec to the project")
  .option("-n, --name <name>", "Spec name")
  .option("-u, --url <url>", "OpenAPI spec URL")
  .action(async (options) => {
    try {
      await runAdd(options);
    } catch (error) {
      if (error instanceof Error) {
        console.error(chalk.red(`Error: ${error.message}`));
      }
      process.exit(1);
    }
  });

// Remove spec command
program
  .command("remove")
  .alias("rm")
  .description("Remove an OpenAPI spec from the project")
  .option("-n, --name <name>", "Spec name to remove")
  .option("-f, --force", "Remove without confirmation")
  .action(async (options) => {
    try {
      await runRemove(options);
    } catch (error) {
      if (error instanceof Error) {
        console.error(chalk.red(`Error: ${error.message}`));
      }
      process.exit(1);
    }
  });

// Sync (regenerate) specs command
program
  .command("sync")
  .description("Sync (regenerate) all registered specs")
  .option("-s, --spec <name>", "Sync specific spec only")
  .option("-f, --force", "Sync without confirmation")
  .action(async (options) => {
    try {
      await runSync(options);
    } catch (error) {
      if (error instanceof Error) {
        console.error(chalk.red(`Error: ${error.message}`));
      }
      process.exit(1);
    }
  });

// Create placeholder API command
program
  .command("create")
  .alias("new")
  .description("Create a placeholder API file (for parallel development)")
  .option("-m, --method <method>", "HTTP method (GET, POST, PUT, PATCH, DELETE)")
  .option("-p, --path <path>", "API path (e.g., /users/{userId})")
  .option("-s, --spec <name>", "Spec name to add endpoint to")
  .action(async (options) => {
    try {
      await runCreate(options);
    } catch (error) {
      if (error instanceof Error) {
        console.error(chalk.red(`Error: ${error.message}`));
      }
      process.exit(1);
    }
  });

// Handle unknown commands
program.on("command:*", (operands) => {
  console.error(chalk.red(`\nError: Unknown command '${operands[0]}'`));
  console.log(`\nAvailable commands:`);
  console.log(`  init     Initialize project configuration`);
  console.log(`  generate (g, gen)  Generate API code`);
  console.log(`  list (ls)          List available specs`);
  console.log(`  add                Add a new spec`);
  console.log(`  remove (rm)        Remove a spec`);
  console.log(`  sync               Sync all specs`);
  console.log(`  create (new)       Create placeholder API`);
  console.log(`\nRun ${chalk.cyan("orq --help")} for more information.`);
  process.exit(1);
});

// Show help if no command provided
if (process.argv.length === 2) {
  program.help();
}

program.parse();
