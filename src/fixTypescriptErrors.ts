import fs from "fs";
import path from "path";
import * as tsTypes from "typescript";
import * as parser from "@babel/parser";
import traverse, { NodePath } from "@babel/traverse";
import generate from "@babel/generator";
import * as t from "@babel/types";
import { Logger } from "./logger";
import ignoreComment from "./ignoreComment";

const resolve = (moduleName: string) =>
  require(require.resolve(moduleName, {
    paths: [path.join(process.cwd(), "node_modules")]
  }) as any);

const ts = resolve("typescript");
const prettier = resolve("prettier");

function findNearestNode(position: number, ast: t.File, logger: Logger) {
  let result: NodePath<t.Expression>;
  logger.log("Trying to find element at position", position);

  traverse(ast, {
    Expression: function(path) {
      const node = path.node;

      logger.log("Should I set?", node);
      logger.log(`${node.start} <= node <= ${node.end}`);

      /**
       * 1
       * 2 node
       * 3 position
       * 4
       */
      if ((node.end || -Infinity) < position) {
        logger.log("node is before position, ignoring");
        return;
      }

      if (!result) {
        logger.log("Setting");
        result = path;
        return;
      } else {
        return;
      }
    }
  });

  // @ts-ignore
  return result;
}

function addIgnoreComment(path: NodePath<t.Node>): void {
  if (!path || !path.node) {
    return;
  }

  path.node.leadingComments = path.node.leadingComments || [];

  // only add if there is no comment yet
  if (
    !path.node.leadingComments.find(comment => comment.value === ignoreComment)
  ) {
    // @ts-ignore
    path.node.leadingComments.push({
      type: "CommentLine",
      value: ignoreComment
    });
  }
}

function findCommentPosition(node: NodePath<t.Expression>, logger: Logger) {
  logger.log("Finding comment position");
  if (node.getAllPrevSiblings().length) {
    const silblings = node.getAllPrevSiblings();
    logger.log("Found previous silblings", silblings);

    return silblings[silblings.length - 1];
  }

  return node.getStatementParent();
}

function fixErrorsForFile(
  diagnosticList: tsTypes.Diagnostic[],
  logger: Logger
) {
  if (!diagnosticList.length) {
    return;
  }

  const file = diagnosticList[0].file as tsTypes.SourceFile;
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
    .map(position => findNearestNode(position, ast, logger))
    .map(node => findCommentPosition(node, logger))
    .filter(result => result !== null);

  logger.log(`Adding ${errorAstPaths.length} comments to ${fileName}`);

  // update ast nodes
  errorAstPaths.forEach(addIgnoreComment);

  // save the file
  const code = generate(ast).code;
  let prettyCode = code;
  try {
    prettyCode = prettier.format(code, { parser: "typescript" });
  } catch (e) {
    logger.info(`Could not prettify code for ${fileName}`);
  }
  logger.log(`Writing ${fileName}`);
  fs.writeFileSync(fileName, prettyCode, "utf-8");
}

export default function detectAndFixTypescriptErrors(
  root: string,
  ignorePaths: string[],
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
  const host: tsTypes.ParseConfigFileHost = ts.sys as any;

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

  const fileNameMap: Record<string, tsTypes.Diagnostic[]> = {};
  allDiagnostics.forEach((diagnostic: any) => {
    if (diagnostic.file) {
      const fileName = diagnostic.file.fileName;
      fileNameMap[fileName] = fileNameMap[fileName] || [];
      fileNameMap[fileName].push(diagnostic);
    } else {
      const msg = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
      logger.log(`Ignoring error without file: "${msg}"`);
    }
  });

  Object.entries(fileNameMap).forEach(([fileName, diagnosticsList]) => {
    // shall I ignore the file?
    if (ignorePaths.some(ignorePath => fileName.includes(ignorePath))) {
      return;
    }
    // TODO: multi-thread this approach
    fixErrorsForFile(diagnosticsList, logger);
  });
}
