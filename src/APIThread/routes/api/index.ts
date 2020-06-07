import { Router } from "express";
import v1Router from "./v1";
const router = Router();

router.get("/", (request, response) => {
    response.type("text/plain");
    response.end("Please request a specific version of the api (e.g. /api/v1)");
});

router.use("/v1", v1Router);

export default router;
