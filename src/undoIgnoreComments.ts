import replaceInFile from "replace-in-file";
import recursive from "recursive-readdir";
import { Logger } from "./logger";

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

  // We don't want to have two many file handles open at once
  while (files.length > 0) {
    const batch = files.splice(0, 50);

    await replaceInFile({
      files: batch,
      from: /\/\/ @ts-ignore typescript-all-in/g,
      to: ""
    });
  }
  logger.info(`done removing comments from files`);
}
