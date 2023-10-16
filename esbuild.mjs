import * as esbuild from 'esbuild'

await esbuild.build({
  entryPoints: ['./src/client/index.jsx'],
  plugins: [],
  bundle: true,
  outfile: './statics/bundle.js',
})