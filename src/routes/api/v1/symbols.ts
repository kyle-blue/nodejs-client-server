import { Router } from "express";
import data from "../../../data";
const router = Router();


// Get ALL symbols
router.get("/", async (request, response, next) => {
    response.type("application/json");

    const symbols = Object.keys(data.ticks);

    response.send(symbols);
});

export default router;
