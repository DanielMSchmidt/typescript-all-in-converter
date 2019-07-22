function noOp(log: string) {}

const noOpLogger = { info: noOp, log: noOp };

export interface Logger {
  info(log: string, ...logs: any[]): void;
  log(log: string, ...logs: any[]): void;
}

export function getLogger(verbose: boolean) {
  return verbose ? console : noOpLogger;
}
