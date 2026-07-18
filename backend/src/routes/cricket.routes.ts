import { NextFunction, Request, Response, Router } from "express";
import {
  getCompetitions,
  getFeaturedSeries,
  getFixtures,
  getHome,
  getLive,
  getMatchDetails,
  getMatches,
  getSeries,
} from "../controllers/cricket.controller";

const router = Router();

type AsyncHandler = (req: Request, res: Response) => Promise<void>;

const wrap =
  (handler: AsyncHandler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res).catch(next);
  };

router.get("/home", wrap(getHome));
router.get("/matches", wrap(getMatches));
router.get("/live", wrap(getLive));
router.get("/fixtures", wrap(getFixtures));
router.get("/series", wrap(getSeries));
router.get("/series/featured", wrap(getFeaturedSeries));
router.get("/competitions", wrap(getCompetitions));
router.get("/match/:leagueId/:eventId", wrap(getMatchDetails));

export default router;
