import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import filesRouter from "./files";
import processesRouter from "./processes";
import terminalRouter from "./terminal";
import aiRouter from "./ai";
import subdomainsRouter from "./subdomains";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(dashboardRouter);
router.use(filesRouter);
router.use(processesRouter);
router.use(terminalRouter);
router.use(aiRouter);
router.use(subdomainsRouter);
router.use(settingsRouter);

export default router;
