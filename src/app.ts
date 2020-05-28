import express from "express";
import {
    Worker, isMainThread, parentPort, MessagePort, workerData,
} from "worker_threads";
import path from "path";
import Client from "./client";
import routesRouter from "./routes";
const app = express();

app.use((request, response, next) => {
    // Allowed connections
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    response.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers,X-Access-Token,XKey,Authorization");
    next();
});
app.use(express.json());
app.use(routesRouter);

const fileName = path.resolve(__dirname, "client", "client.js");
const client = new Client();
client.init();

process.on("SIGTERM", () => {
    client.disconnect();
});

export default app;
