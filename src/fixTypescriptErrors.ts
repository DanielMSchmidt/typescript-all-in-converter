import { Logger } from "./logger";
import * as ts from "typescript";
import fs from "fs";

const disableLine = "// ts-ignore typescript-all-in";
export function fixError(diagnostic: ts.Diagnostic, logger: Logger) {
  const file = diagnostic.file as ts.SourceFile;
  const fileName = file.fileName;
  const fileContent = fs.readFileSync(fileName, "utf-8");

  const lines = fileContent.split("\n");
  const { line } = file.getLineAndCharacterOfPosition(diagnostic.start || 0);

  // TODO: this is too naive, we need to find the right place in the code to add it
  // For this we need to parse the TS file and insert the comment before
  lines.splice(line, 0, disableLine);
  const newFileContent = lines.join("\n");

  fs.writeFileSync(fileName, newFileContent);
}

export default function detectAndFixTypescriptErrors(
  root: string,
  logger: Logger
) {
  const configPath = ts.findConfigFile(
    root,
    ts.sys.fileExists,
    "tsconfig.json"
  );

  if (!configPath) {
    throw new Error("Could not find a valid 'tsconfig.json'.");
  }

  // tslint:disable-next-line no-any
  const host: ts.ParseConfigFileHost = ts.sys as any;
  // Fix after https://github.com/Microsoft/TypeScript/issues/18217

  const parsedCmd = ts.getParsedCommandLineOfConfigFile(
    configPath,
    { noEmit: true },
    host
  );

  if (!parsedCmd) {
    throw new Error("Could not parse config");
  }

  const { options, fileNames } = parsedCmd;

  const program = ts.createProgram({
    rootNames: fileNames,
    options
  });

  const { diagnostics } = program.emit();

  let allDiagnostics = ts.getPreEmitDiagnostics(program).concat(diagnostics);

  allDiagnostics.forEach(diagnostic => {
    if (diagnostic.file) {
      // TODO: multithread this part
      // TODO: do other errors disappear if one error is ignored?
      fixError(diagnostic, logger);
    } else {
      const msg = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
      logger.log(`Ignoring error without file: "${msg}"`);
    }
  });
}
