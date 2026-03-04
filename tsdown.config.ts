import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/lib.exports.ts', 'src/utils.exports.ts'],
  banner: "// For more information, please visit RBTools's GitHub repository:\n// https://github.com/ruggeryiury/rbtools\n",
  fixedExtension: false,
  minify: false,
  unbundle: true,
  copy: { from: 'src/bin', to: 'dist' },
  deps: {
    neverBundle: ['type-fest'],
  },
})
