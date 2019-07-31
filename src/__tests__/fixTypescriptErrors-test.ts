import path from "path";
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

  fs.writeFileSync(path.resolve(tmpFolderPath, "index.ts"), input, "utf-8");
  fs.writeFileSync(
    path.resolve(tmpFolderPath, "noDefaultExport.ts"),
    `
  module.exports = "FOO"`,
    "utf-8"
  );
  fs.writeFileSync(
    path.resolve(tmpFolderPath, "tsconfig.json"),
    JSON.stringify(tsConfig || defaultTsConfig),
    "utf-8"
  );

  detectAndFixTypescriptErrors(tmpFolderPath, [], console);
  const content = fs.readFileSync(
    path.resolve(tmpFolderPath, "index.ts"),
    "utf-8"
  );
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
                    return (
                      3 *
                      // @ts-ignore typescript-all-in
                      str
                    );
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
                  "const // @ts-ignore typescript-all-in
                    message: number = \\"hello world\\";
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
                  const // @ts-ignore typescript-all-in
                    message2: number = true;
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
                            My \${amountOfCats *
                              // @ts-ignore typescript-all-in
                              \\"Cats\\"}
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
                      super(
                        // @ts-ignore typescript-all-in
                        ...// @ts-ignore typescript-all-in
                        arguments
                      );
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
                  export function fingerprintUrl(
                    // @ts-ignore typescript-all-in
                    url
                  ) {
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
                  "export default function stream(
                    // @ts-ignore typescript-all-in
                    url,
                    options = {}
                  ) {
                    return (
                      // @ts-ignore typescript-all-in
                      Observable.create(function(
                        // @ts-ignore typescript-all-in
                        observer
                      ) {})
                    );
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
                  "import {
                    help
                    // @ts-ignore typescript-all-in
                  } from \\"./helpers\\";
                  export function fingerprintUrl(
                    // @ts-ignore typescript-all-in
                    url
                  ) {}
                  "
            `);
  });

  it("lives with future linebreaks", () => {
    expect(
      runFixer(`
      this.addListener = (type, callback) => {
        if (!this.events[type]) {
          this.events[type] = [];
        }
        this.events[type].push(callback);
      };
      `)
    ).toMatchInlineSnapshot(`
                  "// @ts-ignore typescript-all-in
                  this.addListener = (
                    // @ts-ignore typescript-all-in
                    type,
                    // @ts-ignore typescript-all-in
                    callback
                  ) => {
                    if (
                      !// @ts-ignore typescript-all-in
                      // @ts-ignore typescript-all-in
                      this.events[type]
                    ) {
                      // @ts-ignore typescript-all-in
                      // @ts-ignore typescript-all-in
                      this.events[type] = [];
                    }

                    // @ts-ignore typescript-all-in
                    this// @ts-ignore typescript-all-in
                    .events[type]
                      .push(callback);
                  };
                  "
            `);
  });

  it.only("does not split up an import", () => {
    expect(
      runFixer(`
      import Foo from "./noDefaultExport.ts";
      `)
    ).toMatchInlineSnapshot(`
      "// @ts-ignore typescript-all-in
      import Foo from \\"./noDefaultExport.ts\\";
      "
    `);
  });
});
