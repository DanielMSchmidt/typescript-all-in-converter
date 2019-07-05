import replaceInFile from "replace-in-file";
import * as fs from "fs";
import recursive from "recursive-readdir";
import { Logger } from "./logger";
import ignoreComment from "./ignoreComment";

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
  logger.info(`removing comments in ${files.length} files`);
  await replaceInFile({
    files,
    from: /\/\/ @ts-ignore typescript-all-in/g,
    to: ""
  });
}
