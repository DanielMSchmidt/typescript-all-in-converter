import {
  removeDuplicateErrors,
  getPositionOfNextNonCommentLine
} from "../fixTypescriptErrors";

describe("getPositionOfNextNonCommentLine", () => {
  it("returns 0 if it's the next line", () => {
    expect(getPositionOfNextNonCommentLine(["const foo = bar"])).toBe(0);
  });

  it("returns 1 if there is a comment inbetween", () => {
    expect(
      getPositionOfNextNonCommentLine(["// my comment", "const foo = bar"])
    ).toBe(1);
  });

  it("returns -1 if there is no code line to be found", () => {
    expect(getPositionOfNextNonCommentLine(["// my comment"])).toBe(-1);
  });
});

describe("removeDuplicateErrors", () => {
  const removeDuplicateErrorsFromString = (code: string) =>
    removeDuplicateErrors(code.split("\n")).join("\n");

  it("leave errorless code alone", () => {
    expect(
      removeDuplicateErrorsFromString(`console.log("Everything is fine")`)
    ).toBe(`console.log("Everything is fine")`);
  });

  it("leaves normal comments alone", () => {
    expect(
      removeDuplicateErrorsFromString(`
      // Other comment
      // @ts-ignore typescript-all-in
      const foo = "bar";
      `)
    ).toMatchInlineSnapshot(`
                        "
                              // Other comment
                              // @ts-ignore typescript-all-in
                              const foo = \\"bar\\";
                              "
                `);
  });

  it("leaves comments for different elements alone", () => {
    expect(
      removeDuplicateErrorsFromString(`
        // Other comment
        // @ts-ignore typescript-all-in
        const foo = (
            // @ts-ignore typescript-all-in
            "bar"
        );
        `)
    ).toMatchInlineSnapshot(`
                        "
                                // Other comment
                                // @ts-ignore typescript-all-in
                                const foo = (
                                    // @ts-ignore typescript-all-in
                                    \\"bar\\"
                                );
                                "
                `);
  });

  it("removes comments that are seperated by line break", () => {
    expect(
      removeDuplicateErrorsFromString(`
          // @ts-ignore typescript-all-in
          // @ts-ignore typescript-all-in
          const foo = "bar";
          `)
    ).toMatchInlineSnapshot(`
      "
                // @ts-ignore typescript-all-in
                const foo = \\"bar\\";
                "
    `);
  });

  it("removes comments that are seperated by line break and indentation", () => {
    expect(
      removeDuplicateErrorsFromString(`
          // @ts-ignore typescript-all-in
            // @ts-ignore typescript-all-in
          const foo = "bar";
          `)
    ).toMatchInlineSnapshot(`
      "
                  // @ts-ignore typescript-all-in
                const foo = \\"bar\\";
                "
    `);
  });

  it("removes comments that are seperated by another comment", () => {
    expect(
      removeDuplicateErrorsFromString(`
          // @ts-ignore typescript-all-in
          // totally unrelated
          // @ts-ignore typescript-all-in
          const foo = "bar";
          `)
    ).toMatchInlineSnapshot(`
      "
                // totally unrelated
                // @ts-ignore typescript-all-in
                const foo = \\"bar\\";
                "
    `);
  });

  it("removes comments that inside of an expression", () => {
    expect(
      removeDuplicateErrorsFromString(`
      if (
        !// @ts-ignore typescript-all-in
        // @ts-ignore typescript-all-in
        this.events[type]
        ) {
          `)
    ).toMatchInlineSnapshot(`
                  "
                        if (
                          !
                          // @ts-ignore typescript-all-in
                          this.events[type]
                          ) {
                            "
            `);
  });
});
