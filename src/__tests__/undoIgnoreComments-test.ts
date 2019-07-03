import { removeCommentFromFile } from "../undoIgnoreComments";

describe("removeCommentFromFile", () => {
  it("removes all comments", () => {
    expect(
      removeCommentFromFile(`
}).pipe(
tap(requestResponse => {
    if (
    // @ts-ignore typescript-all-in
    requestResponse.code >= 300
    ) {
    throw new Error(getErrorMessage(requestResponse));
    }
})
        `)
    ).not.toBe(expect.stringContaining("// @ts-ignore typescript-all-in"));
  });
});
