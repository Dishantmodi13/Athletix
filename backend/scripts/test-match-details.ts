import { footballService } from "../src/services/football.service";

const id = Number(process.argv[2] ?? "537376");

footballService.getMatchDetails(id).then((r) => {
  console.log(
    r.match?.teams.home.name,
    "vs",
    r.match?.teams.away.name,
    "| events:",
    r.events.length,
    "stats:",
    r.statistics.length,
    "lineups:",
    r.lineups.length
  );
  r.events.filter((e) => e.type === "Goal").forEach((g) => {
    console.log(`  GOAL ${g.time.elapsed}' ${g.player.name} (${g.team.name})`);
  });
});
