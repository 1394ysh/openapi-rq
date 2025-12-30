import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import SwaggerParser from "@apidevtools/swagger-parser";
import { loadConfigSimple, saveConfig } from "../../config/loader.js";

interface AddOptions {
  name?: string;
  url?: string;
}

/**
 * Add OpenAPI spec
 */
export async function runAdd(options: AddOptions): Promise<void> {
  console.log(chalk.bold("\n========================================"));
  console.log(chalk.bold("  orq - Add OpenAPI Spec"));
  console.log(chalk.bold("========================================\n"));

  // Load config file
  const config = await loadConfigSimple();

  if (!config) {
    console.log(chalk.red("orq.config.json not found."));
    console.log(chalk.gray("Run 'orq init' first to initialize the project."));
    return;
  }

  // Spec name input
  let specName = options.name;
  if (!specName) {
    const { name } = await inquirer.prompt([
      {
        type: "input",
        name: "name",
        message: "Spec name (e.g., PETSTORE, MY_API):",
        validate: (input) => {
          if (!input.trim()) return "Please enter a spec name.";
          if (config.specs?.[input]) return `${input} is already registered.`;
          return true;
        },
      },
    ]);
    specName = name;
  }

  // Spec URL input
  let specUrl = options.url;
  if (!specUrl) {
    const { url } = await inquirer.prompt([
      {
        type: "input",
        name: "url",
        message: "OpenAPI spec URL:",
        validate: (input) => {
          if (!input.trim()) return "Please enter a URL.";
          try {
            new URL(input);
            return true;
          } catch {
            return "Please enter a valid URL.";
          }
        },
      },
    ]);
    specUrl = url;
  }

  // Validate URL using swagger-parser
  const spinner = ora("Validating OpenAPI spec...").start();
  try {
    // swagger-parser가 URL에서 스펙을 가져오고 유효성 검증까지 수행
    const spec = await SwaggerParser.validate(specUrl!);

    const title = spec.info?.title || specName;
    const version = "openapi" in spec ? spec.openapi : (spec as { swagger?: string }).swagger;
    const endpointCount = Object.keys(spec.paths || {}).length;

    spinner.succeed(`OpenAPI ${version} spec validated (${endpointCount} endpoints)`);

    // Description input
    const { description } = await inquirer.prompt([
      {
        type: "input",
        name: "description",
        message: "Description (optional):",
        default: title,
      },
    ]);

    // Update config file
    config.specs = config.specs || {};
    config.specs[specName!] = {
      url: specUrl!,
      description: description || undefined,
    };

    await saveConfig(config);

    console.log(chalk.green(`\n✓ ${specName} added successfully!`));
    console.log(chalk.gray(`  URL: ${specUrl}`));
    console.log(chalk.gray(`  Endpoints: ${endpointCount}`));
    console.log("");
    console.log(chalk.cyan(`Run 'orq generate --spec ${specName}' to generate API code.`));
    console.log("");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    spinner.fail(`Failed to validate spec: ${message}`);
  }
}
