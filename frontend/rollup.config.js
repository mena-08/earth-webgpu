import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'src/main.ts',
  output: {
    file: 'public/bundle.js',
    format: 'iife', // Immediately Invoked Function Expression
    sourcemap: true
  },
  plugins: [
    typescript(),
    resolve(),
    commonjs(),
    terser() // Minifies the bundle
  ]
};
