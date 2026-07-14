import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import workersRouter from "./workers";
import workLogsRouter from "./work-logs";
import paymentsRouter from "./payments";
import settingsRouter from "./settings";
import expensesRouter from "./expenses";
import clientsRouter from "./clients";
import invoicesRouter from "./invoices";
import jcbReportRouter from "./jcb-report";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(workersRouter);
router.use(workLogsRouter);
router.use(paymentsRouter);
router.use(settingsRouter);
router.use(expensesRouter);
router.use(clientsRouter);
router.use(invoicesRouter);
router.use(jcbReportRouter);

export default router;
