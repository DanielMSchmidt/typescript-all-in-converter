import { sync as glob } from "glob";
import * as fs from "fs";
import recursive from "recursive-readdir";
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

const findTypescriptFiles = (
  root: string,
  ignorePaths: string[]
): Promise<string[]> =>
  new Promise((resolve, reject) =>
    recursive(
      root,
      [
        path => {
          return (
            !path.includes(".ts") &&
            ignorePaths.some(ignorePath => path.includes(ignorePath))
          );
        }
      ],
      (err, files) => (err ? reject(err) : resolve(files))
    )
  );

export default async function undoIgnoreComments(
  root: string,
  ignorePaths: string[],
  logger: Logger
) {
  const files = await findTypescriptFiles(root, ignorePaths);
  files.forEach(removeIgnoreComment.bind(null, logger));
}
