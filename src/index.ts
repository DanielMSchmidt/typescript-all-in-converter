import moveFilesToTypescript from "./toTypescript";
function noOp(log: string) {}

const noOpLogger = { info: noOp, log: noOp };

export function moveToTypescript(projectRoot: string, verbose: boolean) {
  const logger = verbose ? console : noOpLogger;

  logger.info("Moving files to typescript");
  moveFilesToTypescript(projectRoot, logger);
}
