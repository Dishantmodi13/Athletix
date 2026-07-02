import { Router } from "express";
import authRoutes from "./auth.routes";
import footballRoutes from "./football.routes";
import healthRoutes from "./health.routes";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/football", footballRoutes);

export default router;
