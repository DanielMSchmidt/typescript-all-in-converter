import moveFilesToTypescript from "./toTypescript";
import { getLogger } from "./logger";
import fixTypescriptError from "./fixTypescriptErrors";
import undoIgnoreComments from "./undoIgnoreComments";

export async function moveToTypescript(
  projectRoot: string,
  ignorePaths: string[],
  verbose: boolean
) {
  const logger = getLogger(verbose);

  logger.info("Moving files to typescript");
  moveFilesToTypescript(projectRoot, ignorePaths, logger);
  logger.info("Removing previous ignores");
  await undoIgnoreComments(projectRoot, ignorePaths, logger);
  logger.info("Fixing typescript errors");
  fixTypescriptError(projectRoot, ignorePaths, logger);
}

export async function removeComments(
  projectRoot: string,
  ignorePaths: string[],
  verbose: boolean
) {
  const logger = getLogger(verbose);

  logger.info("Removing ignores");
  await undoIgnoreComments(projectRoot, ignorePaths, logger);
}
