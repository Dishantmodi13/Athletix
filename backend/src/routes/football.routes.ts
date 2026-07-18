import { NextFunction, Request, Response, Router } from "express";
import {
  getFixtures,
  getFollowedMatches,
  getHeadToHead,
  getHome,
  getKnockout,
  getLeagueFixtures,
  getLeagues,
  getLive,
  getMatchDetails,
  getPlayer,
  getStandings,
  getTeam,
  getTopAssists,
  getTopScorers,
  search,
} from "../controllers/football.controller";

const router = Router();

type AsyncHandler = (req: Request, res: Response) => Promise<void>;

const wrap =
  (handler: AsyncHandler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res).catch(next);
  };

router.get("/home", wrap(getHome));
router.get("/followed-matches", wrap(getFollowedMatches));
router.get("/live", wrap(getLive));
router.get("/fixtures", wrap(getFixtures));
router.get("/fixtures/league", wrap(getLeagueFixtures));
router.get("/standings", wrap(getStandings));
router.get("/knockout", wrap(getKnockout));
router.get("/top-scorers", wrap(getTopScorers));
router.get("/top-assists", wrap(getTopAssists));
router.get("/leagues", wrap(getLeagues));
router.get("/h2h", wrap(getHeadToHead));
router.get("/search", wrap(search));
router.get("/match/:id", wrap(getMatchDetails));
router.get("/team/:id", wrap(getTeam));
router.get("/player/:id", wrap(getPlayer));

export default router;
