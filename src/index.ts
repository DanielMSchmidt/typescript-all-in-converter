import moveFilesToTypescript from "./toTypescript";
import { getLogger } from "./logger";
import fixTypescriptError from "./fixTypescriptErrors";

export function moveToTypescript(
  projectRoot: string,
  ignorePaths: string[],
  verbose: boolean
) {
  const logger = getLogger(verbose);

  logger.info("Moving files to typescript");
  moveFilesToTypescript(projectRoot, ignorePaths, logger);
  // TODO: remove all previously existing ts-ignore comments
  logger.info("Fixing typescript errors");
  fixTypescriptError(projectRoot, ignorePaths, logger);
}
