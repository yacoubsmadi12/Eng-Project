import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import sitesRouter from "./sites";
import plansRouter from "./plans";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(sitesRouter);
router.use(plansRouter);

export default router;
