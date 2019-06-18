#!/usr/bin/env node

import yargs from "yargs";
import { moveToTypescript } from "./";

// TODO: allow array of ignore patterns for glob
yargs
  .command(
    "convert [path]",
    "convert project in path to typescript",
    args =>
      args
        .positional("path", {
          describe: "abolute path to the project root",
          type: "string"
        })
        .option("verbose", {
          alias: "v",
          type: "boolean",
          default: false
        }),
    ({ path, verbose }) => {
      if (verbose) {
        console.info(`Running projects on :${path}`);
      }

      if (typeof path !== "string") {
        throw new Error("path must be a string");
      }

      moveToTypescript(path, verbose as boolean);
    }
  )
  .option("verbose", {
    alias: "v",
    default: false
  })
  .help().argv;
