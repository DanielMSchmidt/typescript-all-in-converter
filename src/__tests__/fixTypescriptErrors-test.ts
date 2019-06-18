import path from "path";
import shell from "shelljs";
import fs from "fs";
import detectAndFixTypescriptErrors from "../fixTypescriptErrors";

const nullLogger = {
  log: () => {},
  info: () => {}
};

describe("fixTypescriptErrors", () => {
  it("supresses typescript error in simple project", () => {
    const source = path.resolve(__dirname, "../simpleFixture/index");
    const target = path.resolve(__dirname, "../simpleFixture/index.ts");

    shell.cp(source, target);

    detectAndFixTypescriptErrors(target, [], nullLogger);

    const fileContent = fs.readFileSync(target, "utf-8");
    expect(fileContent).toMatchInlineSnapshot(`
      "function foo(str: string): number {
        return (
          // @ts-ignore typescript-all-in
          3 * str
        );
      }
      "
    `);

    shell.rm(target);
  });
});
