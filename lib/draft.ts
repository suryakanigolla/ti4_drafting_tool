import { FACTIONS } from "@/data/factions";
import { Faction, ModeConfig, Player } from "@/types/draft";

export function getFactionPool(mode: ModeConfig): Faction[] {
  if (!mode.includeBase) {
    throw new Error("Base game must be included.");
  }

  const enabled = new Set<string>(["base"]);
  if (mode.includePok) enabled.add("pok");
  if (mode.includeCodex1) enabled.add("codex1");
  if (mode.includeCodex2) enabled.add("codex2");

  return FACTIONS.filter((faction) => enabled.has(faction.source));
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function assignDraftOptions(players: Player[], pool: Faction[]) {
  const required = players.length * 2;
  if (pool.length < required) {
    throw new Error(`Not enough factions for draft: need ${required}, got ${pool.length}.`);
  }

  const shuffled = shuffle(pool);
  const optionsByPlayer: Record<string, Faction[]> = {};

  players.forEach((player, index) => {
    optionsByPlayer[player.id] = [shuffled[index * 2], shuffled[index * 2 + 1]];
  });

  return optionsByPlayer;
}
