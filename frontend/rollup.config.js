import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import url from '@rollup/plugin-url';
//import string from '@rollup/plugin-string-import';

function wgslPlugin() {
  return {
    name: 'wgsl-plugin',
    transform(code, id) {
      if (id.endsWith('.wgsl')) {
        return {
          code: `export default \`${code}\`;`,
          map: { mappings: '' },
        };
      }
    },
  };
}

export default {
  input: 'src/main.ts',
  output: {
    file: 'public/bundle.js',
    format: 'iife',
    sourcemap: true
  },
  plugins: [
    url({
      limit: 0,
      include: ["**/*.png", "**/*.jpg", "**/*.gif"],
      emitFiles: true,
      fileName: '[dirname][hash][extname]',
      destDir: 'dist/assets'
  }),
    wgslPlugin(),
    typescript(),
    resolve(),
    commonjs(),
    terser(),
  ]
};
