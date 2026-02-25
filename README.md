# pi-fff

Pi extension that replaces `@` file picker candidate generation/ranking with `fff` via inlined FFI wrappers.

This package is standalone:
- no dependency on `@ff-labs/fff-node`
- no runtime dependency on `fff.nvim`
- native library comes from `@ff-labs/fff-bun-*` optional dependencies

## Setup

```fish
git clone git@github.com:denisshepelin/pi-fff.git
cd pi-fff
npm install --include=optional
```

## Run with extension

```fish
pi --extension ./src/index.ts
```

## Notes

- Uses `koffi` to bind to `libfff_c`.
- Resolves native binary from matching `@ff-labs/fff-bun-<target>` package.
- Includes `/fff-score-debug <query>` command to compare default picker vs fff ranking.
