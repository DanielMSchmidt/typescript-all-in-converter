function noOp(log: string) {}

const noOpLogger = { info: noOp, log: noOp };

export interface Logger {
  info(log: string): void;
  log(log: string): void;
}

export function getLogger(verbose: boolean) {
  return verbose ? console : noOpLogger;
}
