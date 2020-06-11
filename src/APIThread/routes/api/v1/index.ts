import { Router } from "express";
import ohlcRouter from "./ohlc";
import symbolRouter from "./symbols";
const router = Router();

router.use("/ohlc", ohlcRouter);
router.use("/symbols", symbolRouter);

export default router;

