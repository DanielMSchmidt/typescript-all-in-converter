#!/usr/bin/env node

import yargs from "yargs";
import { moveToTypescript, removeComments } from "./";

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
        .option("ignorePaths", {
          type: "array",
          default: ["/node_modules/", "__tests__"]
        })
        .option("verbose", {
          alias: "v",
          type: "boolean",
          default: false
        }),
    ({ path, verbose, ignorePaths }) => {
      if (verbose) {
        console.info(`Running projects on :${path}`);
      }

      if (typeof path !== "string") {
        throw new Error("path must be a string");
      }

      moveToTypescript(path, ignorePaths, verbose as boolean);
    }
  )
  .command(
    "remove-comments [path]",
    "remove-comments from ts files",
    args =>
      args
        .positional("path", {
          describe: "abolute path to the project root",
          type: "string"
        })
        .option("ignorePaths", {
          type: "array",
          default: ["/node_modules/", "__tests__"]
        })
        .option("verbose", {
          alias: "v",
          type: "boolean",
          default: false
        }),
    ({ path, verbose, ignorePaths }) => {
      if (verbose) {
        console.info(`Running projects on :${path}`);
      }

      if (typeof path !== "string") {
        throw new Error("path must be a string");
      }

      removeComments(path, ignorePaths, verbose as boolean);
    }
  )
  .pkgConf("tsAllIn")
  .option("verbose", {
    alias: "v",
    default: false
  })
  .help().argv;
