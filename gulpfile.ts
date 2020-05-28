import { exec, spawn } from "child_process";
import path from "path";
import {
    watch,
} from "gulp";

let node;
function execNode(): void {
    const ENTRY_POINT = path.resolve(__dirname, "./dist/bin/www.js");
    if (node !== undefined) {
        console.log("Changes made...");
        console.log("Node process exists, Killing node and restarting...\n");
        node.kill();
    }

    console.log("Starting Node Process...");
    // Spawn returns stream while exec returns a buffer.
    // stdio: options choose which streams are piped to the parent process.'
    // stdio: ["inherit"] is the same as chosen below
    node = spawn("node", ["--inspect=0.0.0.0:25585", ENTRY_POINT],
        { stdio: [process.stdin, process.stdout, process.stderr] });

    node.on("close", (code, signal) => {
        if (code === 1 || code === 8) {
            console.log("Errors detected. Node crashed. Will restart on changes...");
        }
        if (signal !== "SIGTERM") {
            console.log(`NODE ERR\nCODE: ${code}\nSIGNAL: ${signal}`);
        }
    });

    node.on("message", (message) => {
        console.log(`MESSAGE: ${message}`);
    });
}

async function transpileTS(filePathWithExt: string): Promise<void> {
    const filePath = path.join(path.dirname(filePathWithExt), path.basename(filePathWithExt, ".ts"));
    // Outputs to the root dist folder
    const destPath = (filePath.replace(/^src\//, "dist/"));
    const destDir = path.dirname(destPath);

    await new Promise((resolve, reject) => {
        exec(`mkdir -p "${destDir}"`, resolve);
    });

    await new Promise((resolve, reject) => {
        exec(`babel "${filePath}.ts" -o "${destPath}.js" --source-maps=true`, async (err, stdout, stderr) => {
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

async function transpileSCSS(filePathWithExt: string): Promise<void> {
    const filePath = path.join(path.dirname(filePathWithExt), path.basename(filePathWithExt, ".scss"));
    // Outputs to ../css folder
    const destPath = path.join(path.dirname(filePath), "../css");

    await new Promise((resolve, reject) => {
        exec(`node-sass "${filePath}.scss" -o "${destPath}"`, (err, stdout, stderr) => {
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

function runNodeAndWatch(): void {
    execNode();

    const tsWatcher = watch("./**/*.ts");
    tsWatcher.on("change", async (filePath) => {
        await transpileTS(filePath);
        execNode();
    });

    const scssWatcher = watch("./**/*.scss");
    scssWatcher.on("change", async (filePath) => {
        await transpileSCSS(filePath);
        execNode();
    });
}

function watchFiles(): void {
    const tsWatcher = watch("./**/*.ts");
    tsWatcher.on("change", (filePath) => {
        transpileTS(filePath);
    });

    const scssWatcher = watch("./**/*.scss");
    scssWatcher.on("change", (filePath) => {
        transpileSCSS(filePath);
    });
}

exports.default = runNodeAndWatch;
exports.watch = watchFiles;
