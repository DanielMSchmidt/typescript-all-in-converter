import moveFilesToTypescript from "./toTypescript";
import { getLogger } from "./logger";
import fixTypescriptError from "./fixTypescriptErrors";

export function moveToTypescript(projectRoot: string, verbose: boolean) {
  const logger = getLogger(verbose);

  logger.info("Moving files to typescript");
  moveFilesToTypescript(projectRoot, logger);
  // TODO: remove all previously existing ts-ignore comments
  fixTypescriptError(projectRoot, logger);
}
