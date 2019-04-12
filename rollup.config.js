import minify from 'rollup-plugin-babel-minify'
import resolve from 'rollup-plugin-node-resolve'

export default {
  input: 'src/global.js',
  output: {
    name: 'NetVis',
    file: 'dist/bundle.js',
    format: 'iife',
    sourcemap: true
  },
  plugins: [
    resolve(),
    minify()
  ]
}
