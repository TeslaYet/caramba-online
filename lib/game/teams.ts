import type { TeamId } from "./types";

export const TEAM_TABLE_SIZES = [4, 6, 8] as const;
export type TeamTableSize = (typeof TEAM_TABLE_SIZES)[number];

export function isTeamTableSize(value: number): value is TeamTableSize {
  return (TEAM_TABLE_SIZES as readonly number[]).includes(value);
}

export function validateTeamLineup(
  players: Array<{ id: string; teamId?: TeamId | null }>,
  seats: number,
): string | null {
  if (!isTeamTableSize(seats)) {
    return "Team games need 4, 6, or 8 players.";
  }
  if (players.length !== seats) {
    return `This team game needs exactly ${seats} players. ${players.length} ${players.length === 1 ? "is" : "are"} here.`;
  }
  if (players.length % 2 !== 0) {
    return "Team games need an even number of players.";
  }
  const seen = new Set<string>();
  let teamA = 0;
  let teamB = 0;
  for (const player of players) {
    if (seen.has(player.id)) {
      return "A player cannot be assigned to both teams.";
    }
    seen.add(player.id);
    if (player.teamId === "A") {
      teamA += 1;
    } else if (player.teamId === "B") {
      teamB += 1;
    } else {
      return "Every player needs a team before the game can start.";
    }
  }
  if (teamA !== teamB) {
    return `Teams must be the same size. Team A has ${teamA} and Team B has ${teamB}.`;
  }
  return null;
}

export function assignTeams<T extends { id: string }>(
  players: T[],
): Map<string, TeamId> {
  const assignments = new Map<string, TeamId>();
  const half = Math.ceil(players.length / 2);
  players.forEach((player, index) => {
    assignments.set(player.id, index < half ? "A" : "B");
  });
  return assignments;
}

export function balanceTeams<T extends { id: string; seatIndex: number }>(players: T[]) {
  const ordered = [...players].sort(
    (a, b) => a.seatIndex - b.seatIndex || a.id.localeCompare(b.id),
  );
  return assignTeams(ordered);
}

export function randomizeTeams<T extends { id: string }>(
  players: T[],
  randomInt: (maxExclusive: number) => number,
) {
  const ordered = [...players];
  for (let index = ordered.length - 1; index > 0; index -= 1) {
    const swap = randomInt(index + 1);
    const current = ordered[index]!;
    ordered[index] = ordered[swap]!;
    ordered[swap] = current;
  }
  return assignTeams(ordered);
}
