import { Request, Response } from "express";
import { AppError } from "../middleware/errorHandler";
import { cricketService } from "../services/cricket.service";

function requireIdParam(value: unknown, field: string): string {
  const str = String(value ?? "").trim();
  if (!str || !/^\d+$/.test(str)) {
    throw new AppError(`Invalid ${field}`, 400);
  }
  return str;
}

export async function getMatches(_req: Request, res: Response): Promise<void> {
  const data = await cricketService.getMatches();
  res.json({ success: true, data });
}

export async function getLive(_req: Request, res: Response): Promise<void> {
  const data = await cricketService.getLiveMatches();
  res.json({ success: true, data });
}

export async function getFixtures(_req: Request, res: Response): Promise<void> {
  const data = await cricketService.getFixtures();
  res.json({ success: true, data });
}

export async function getSeries(_req: Request, res: Response): Promise<void> {
  const data = await cricketService.getSeries();
  res.json({ success: true, data });
}

export async function getFeaturedSeries(_req: Request, res: Response): Promise<void> {
  const data = await cricketService.getFeaturedSeries();
  res.json({ success: true, data });
}

export async function getHome(_req: Request, res: Response): Promise<void> {
  const data = await cricketService.getHome();
  res.json({ success: true, data });
}

export async function getCompetitions(_req: Request, res: Response): Promise<void> {
  const data = await cricketService.getCompetitions();
  res.json({ success: true, data });
}

export async function getMatchDetails(req: Request, res: Response): Promise<void> {
  const leagueId = requireIdParam(req.params.leagueId, "league id");
  const eventId = requireIdParam(req.params.eventId, "match id");
  const data = await cricketService.getMatchDetails(leagueId, eventId);

  if (!data.match) {
    throw new AppError("Match not found", 404);
  }

  res.json({ success: true, data });
}
