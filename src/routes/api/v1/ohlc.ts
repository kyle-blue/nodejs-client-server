import { Router } from "express";
import data from "../../../data";

const router = Router();

// TODO: IMPORTANT Make server and frontent request code PRISTINE. Each and every project you make is going to rely on this sould project.

type OHLCQuery = {symbol: string; interval: string}

// Url format /api/v1/ohlc?symbol=x&interval=y
router.get("/", (request, response, next) => {
    // console.log("w");
    response.type("application/json");
    let { symbol, interval } = request.query as OHLCQuery;

    if (!(symbol && interval)) {
        next();
        return;
    }
    data.emitter.emit("GET", { what: "DATA", symbols: [symbol], intervals: [interval] });

    if (!(data.ohlc[symbol] && data.ohlc[symbol][interval])) {
        response.send({});
    } else {
        response.send(data.ohlc[symbol][interval]);
    }
    response.end();
});


/** URL Format: /flags?<groupName>=x&filter=y&limit=z */
// router.get("/", async (request, response, next) => {
//     response.type("application/json");

//     let { group, limit } = request.query;

//     if (!group) {
//         next();
//         return;
//     }

//     const distinctGroups: string[] = await flags.distinct("groupName");
//     if (!distinctGroups.includes(group)) {
//         response.send({ error: { isError: true, message: `Group: "${group}" does not exist...` } });
//     } else {
//         const result = await flags.find({ groupName: group }).limit(limit);
//         response.send(result);
//     }

//     response.end();
// });

// router.put("/:id", async (request, response) => {
//     await flags.updateOne({ _id: request.params.id },
//         { $set: request.body });
//     response.type("application/json");
//     response.end("");
// });

// router.post("/add", async (request, response) => {
//     await flags.insertMany(request.body);
//     response.type("application/json");
//     response.end("");
// });

export default router;
