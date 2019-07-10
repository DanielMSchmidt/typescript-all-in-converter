# Typescript All-In Converter

Ever had a massive project with a lot of Javascript files? Moving everything to [Typescript at once and setting a lot of ts-ignores](https://www.youtube.com/watch?v=P-J9Eg7hJwE) is one way to do it. This CLI tool wants to help with it.

## Usage

Run `npx typescript-all-in /path/to/project` in a project where a typescript converter is setup and typescript is installd. The effect will be:

- Every `js` file will be changed to a `ts` or `tsx` file
- Every typescript error will be ignored with a `// @ts-ignore typescript-all-in` error, so the project will still compile
- Every existing `// @ts-ignore typescript-all-in` comment will be removed and it will be checked if they are still needed

This means if you ran this command already, you can safely run it again. Plus, you can also run it after you fixed a type error to check which other ones might also be fixed by that.

## License

MIT
