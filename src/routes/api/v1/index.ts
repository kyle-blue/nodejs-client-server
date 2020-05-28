import { Router } from "express";
import mongoose from "mongoose";
import flagRouter from "./flags";
const router = Router();

const MONGO_IP = "mongodb"; //docker-compose adds service link as ip in hosts
const MONGO_PORT = "27017";
const DB_URL = `mongodb://${MONGO_IP}:${MONGO_PORT}`;
// mongoose.connect(`${DB_URL}/bitmemo`, { useNewUrlParser: true, useUnifiedTopology: true });

router.use("/flags", flagRouter);

export default router;

