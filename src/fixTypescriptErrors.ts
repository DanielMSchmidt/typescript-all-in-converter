import fs from "fs";
import * as ts from "typescript";
import * as parser from "@babel/parser";
import traverse, { NodePath } from "@babel/traverse";
import generate from "@babel/generator";
import * as t from "@babel/types";
import { Logger } from "./logger";

function fixErrorsForFile(diagnosticList: ts.Diagnostic[], logger: Logger) {
  if (!diagnosticList.length) {
    return;
  }

  const file = diagnosticList[0].file as ts.SourceFile;
  const fileName = file.fileName;
  // get positions
  const errorPositions = diagnosticList
    .filter(diagnostic => typeof diagnostic.start === "number")
    .map(diagnostic => diagnostic.start as number);

  // parse the file
  const ast = parser.parse(fs.readFileSync(fileName, "utf-8"), {
    sourceType: "unambiguous",
    plugins: [
      "typescript",
      "jsx",
      "dynamicImport",
      "decorators-legacy",
      "classProperties"
    ]
  });

  logger.log(`Parsed ${fileName}`);

  // find all ast nodes
  const errorAstPaths = errorPositions
    .map(position => {
      let result: NodePath<t.Expression>;

      traverse(ast, {
        Expression: function(path) {
          const node = path.node;

          if (!result) {
            result = path;
          }
          // We are searching for the last expression that ends before the error

          /**
           * 1
           * 2
           * 3 position
           * 4 node
           */
          if ((node.start || Infinity) > position) {
            return;
          }

          /**
           * 1 node
           * 2 result
           * 3 position
           * 4
           */
          if ((node.end || Infinity) < (result.node.end || Infinity)) {
            return;
          }

          result = path;
        }
      });

      // @ts-ignore
      return result;
    })
    .filter(result => result !== null);

  logger.log(`Adding ${errorAstPaths.length} comments to ${fileName}`);

  // update ast nodes
  errorAstPaths.forEach(path => {
    path.addComment("CommentLine", "// @ts-ignore typescript-all-in", true);
  });

  // save the file
  const code = generate(ast).code;
  logger.log(`Writing ${fileName}`);
  fs.writeFileSync(fileName, code, "utf-8");
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

  const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(diagnostics);

  const fileNameMap: Record<string, ts.Diagnostic[]> = {};
  allDiagnostics.forEach(diagnostic => {
    if (diagnostic.file) {
      const fileName = diagnostic.file.fileName;
      fileNameMap[fileName] = fileNameMap[fileName] || [];
      fileNameMap[fileName].push(diagnostic);
    } else {
      const msg = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
      logger.log(`Ignoring error without file: "${msg}"`);
    }
  });

  Object.values(fileNameMap).forEach(diagnosticsList => {
    fixErrorsForFile(diagnosticsList, logger);
  });
}
