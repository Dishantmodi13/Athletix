import { Request, Response } from "express";
import { AppError } from "../middleware/errorHandler";
import { footballService } from "../services/football.service";
import { resolveFootballSeason } from "../utils/footballSeason";
import { parseFollowedTeamsQuery } from "../utils/followedTeams";

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function toInt(value: unknown, field: string): number {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new AppError(`Invalid ${field}`, 400);
  }
  return num;
}

export async function getLive(_req: Request, res: Response): Promise<void> {
  const data = await footballService.getLiveMatches();
  res.json({ success: true, data });
}

export async function getHome(req: Request, res: Response): Promise<void> {
  const league = req.query.league ? toInt(req.query.league, "league") : undefined;
  const data = await footballService.getHomeDashboard(league);
  res.json({ success: true, data });
}

export async function getFollowedMatches(req: Request, res: Response): Promise<void> {
  const teams = parseFollowedTeamsQuery(
    typeof req.query.teams === "string" ? req.query.teams : undefined
  );
  const data = await footballService.getFollowedTeamMatches(teams);
  res.json({ success: true, data });
}

export async function getFixtures(req: Request, res: Response): Promise<void> {
  const date = (req.query.date as string) || todayISO();
  const data = await footballService.getFixturesByDate(date);
  res.json({ success: true, data });
}

export async function getLeagueFixtures(req: Request, res: Response): Promise<void> {
  const league = toInt(req.query.league, "league");
  const season = req.query.season
    ? toInt(req.query.season, "season")
    : resolveFootballSeason(undefined, league);

  const rangeParam = req.query.range as string | undefined;
  let range: "upcoming" | "recent" | "mixed" = "mixed";
  if (rangeParam === "upcoming") {
    range = "upcoming";
  } else if (rangeParam === "recent" || req.query.last !== undefined) {
    range = "recent";
  }

  const limit = toInt(req.query.next ?? req.query.last ?? 10, "limit");
  const data = await footballService.getFixturesByLeague(league, season, limit, range);
  res.json({ success: true, data });
}

export async function getStandings(req: Request, res: Response): Promise<void> {
  const league = toInt(req.query.league, "league");
  const season = req.query.season
    ? toInt(req.query.season, "season")
    : resolveFootballSeason(undefined, league);
  const data = await footballService.getStandings(league, season);
  res.json({ success: true, data });
}

export async function getTopScorers(req: Request, res: Response): Promise<void> {
  const league = toInt(req.query.league, "league");
  const season = req.query.season
    ? toInt(req.query.season, "season")
    : resolveFootballSeason(undefined, league);
  const data = await footballService.getTopScorers(league, season);
  res.json({ success: true, data });
}

export async function getTopAssists(req: Request, res: Response): Promise<void> {
  const league = toInt(req.query.league, "league");
  const season = req.query.season
    ? toInt(req.query.season, "season")
    : resolveFootballSeason(undefined, league);
  const data = await footballService.getTopAssists(league, season);
  res.json({ success: true, data });
}

export async function getLeagues(_req: Request, res: Response): Promise<void> {
  const data = await footballService.getLeagues();
  res.json({ success: true, data });
}

export async function getMatchDetails(req: Request, res: Response): Promise<void> {
  const id = toInt(req.params.id, "fixture id");
  const data = await footballService.getMatchDetails(id);
  res.json({ success: true, data });
}

export async function getHeadToHead(req: Request, res: Response): Promise<void> {
  const home = toInt(req.query.home, "home team");
  const away = toInt(req.query.away, "away team");
  const data = await footballService.getHeadToHead(home, away);
  res.json({ success: true, data });
}

export async function getTeam(req: Request, res: Response): Promise<void> {
  const id = toInt(req.params.id, "team id");
  const season = req.query.season
    ? toInt(req.query.season, "season")
    : resolveFootballSeason();
  const name = typeof req.query.name === "string" ? req.query.name.trim() : undefined;
  const data = await footballService.getTeamPage(id, season, name);
  res.json({ success: true, data });
}

export async function getPlayer(req: Request, res: Response): Promise<void> {
  const id = toInt(req.params.id, "player id");
  const season = req.query.season
    ? toInt(req.query.season, "season")
    : resolveFootballSeason();
  const name = typeof req.query.name === "string" ? req.query.name.trim() : undefined;
  const data = await footballService.getPlayer(id, season, name);
  res.json({ success: true, data });
}

export async function getKnockout(req: Request, res: Response): Promise<void> {
  const league = toInt(req.query.league, "league");
  const season = req.query.season
    ? toInt(req.query.season, "season")
    : resolveFootballSeason(undefined, league);
  const data = await footballService.getKnockoutBracket(league, season);
  res.json({ success: true, data });
}

export async function search(req: Request, res: Response): Promise<void> {
  const query = (req.query.q as string)?.trim();
  if (!query || query.length < 3) {
    throw new AppError("Search query must be at least 3 characters", 400);
  }
  const data = await footballService.search(query);
  res.json({ success: true, data });
}

export const footballMeta = { resolveFootballSeason, todayISO };
