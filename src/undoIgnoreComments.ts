import { sync as glob } from "glob";
import * as fs from "fs";
import { Logger } from "./logger";
import ignoreComment from "./ignoreComment";

export function removeCommentFromFile(content: string): string {
  return content.split("//" + ignoreComment).join("");
}

export function removeIgnoreComment(logger: Logger, path: string) {
  logger.info(`Removing comments from ${path}`);

  fs.writeFileSync(path, fs.readFileSync(removeCommentFromFile(path), "utf-8"));

  logger.info(`Done removing comments from ${path}`);
}

export default function undoIgnoreComments(
  root: string,
  ignorePaths: string[],
  logger: Logger
) {
  // TODO: this does not match every file, let's check why
  glob("./**/*.ts?(x)", { follow: true, cwd: root })
    .filter(path => ignorePaths.some(ignorePath => path.includes(ignorePath)))
    .map(relativePath => root + relativePath.replace(".", ""))
    .forEach(removeIgnoreComment.bind(null, logger));
}
