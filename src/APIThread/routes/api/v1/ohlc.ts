import { Router } from "express";
import data from "../../../../IPC/Data";
import channels from "../../../../IPC/Channels";
import { addNewSharedArray } from "../../../../IPC/SharedArrayFunctions";
import { OHLCEnum as OHLC } from "../../../../IPC/Data/types/OHLC";

const router = Router();

// TODO: IMPORTANT Make server and frontent request code PRISTINE. Each and every project you make is going to rely on this sould project.

type OHLCQuery = {symbol: string; interval: string; from: string}

// Url format /api/v1/ohlc?symbol=x&interval=y&from=z
router.get("/", (request, response, next) => {
    response.type("application/json");
    let { symbol, interval, from } = request.query as OHLCQuery;

    if (!(symbol && interval && from)) {
        next();
        return;
    }

    if (!channels.isReady()) {
        response.send({ status: "NOT READY" });
    } else if (!(data.ohlc[symbol] && data.ohlc[symbol][interval])) {
        addNewSharedArray({
            type: "OHLC", channels: channels.getOtherChannels(), symbol, interval,
        });
        response.send({ status: "NOT READY" });
    } else {
        let retString = "";
        const ohlc = data.ohlc[symbol][interval];
        const len = ohlc.names.length;

        const fromTime = Date.parse(from);
        let first = ohlc.reverseFindIndex((index) => ohlc.get(index, OHLC.TIME) <= fromTime);
        if (first === -1) first = 0;
        if (ohlc.get(first) < fromTime && first !== ohlc.getLast()) first = ohlc.getIndex(first + 1);

        const last = ohlc.getLast();
        if (last < first) {
            retString += `[${ohlc.floatArr.subarray(first * len, (ohlc.length + 1) * len).join(",")}`;
            retString += `,${ohlc.floatArr.subarray(0, (last + 1) * len).join(",")}]`;
        } else {
            retString += `[${data.ohlc[symbol][interval].floatArr.subarray(first * len, (last + 1) * len).join(",")}]`;
        }
        response.send(retString);
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
