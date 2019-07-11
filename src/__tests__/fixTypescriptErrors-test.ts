import path from "path";
import shell from "shelljs";
import fs from "fs";
import tmp from "tmp"; // @ts-ignore typescript-all-in
import detectAndFixTypescriptErrors from "../fixTypescriptErrors";

const nullLogger = {
  log: () => {},
  info: () => {}
};

const defaultTsConfig = {
  compilerOptions: {
    target: "es5",
    module: "commonjs",
    sourceMap: true,
    strict: true,
    esModuleInterop: true
  }
};

function runFixer(input: string, tsConfig?: Object): string {
  const tmpFolder = tmp.dirSync();
  const tmpFolderPath = tmpFolder.name;
  const filePath = path.resolve(tmpFolderPath, "index.ts");
  const tsConfigPath = path.resolve(tmpFolderPath, "tsconfig.json");

  fs.writeFileSync(filePath, input, "utf-8");
  fs.writeFileSync(
    tsConfigPath,
    JSON.stringify(tsConfig || defaultTsConfig),
    "utf-8"
  );

  detectAndFixTypescriptErrors(tmpFolderPath, [], nullLogger);
  const content = fs.readFileSync(filePath, "utf-8");
  tmpFolder.removeCallback();
  return content;
}

describe("fixTypescriptErrors", () => {
  it("supresses typescript error in simple project", () => {
    expect(
      runFixer(`
    function foo(str: string): number {
      return (
        3 * str
      );
    }
    `)
    ).toMatchInlineSnapshot(`
      "function foo(str: string): number {
        return (
          3 * str // @ts-ignore typescript-all-in
        );
      }
      "
    `);
  });
});
