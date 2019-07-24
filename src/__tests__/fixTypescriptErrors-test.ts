import path from "path";
import shell from "shelljs";
import fs from "fs";
import tmp from "tmp"; // @ts-ignore typescript-all-in
import detectAndFixTypescriptErrors from "../fixTypescriptErrors";

const debugLogger = { log: () => {}, info: () => {} };

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

  detectAndFixTypescriptErrors(tmpFolderPath, [], console);
  const content = fs.readFileSync(filePath, "utf-8");
  tmpFolder.removeCallback();
  return content;
}

describe("fixTypescriptErrors", () => {
  it("in return function", () => {
    expect(
      runFixer(`
    function foo(str: string): number {
      return 3 * str;
    }
    `)
    ).toMatchInlineSnapshot(`
                                          "function foo(str: string): number {
                                            // @ts-ignore typescript-all-in
                                            return 3 * str;
                                          }
                                          "
                            `);
  });

  it("in normal expression", () => {
    expect(
      runFixer(`
      const message: number = "hello world";
    `)
    ).toMatchInlineSnapshot(`
                                          "// @ts-ignore typescript-all-in
                                          const message: number = \\"hello world\\";
                                          "
                            `);
  });

  it("in a lot of normal expressions", () => {
    expect(
      runFixer(`const message1: boolean = true;
      const message2: number = true;
      const message3: boolean = true;
    `)
    ).toMatchInlineSnapshot(`
                                          "const message1: boolean = true;
                                          // @ts-ignore typescript-all-in
                                          const message2: number = true;
                                          const message3: boolean = true;
                                          "
                            `);
  });

  it("inside a template string", () => {
    expect(
      runFixer(`function fu(amountOfCats: number) {
        return \`
          LeadingLine
          My \${amountOfCats * "Cats"}
          TrailingLine\`;
      }
      `)
    ).toMatchInlineSnapshot(`
                              "function fu(amountOfCats: number) {
                                return \`
                                        LeadingLine
                                        My \${
                                          // @ts-ignore typescript-all-in
                                          amountOfCats * \\"Cats\\"
                                        }
                                        TrailingLine\`;
                              }
                              "
                    `);
  });

  it("inside a constructor", () => {
    expect(
      runFixer(`
      class Parent {}
      class MyClass extends Parent {
        constructor() {
          super(...arguments);
        }
      }
      `)
    ).toMatchInlineSnapshot(`
                        "class Parent {}

                        class MyClass extends Parent {
                          constructor() {
                            // @ts-ignore typescript-all-in
                            super(...arguments);
                          }
                        }
                        "
                `);
  });

  it("a function param", () => {
    expect(
      runFixer(`
      let firstLine = "yes";
      export function fingerprintUrl(url) {
        const shouldUrlBeAnError = true;
      }
      `)
    ).toMatchInlineSnapshot(`
                  "let firstLine = \\"yes\\";
                  // @ts-ignore typescript-all-in
                  export function fingerprintUrl(url) {
                    const shouldUrlBeAnError = true;
                  }
                  "
            `);
  });

  it("multiple function params", () => {
    expect(
      runFixer(`
      export default function stream(url, options = {}) {
        return Observable.create(function(observer) {})
      }
      `)
    ).toMatchInlineSnapshot(`
      "// @ts-ignore typescript-all-in
      export default function stream(url, options = {}) {
        // @ts-ignore typescript-all-in
        return Observable.create(function(observer) {});
      }
      "
    `);
  });

  it("imports", () => {
    expect(
      runFixer(`
      import { help } from "./helpers";
      export function fingerprintUrl(url) {}
      `)
    ).toMatchInlineSnapshot(`
            "// @ts-ignore typescript-all-in
            import { help } from \\"./helpers\\";
            // @ts-ignore typescript-all-in
            export function fingerprintUrl(url) {}
            "
        `);
  });
});
