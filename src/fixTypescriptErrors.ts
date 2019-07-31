import fs from "fs";
import path from "path";
import * as tsTypes from "typescript";
import * as parser from "@babel/parser";
import traverse, { NodePath } from "@babel/traverse";
import generate from "@babel/generator";
import * as t from "@babel/types";
import { Logger, getLogger } from "./logger";
import ignoreComment from "./ignoreComment";

const resolve = (moduleName: string, defaultReturn?: any) => {
  try {
    return require(require.resolve(moduleName, {
      paths: [path.join(process.cwd(), "node_modules")]
    }) as any);
  } catch (e) {
    if (defaultReturn) {
      return defaultReturn;
    }

    throw e;
  }
};

const noOpPrettier = {
  format: (code: string) => code
};

const ts = resolve("typescript");
const prettier = resolve("prettier", noOpPrettier);

function length(node: t.Node): number {
  if (!node.end || !node.start) {
    return Infinity;
  }

  return node.end - node.start;
}

function findNearestNode(position: number, ast: t.File, logger: Logger) {
  let result: NodePath<t.Node>;
  logger.log("Trying to find element at position", position);

  traverse(ast, {
    enter(path) {
      const node = path.node;

      logger.log("Should I set?", node);
      logger.log(`${node.start} < node < ${node.end}`);

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

      /**
       * 1
       * 2
       * 3 position
       * 4 node
       */
      if ((node.start || Infinity) > position) {
        logger.log("node is after position, ignoring");
        return;
      }

      if (!result) {
        logger.log("Setting");
        result = path;
        return;
      } else {
        // Look for the narrowest element
        if (length(result.node) > length(node)) {
          logger.log("Found more specific element");
          result = path;
          return;
        } else {
          logger.log("Element is less specific, ignoring");
        }

        return;
      }
    }
  });

  // @ts-ignore
  return result;
}

function isNonCommentLine(codeLine: string): boolean {
  return codeLine.indexOf("//") === -1;
}

export function getPositionOfNextNonCommentLine(codeLines: string[]): number {
  return codeLines.findIndex(line => isNonCommentLine(line));
}

export function removeDuplicateErrors(codeLines: string[]): string[] {
  if (!codeLines.length) {
    return codeLines;
  }

  const completeIgnoreComment = "//" + ignoreComment;

  return codeLines.reduceRight(
    (previousLines, currentLine) => {
      const commentPosition = currentLine
        .trimLeft()
        .indexOf(completeIgnoreComment);
      // Let's keep all the code (without any comment)
      if (commentPosition === -1) {
        return [currentLine, ...previousLines];
      }

      const nextCodePos = getPositionOfNextNonCommentLine(previousLines);
      if (nextCodePos === 0) {
        // keep the necessary comment line
        return [currentLine, ...previousLines];
      } else {
        // remove the unnecessary comment line (if no code is involved)
        if (commentPosition === 0) {
          return previousLines;
        } else {
          return [
            currentLine.replace(completeIgnoreComment, ""),
            ...previousLines
          ];
        }
      }
    },
    [] as string[]
  );
}

// We need to add a block comment so it's generated into an extra line
// Block comments are not interpreted by typescript, so we need to change them to line comments in an extra step
// This is a hacky workaround, but much better than trying to insert newlines in those cases instead
function addIgnoreBlockComment(path: NodePath<t.Node>): void {
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
      type: "CommentBlock",
      value: ignoreComment
    });
  }
}

// There are only a few places we should not insert a comment into
function findAcceptableNode(node: NodePath) {
  // We don't want to insert a comment inside of an import statement
  if (node.findParent(parent => parent.isImportDeclaration()) !== null) {
    const p = node.findParent(parent => parent.isImportDeclaration());
    return p;
  }
  return node;
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
    .map(nodePath => findAcceptableNode(nodePath))
    .filter(result => result !== null);

  logger.log(`Adding ${errorAstPaths.length} comments to ${fileName}`);

  // update ast nodes
  errorAstPaths.forEach(addIgnoreBlockComment);

  // generate the code
  const code = generate(ast).code;

  // replace comment types
  const codeWithInlineComments = code
    .split(`/*${ignoreComment}*/`)
    .join(`//${ignoreComment}`);

  // spot duplicate errors and remove them
  const codeWithoutDuplicates = removeDuplicateErrors(
    codeWithInlineComments.split("\n")
  ).join("\n");

  let prettyCode = codeWithoutDuplicates;
  try {
    prettyCode = prettier.format(codeWithoutDuplicates, {
      parser: "typescript"
    });
  } catch (e) {
    logger.info(`Could not prettify code for ${fileName}`);
  }
  logger.log(`Writing ${fileName}`);
  // save the file
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
