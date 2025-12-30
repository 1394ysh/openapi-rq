import chalk from "chalk";
import ora from "ora";
import { selectSpec } from "../prompts/selectSpec.js";
import { selectMode } from "../prompts/selectMode.js";
import { selectApis } from "../prompts/selectApis.js";
import { selectOutputPath } from "../prompts/selectPath.js";
import { confirmOverwrite } from "../prompts/confirmOverwrite.js";
import {
  selectReactQueryVersion,
  type ReactQueryConfig,
} from "../prompts/selectReactQueryVersion.js";
import { fetchOpenApiSpec } from "../../parser/openapi.js";
import { extractAllApis } from "../../parser/apis.js";
import { generateApiFile } from "../../generator/fileGenerator.js";
import { generateUtilityFiles } from "../../generator/templates.js";
import { loadConfigSimple, type OrqConfig, type ReactQueryVersion } from "../../config/loader.js";
import { fileExists, generateFileName } from "../../utils/files.js";
import type { SpecName } from "../../config/specs.js";

interface GenerateOptions {
  spec?: string;
  output?: string;
  all?: boolean;
  overwrite?: boolean;
}

/**
 * Run interactive mode
 */
export async function runInteractiveMode(options: GenerateOptions): Promise<void> {
  console.log(chalk.bold("\n========================================"));
  console.log(chalk.bold("  orq - OpenAPI React Query Generator"));
  console.log(chalk.bold("========================================\n"));

  // Load config file
  const config = await loadConfigSimple();

  if (!config) {
    console.log(chalk.red("orq.config.json not found."));
    console.log(chalk.gray("Run 'orq init' first to initialize the project."));
    return;
  }

  const specs = config.specs || {};

  if (Object.keys(specs).length === 0) {
    console.log(chalk.yellow("No specs registered."));
    console.log(chalk.gray("Run 'orq add' to add an OpenAPI spec."));
    return;
  }

  // Step 1: Select spec
  let specName: SpecName;
  if (options.spec && options.spec in specs) {
    specName = options.spec as SpecName;
    console.log(chalk.green(`✓ Using spec: ${specName}`));
  } else {
    specName = await selectSpec(specs);
  }

  const specConfig = specs[specName];

  // Step 2: Fetch OpenAPI spec
  const spinner = ora(`Fetching OpenAPI spec from ${specName}...`).start();
  let openApiSpec;
  try {
    openApiSpec = await fetchOpenApiSpec(specConfig.url);
    spinner.succeed(`Loaded ${Object.keys(openApiSpec.paths || {}).length} endpoints`);
  } catch (error) {
    spinner.fail("Failed to fetch OpenAPI spec");
    throw error;
  }

  // Step 3: Selection mode
  let selectedApis;
  if (options.all) {
    selectedApis = extractAllApis(openApiSpec);
    console.log(chalk.green(`✓ Selected all ${selectedApis.length} APIs`));
  } else {
    const mode = await selectMode();
    selectedApis = await selectApis(openApiSpec, mode);
  }

  if (selectedApis.length === 0) {
    console.log(chalk.yellow("\nNo APIs selected. Exiting."));
    return;
  }

  // Step 4: Select React Query version (if not in config)
  let reactQueryConfig: ReactQueryConfig;
  const configVersion = config?.reactQueryVersion || config?.reactQuery?.version;
  if (configVersion) {
    const { getReactQueryConfig } = await import("../prompts/selectReactQueryVersion.js");
    reactQueryConfig = getReactQueryConfig(configVersion);
    console.log(chalk.green(`✓ Using React Query ${configVersion} (from config)`));
  } else {
    reactQueryConfig = await selectReactQueryVersion();
  }

  // Step 5: Select output path
  const outputPath = options.output || config?.outputPath || await selectOutputPath();

  // Step 6: Ensure utility files exist
  const fullOutputPath = process.cwd() + "/" + outputPath;
  await generateUtilityFiles(fullOutputPath);
  console.log(chalk.green("✓ Utility files created"));

  // Step 7: Summary and confirmation
  console.log(chalk.bold("\n========================================"));
  console.log(chalk.bold("  Summary"));
  console.log(chalk.bold("========================================"));
  console.log(`  Spec: ${chalk.cyan(specName)}`);
  console.log(`  APIs: ${chalk.cyan(selectedApis.length.toString())} endpoints`);
  console.log(`  Output: ${chalk.cyan(outputPath)}`);
  console.log(`  React Query: ${chalk.cyan(reactQueryConfig.version)} (${reactQueryConfig.importPath})`);
  console.log("");

  selectedApis.slice(0, 5).forEach((api) => {
    console.log(`    ${chalk.gray("-")} [${api.method.toUpperCase()}] ${api.path}`);
  });
  if (selectedApis.length > 5) {
    console.log(chalk.gray(`    ... and ${selectedApis.length - 5} more`));
  }
  console.log("");

  // Step 8: Generate files
  const generatedFiles: string[] = [];
  const skippedFiles: string[] = [];

  for (const api of selectedApis) {
    const fileName = generateFileName(api.method, api.path);
    const filePath = `${outputPath}/${specName}/${fileName}`;

    // Check file exists and handle overwrite
    const exists = await fileExists(filePath);
    if (exists && !options.overwrite) {
      const shouldOverwrite = await confirmOverwrite(filePath);
      if (!shouldOverwrite) {
        skippedFiles.push(filePath);
        continue;
      }
    }

    try {
      await generateApiFile({
        specName,
        api,
        outputPath: filePath,
        openApiSpec,
        reactQueryConfig,
        hookOptions: config.generate,
      });
      generatedFiles.push(filePath);
    } catch (error) {
      console.error(chalk.red(`Failed to generate ${filePath}`));
      if (error instanceof Error) {
        console.error(chalk.gray(error.message));
      }
    }
  }

  // Step 9: Output result
  console.log(chalk.bold("\n========================================"));
  console.log(chalk.bold("  Result"));
  console.log(chalk.bold("========================================"));
  console.log(`  ${chalk.green("Generated:")} ${generatedFiles.length} files`);
  if (skippedFiles.length > 0) {
    console.log(`  ${chalk.yellow("Skipped:")} ${skippedFiles.length} files`);
  }
  console.log("");
}
