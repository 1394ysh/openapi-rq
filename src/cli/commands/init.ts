import fs from "fs/promises";
import path from "path";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import type { ReactQueryVersion } from "../prompts/selectReactQueryVersion.js";
import { selectReactQueryVersion } from "../prompts/selectReactQueryVersion.js";
import { generateUtilityFiles } from "../../generator/templates.js";

interface InitOptions {
  output?: string;
  force?: boolean;
}

interface ProjectConfig {
  outputPath: string;
  reactQueryVersion: ReactQueryVersion;
}

const CONFIG_FILE_NAME = "orq.config.json";

/**
 * Initialize project
 * - Create config file
 * - Create utility files (StringReplacer, httpClient, etc.)
 */
export async function runInit(options: InitOptions): Promise<void> {
  console.log(chalk.bold("\n========================================"));
  console.log(chalk.bold("  orq - Initialize"));
  console.log(chalk.bold("========================================\n"));

  // Step 1: Set output path
  const { outputPath } = await inquirer.prompt([
    {
      type: "input",
      name: "outputPath",
      message: "API output path:",
      default: options.output || "./src/api",
    },
  ]);

  // Step 2: Select React Query version
  const reactQueryConfig = await selectReactQueryVersion();

  // Step 3: Select keepSpecPrefix option
  const { keepSpecPrefix } = await inquirer.prompt([
    {
      type: "confirm",
      name: "keepSpecPrefix",
      message: "Keep spec prefix in API URLs? (e.g., PETSTORE:/pet/{petId})",
      default: true,
    },
  ]);

  // Show explanation based on selection
  if (keepSpecPrefix) {
    console.log(chalk.gray("  → Use interceptor to route baseURL by prefix"));
  } else {
    console.log(chalk.gray("  → Use single baseURL with axios.create({ baseURL })"));
  }

  const config: ProjectConfig = {
    outputPath: path.resolve(process.cwd(), outputPath),
    reactQueryVersion: reactQueryConfig.version,
  };

  // Step 4: Save config file
  const configPath = path.join(process.cwd(), CONFIG_FILE_NAME);
  const configExists = await fileExists(configPath);

  if (configExists && !options.force) {
    const { overwrite } = await inquirer.prompt([
      {
        type: "confirm",
        name: "overwrite",
        message: `${CONFIG_FILE_NAME} already exists. Overwrite?`,
        default: false,
      },
    ]);
    if (!overwrite) {
      console.log(chalk.yellow("\nInitialization cancelled."));
      return;
    }
  }

  const spinner = ora("Creating configuration...").start();

  try {
    // Create config file (with all config keys)
    await fs.writeFile(
      configPath,
      JSON.stringify(
        {
          $schema: "https://unpkg.com/openapi-rq/schema.json",
          outputPath: outputPath,
          reactQueryVersion: reactQueryConfig.version,
          httpClient: "axios",
          keepSpecPrefix: keepSpecPrefix,
          specs: {
            PETSTORE: {
              url: "https://petstore3.swagger.io/api/v3/openapi.json",
              description: "Swagger Petstore API (example - can be removed)"
            }
          },
          generate: {
            queryHook: true,
            mutationHook: true,
            suspenseHook: false,
            infiniteQueryHook: false
          }
        },
        null,
        2
      )
    );
    spinner.succeed("Configuration file created");

    // Step 5: Create utility files
    spinner.start("Creating utility files...");
    const fullOutputPath = path.join(process.cwd(), outputPath);
    await generateUtilityFiles(fullOutputPath, keepSpecPrefix);
    spinner.succeed("Utility files created");

    console.log(chalk.green("\n✓ Initialization complete!\n"));
    console.log(chalk.gray("Created files:"));
    console.log(chalk.gray(`  - ${CONFIG_FILE_NAME}`));
    console.log(chalk.gray(`  - ${outputPath}/__orq__/StringReplacer.ts`));
    console.log(chalk.gray(`  - ${outputPath}/__orq__/httpClient.ts`));
    console.log(chalk.gray(`  - ${outputPath}/__orq__/index.ts`));
    console.log("");
    console.log(chalk.yellow("📦 Don't forget to install peer dependencies:"));
    const queryPackage = reactQueryConfig.version === "v3" ? "react-query" : "@tanstack/react-query";
    console.log(chalk.white(`   npm install axios ${queryPackage}`));
    console.log("");
    console.log(
      chalk.cyan("Run 'orq generate' to generate API files.")
    );
    console.log("");
  } catch (error) {
    spinner.fail("Initialization failed");
    throw error;
  }
}


/**
 * Check if file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Load config file
 */
export async function loadConfig(): Promise<ProjectConfig | null> {
  const configPath = path.join(process.cwd(), CONFIG_FILE_NAME);

  try {
    const content = await fs.readFile(configPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}
