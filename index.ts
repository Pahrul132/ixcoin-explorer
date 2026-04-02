import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import ixcoinRouter from "./ixcoin.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/ixcoin", ixcoinRouter);

export default router;
