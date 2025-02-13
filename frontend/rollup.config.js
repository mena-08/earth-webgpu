// import typescript from '@rollup/plugin-typescript';
// import { terser } from 'rollup-plugin-terser';
// import resolve from '@rollup/plugin-node-resolve';
// import commonjs from '@rollup/plugin-commonjs';
// import url from '@rollup/plugin-url';
// //import string from '@rollup/plugin-string-import';

// function wgslPlugin() {
//   return {
//     name: 'wgsl-plugin',
//     transform(code, id) {
//       if (id.endsWith('.wgsl')) {
//         return {
//           code: `export default \`${code}\`;`,
//           map: { mappings: '' },
//         };
//       }
//     },
//   };
// }

// export default {
//   input: 'src/main.ts',
//   output: {
//     dir: 'public/output',
//     //file: 'public/bundle.js',
//     format: 'esm',
//     sourcemap: true
//   },
//   plugins: [
//     url({
//       limit: 0,
//       include: ["**/*.png", "**/*.jpg", "**/*.gif"],
//       emitFiles: true,
//       fileName: '[dirname][hash][extname]',
//       destDir: 'public/output/assets'
//   }),
//     wgslPlugin(),
//     typescript(),
//     resolve(),
//     commonjs(),
//     terser(),
//   ]
// };


// import typescript from '@rollup/plugin-typescript';
// import { terser } from 'rollup-plugin-terser';
// import resolve from '@rollup/plugin-node-resolve';
// import commonjs from '@rollup/plugin-commonjs';
// import url from '@rollup/plugin-url';
// import copy from 'rollup-plugin-copy'; // Import the copy plugin

// // Custom wgsl plugin
// function wgslPlugin() {
//   return {
//     name: 'wgsl-plugin',
//     transform(code, id) {
//       if (id.endsWith('.wgsl')) {
//         return {
//           code: `export default \`${code}\`;`,
//           map: { mappings: '' },
//         };
//       }
//     },
//   };
// }

// export default {
//   input: 'src/main.ts',
//   output: {
//     dir: 'public/output',
//     format: 'esm',
//     sourcemap: true
//   },
//   plugins: [
//     url({
//       limit: 0,
//       include: ["**/*.png", "**/*.jpg", "**/*.gif"],
//       emitFiles: true,
//       fileName: '[dirname][hash][extname]',
//       destDir: 'public/output/assets'
//     }),
//     wgslPlugin(),
//     typescript(),
//     resolve(),
//     commonjs(),
//     terser(),
//     // Copy the public folder contents, excluding the output folder itself
//     copy({
//       targets: [
//         {
//           src: 'public/*',
//           dest: 'public/output/assets',
//           // Exclude copying anything from 'public/output' to avoid circular copying
//           ignore: ['public/output/**']
//         }
//       ]
//     })
//   ]
// };


import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import url from '@rollup/plugin-url';
import copy from 'rollup-plugin-copy';
import postcss from 'rollup-plugin-postcss'; // Import postcss plugin

// Custom wgsl plugin
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
    dir: 'public/output',
    format: 'esm',
    sourcemap: true,
  },
  plugins: [
    url({
      limit: 0,
      include: ['**/*.png', '**/*.jpg', '**/*.gif'],
      emitFiles: true,
      fileName: '[dirname][hash][extname]',
      destDir: 'public/output/assets',
    }),
    wgslPlugin(),
    typescript(),
    resolve(),
    commonjs(),
    terser(),
    postcss({
      extract: true, // Extracts CSS into a separate file
      minimize: true, // Minifies the CSS
      sourceMap: true, // Adds source maps for the CSS
    }),
    copy({
      targets: [
        { src: 'public/index.html', dest: 'public/../' }, // Move index.html one level up
        { src: 'public/assets/**/*', dest: 'public/output/assets' }, // Copy other assets
      ],
      copyOnce: true, // To avoid repeated copying
    }),
  ],
};
