import babel from 'rollup-plugin-babel'
import resolve from 'rollup-plugin-node-resolve'
import uglify from 'rollup-plugin-uglify-es'

export default {
  input: 'src/global.js',
  output: {
    name: 'NetVis',
    file: 'dist/bundle.js',
    format: 'iife',
    sourcemap: 'dist/bundle.map.js'
  },
  plugins: [
    resolve(),
    babel(),
    uglify()
  ]
}
