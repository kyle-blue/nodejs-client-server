import express from "express";
import Client from "./Client";
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


const client = new Client();
function terminate(): void {
    client.terminate()
        .then(() => console.log("Successfully terminated"))
        .catch(() => console.log("Could not gracefully exit process. Force closing..."))
        .finally(() => process.exit());
}
process.on("SIGTERM", terminate);
process.on("SIGINT", terminate);

export default app;
