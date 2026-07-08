import { Router } from "express";
import authRoutes from "./auth.routes";
import footballRoutes from "./football.routes";
import healthRoutes from "./health.routes";
import userRoutes from "./user.routes";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/football", footballRoutes);

export default router;
