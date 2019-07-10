import { sync as glob } from "glob";
import * as fs from "fs";
import shell from "shelljs";
import { Logger } from "./logger";

function isReactFile(path: string): boolean {
  const content = fs.readFileSync(path, "utf-8");

  return (
    content.includes('from "react"') ||
    content.includes('require("react")') ||
    content.includes("from 'react'") ||
    content.includes("require('react')")
  );
}

export function moveFileToTypescript(logger: Logger, path: string) {
  logger.info(`Converting ${path}`);

  const newPath = isReactFile(path)
    ? path.replace(".js", ".tsx")
    : path.replace(".js", ".ts");

  shell.mv(path, newPath);
  logger.info(`Done converting to ${newPath}`);
}

export default function moveToTypescript(
  root: string,
  ignorePaths: string[],
  logger: Logger
) {
  glob(root + "/**/*.js")
    .filter(path => !ignorePaths.some(ignorePath => path.includes(ignorePath)))
    .forEach(moveFileToTypescript.bind(null, logger));
}
