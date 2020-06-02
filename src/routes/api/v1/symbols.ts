import { Router } from "express";
import data from "../../../data";
const router = Router();


// Get ALL symbols
router.get("/", async (request, response, next) => {
    response.type("application/json");
    await data.emitter.await("GET", { what: "DATA" })
        .catch(() => console.log("GET DATA emitter call timed out after 3 seconds"));

    const symbols = Object.keys(data.ticks);

    response.send(symbols);
});

export default router;
