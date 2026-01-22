import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/lib.exports.ts'],
  banner: "// For more information, please visit rbtools's GitHub repository:\n// https://github.com/ruggeryiury/rbtools\n",
  fixedExtension: false,
  minify: true,
  unbundle: true,
  copy: { from: 'src/bin', to: 'dist' },
  external: ['type-fest'],
})
