"use strict";

var _child_process = require("child_process");

var _path = _interopRequireDefault(require("path"));

var _gulp = require("gulp");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let node;

const ENTRY_POINT = _path.default.resolve(__dirname, "./dist/bin/www.js");

function restart() {
  console.log("\nStarting Node Process..."); // Spawn returns stream while exec returns a buffer.
  // stdio: options choose which streams are piped to the parent process.'
  // stdio: ["inherit"] is the same as chosen below

  node = (0, _child_process.spawn)("node", ["--inspect=0.0.0.0:25585", ENTRY_POINT], {
    stdio: [process.stdin, process.stdout, process.stderr]
  });
  node.on("close", (code, signal) => {
    if (code === 1 || code === 8) {
      console.log("Errors detected. Node crashed. Will restart on changes...");
    }

    if (code === 0) {
      process.kill(process.pid, 0);
    } else if (signal !== "SIGTERM") {
      console.log(`NODE ERR\nCODE: ${code}\nSIGNAL: ${signal}`);
    }
  });
  node.on("message", message => {
    console.log(`MESSAGE: ${message}`);
  });
}

function execNode(resolve) {
  if (node !== undefined) {
    console.log("Changes made...");
    console.log("Node process exists, Killing node and restarting...\n");
    node.kill();
    node.on("exit", () => {
      restart();
    });
  } else {
    restart();
  }
}

async function transpileTS(filePathWithExt) {
  const filePath = _path.default.join(_path.default.dirname(filePathWithExt), _path.default.basename(filePathWithExt, ".ts")); // Outputs to the root dist folder


  const destPath = filePath.replace(/^src\//, "dist/");

  const destDir = _path.default.dirname(destPath);

  await new Promise((resolve, reject) => {
    (0, _child_process.exec)(`mkdir -p "${destDir}"`, resolve);
  });
  await new Promise((resolve, reject) => {
    (0, _child_process.exec)(`babel "${filePath}.ts" -o "${destPath}.js" --config-file "${_path.default.resolve(__dirname, ".babelrc")}"`, async (err, stdout, stderr) => {
      if (!err && !stderr) {
        console.log(`\nSUCCESS: Transpiled ${filePath}.ts to ${destPath}.js`);
        if (stdout) console.log(stdout);
        resolve();
      } else if (err) {
        console.log(`\nERROR, couldn't execute command - ${err}`);
        reject();
      } else {
        console.log(`\nTRANSPILER ERR (for .ts) - ${stderr}`);
        reject();
      }
    });
  });
}

async function transpileSCSS(filePathWithExt) {
  const filePath = _path.default.join(_path.default.dirname(filePathWithExt), _path.default.basename(filePathWithExt, ".scss")); // Outputs to ../css folder


  const destPath = _path.default.join(_path.default.dirname(filePath), "../css");

  await new Promise((resolve, reject) => {
    (0, _child_process.exec)(`node-sass "${filePath}.scss" -o "${destPath}"`, (err, stdout, stderr) => {
      if (!err && !stderr) {
        console.log(`\nSUCCESS: Transpiled ${filePath} to ${destPath}`);
        if (stdout) console.log(stdout);
        resolve();
      } else if (err) {
        console.log(`\nERROR, couldn't execute command - ${err}`);
        reject();
      } else {
        console.log(`\nTRANSPILER ERR (for .scss) - ${stderr}`);
        reject();
      }
    });
  });
}

function runNodeAndWatch() {
  execNode();
  const tsWatcher = (0, _gulp.watch)("./**/*.ts");
  tsWatcher.on("change", async filePath => {
    await transpileTS(filePath);
    execNode();
  });
  const scssWatcher = (0, _gulp.watch)("./**/*.scss");
  scssWatcher.on("change", async filePath => {
    await transpileSCSS(filePath);
    execNode();
  });
}

function watchFiles() {
  const tsWatcher = (0, _gulp.watch)("./**/*.ts");
  tsWatcher.on("change", filePath => {
    transpileTS(filePath);
  });
  const scssWatcher = (0, _gulp.watch)("./**/*.scss");
  scssWatcher.on("change", filePath => {
    transpileSCSS(filePath);
  });
}

exports.default = runNodeAndWatch;
exports.watch = watchFiles;
