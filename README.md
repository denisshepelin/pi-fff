# pi-fff

Pi extension that replaces `@` file picker candidate generation/ranking with fff.nvim. It enables typo-resistant queries as well as git awareness.
All hard work is done by [fff.nvim](https://github.com/dmtrKovalenko/fff.nvim) which is awesome.

This package uses the official [`@ff-labs/fff-node`](https://www.npmjs.com/package/@ff-labs/fff-node) bindings.

## Setup

```bash
git clone git@github.com:denisshepelin/pi-fff.git
cd pi-fff
npm install
```

Try it out before installing

```bash
pi -e git:github.com/denisshepelin/pi-fff
```

## Run with extension

```bash
pi --extension ./src/index.ts
```

## Notes

- Uses the official `@ff-labs/fff-node` bindings.
- Native library resolution is delegated to `@ff-labs/fff-node` and its platform packages.
