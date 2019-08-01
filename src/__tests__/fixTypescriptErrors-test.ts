import path from "path";
import fs from "fs";
import tmp from "tmp";
import { execSync } from "child_process";
import detectAndFixTypescriptErrors from "../fixTypescriptErrors";

const debugLogger = { log: () => {}, info: () => {} };

const defaultTsConfig = {
  compilerOptions: {
    target: "es5",
    module: "commonjs",
    sourceMap: true,
    strict: true,
    esModuleInterop: true,
    jsx: "React"
  },
  exclude: ["node_modules"]
};

function runFixer(input: string, isReact?: boolean, tsConfig?: Object): string {
  const tmpFolder = tmp.dirSync();
  const tmpFolderPath = tmpFolder.name;
  const fileName = isReact ? "index.tsx" : "index.ts";

  fs.writeFileSync(path.resolve(tmpFolderPath, fileName), input, "utf-8");
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

  // TODO: maybe we can replace this with the local copy by
  // adding a resolve path to the tsconfig or by symlinking it
  if (isReact) {
    fs.writeFileSync(
      path.resolve(tmpFolderPath, "package.json"),
      `{
    "name": "tmp",
    "version": "1.0.0",
    "dependencies": {
      "@types/react": "^16.8.24",
      "react": "^16.8.6"
    }
  }
  `,
      "utf-8"
    );

    execSync("npm install", {
      cwd: tmpFolderPath
    });
  }

  detectAndFixTypescriptErrors(tmpFolderPath, [], console);
  const content = fs.readFileSync(
    path.resolve(tmpFolderPath, fileName),
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
                        "// @ts-ignore typescript-all-in
                        import { help } from \\"./helpers\\";
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

  it("does not split up an import", () => {
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

  describe("JSX", () => {
    it("does not change a thing if JSX is valid", () => {
      expect(
        runFixer(
          `
        const dom = <span>Should Work</span>;
        `,
          true
        )
      ).toMatchInlineSnapshot(`
                "
                        const dom = <span>Should Work</span>;
                        "
            `);
    });

    it("adds a comment for single line jsx", () => {
      expect(
        runFixer(
          `
        const dom = <h1 foo="bar">Should Work</h1>;
        `,
          true
        )
      ).toMatchInlineSnapshot(`
                "const dom = (
                  <// @ts-ignore typescript-all-in
                  h1
                    foo=\\"bar\\"
                  >
                    Should Work
                  </h1>
                );
                "
            `);
    });

    it("adds a comment for multi line jsx", () => {
      expect(
        runFixer(
          `
        const dom = (
          <div>
            <h1 foo="bar">My Text</h1>
          </div>
        );
        
        `,
          true
        )
      ).toMatchInlineSnapshot(`
        "const dom = (
          <div>
            {/*
         // @ts-ignore */}
            <h1 foo=\\"bar\\">My Text</h1>
          </div>
        );
        
        "
      `);
    });
  });
});
