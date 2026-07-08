import { NextFunction, Request, Response, Router } from "express";
import { getMe, updateMe } from "../controllers/user.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

type AsyncHandler = (req: Request, res: Response) => Promise<void>;

const wrap =
  (handler: AsyncHandler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res).catch(next);
  };

router.get("/me", requireAuth, wrap(getMe));
router.patch("/me", requireAuth, wrap(updateMe));

export default router;
