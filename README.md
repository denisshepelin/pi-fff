# pi-fff

Pi extension that replaces `@` file picker candidate generation/ranking with fff.nvim. It enables typo-resistant queries as well as git awareness.
All hard work is done by [fff.nvim](https://github.com/dmtrKovalenko/fff.nvim) which is awesome!

This package is standalone:

- no dependency on `@ff-labs/fff-node`
- no runtime dependency on `fff.nvim`
- native library comes from `@ff-labs/fff-bun-*` optional dependencies

## Setup

```bash
git clone git@github.com:denisshepelin/pi-fff.git
cd pi-fff
npm install --include=optional
```

## Run with extension

```bash
pi --extension ./src/index.ts
```

## Notes

- Uses `koffi` to bind to `libfff_c`.
- Resolves native binary from matching `@ff-labs/fff-bun-<target>` package.
