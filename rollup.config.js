import resolve from "@rollup/plugin-node-resolve";
import typescript from "rollup-plugin-typescript2";
import { terser } from "rollup-plugin-terser";
import del from "rollup-plugin-delete";

export default [
  {
    input: "src/index.ts",
    output: {
      file: "dist/umd/index.js",
      format: "umd",
      name: "synapses",
      esModule: false,
      sourcemap: true
    },
    plugins: [
      del({
        targets: ["./dist/umd/*"]
      }),
      typescript({
        typescript: require("typescript")
      }),
      terser({
        output: {
          comments: false
        }
      })
    ]
  },
  {
    input: {
      index: "src/index.ts"
    },
    output: [
      {
        dir: "./dist/esm",
        format: "esm",
        sourcemap: true
      }
    ],
    plugins: [
      del({
        targets: ["./dist/esm/*"]
      }),
      typescript({
        typescript: require("typescript")
      }),
      resolve(),
      terser({
        output: {
          comments: false
        }
      })
    ]
  }
];
