"use client";

import { Button } from "@/components/ui/button";
import { validateTeamLineup } from "@/lib/game/teams";
import type { RoomSnapshot } from "@/lib/realtime/use-room";
import { cn } from "@/lib/utils/cn";

const SIZES = [4, 6, 8] as const;

export function TeamSetup({
  snapshot,
  isHost,
  onAction,
}: {
  snapshot: RoomSnapshot;
  isHost: boolean;
  onAction: (payload: Record<string, unknown>) => Promise<unknown>;
}) {
  const format = snapshot.room.format ?? "individual";
  const teams = format === "teams";
  const seats = teams ? snapshot.room.maxPlayers : 4;
  const lineup = snapshot.players.map((player) => ({ id: player.id, teamId: player.teamId ?? null }));
  const problem = teams ? validateTeamLineup(lineup, seats) : null;
  const count = (team: "A" | "B") => snapshot.players.filter((player) => player.teamId === team).length;

  return (
    <section className="rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-4 text-left">
      <p className="text-xs uppercase tracking-[0.2em] text-gold">Table</p>
      <p className="mt-1 text-sm text-cream/70">
        Classic play is every player for themselves. Team play is a private room: a team loses only when every teammate is eliminated.
      </p>
      {isHost && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant={teams ? "secondary" : "primary"}
            onClick={() => void onAction({ type: "SET_FORMAT", format: "individual" })}
          >
            Individual
          </Button>
          <Button
            type="button"
            variant={teams ? "primary" : "secondary"}
            onClick={() => void onAction({ type: "SET_FORMAT", format: "teams", seats: 4 })}
          >
            Teams
          </Button>
        </div>
      )}
      {!isHost && (
        <p className="mt-3 text-sm">{teams ? `Team game · ${seats} seats` : "Individual game"}</p>
      )}
      {teams && (
        <div className="mt-4 space-y-3">
          {isHost && (
            <div className="flex flex-wrap gap-2">
              {SIZES.map((size) => (
                <Button
                  key={size}
                  type="button"
                  variant={seats === size ? "gold" : "secondary"}
                  onClick={() => void onAction({ type: "SET_FORMAT", format: "teams", seats: size })}
                >
                  {size / 2}v{size / 2}
                </Button>
              ))}
            </div>
          )}
          <p className="text-sm text-cream/75">
            {seats / 2}v{seats / 2} · {snapshot.players.length} of {seats} seated · Team A {count("A")} · Team B {count("B")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(["A", "B"] as const).map((team) => (
              <div key={team} className="rounded-2xl border border-white/15 bg-black/20 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">Team {team}</p>
                <ul className="mt-2 space-y-2">
                  {snapshot.players
                    .filter((player) => player.teamId === team)
                    .map((player) => (
                      <li key={player.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate">{player.nickname}</span>
                        {isHost && (
                          <button
                            type="button"
                            className="text-xs uppercase tracking-wide text-cream/70"
                            onClick={() =>
                              void onAction({
                                type: "ASSIGN_TEAM",
                                playerId: player.id,
                                teamId: team === "A" ? "B" : "A",
                              })
                            }
                          >
                            Move
                          </button>
                        )}
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
          {snapshot.players.some((player) => player.teamId !== "A" && player.teamId !== "B") && (
            <ul className="space-y-2">
              {snapshot.players
                .filter((player) => player.teamId !== "A" && player.teamId !== "B")
                .map((player) => (
                  <li key={player.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span>{player.nickname} · unassigned</span>
                    {isHost && (
                      <span className="flex gap-2">
                        <button
                          type="button"
                          className={cn("text-xs font-bold uppercase text-gold")}
                          onClick={() =>
                            void onAction({ type: "ASSIGN_TEAM", playerId: player.id, teamId: "A" })
                          }
                        >
                          Team A
                        </button>
                        <button
                          type="button"
                          className="text-xs font-bold uppercase text-gold"
                          onClick={() =>
                            void onAction({ type: "ASSIGN_TEAM", playerId: player.id, teamId: "B" })
                          }
                        >
                          Team B
                        </button>
                      </span>
                    )}
                  </li>
                ))}
            </ul>
          )}
          {isHost && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void onAction({ type: "ARRANGE_TEAMS", how: "balance" })}
              >
                Balance teams
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void onAction({ type: "ARRANGE_TEAMS", how: "random" })}
              >
                Randomize teams
              </Button>
            </div>
          )}
          {problem && <p className="text-sm text-gold">{problem}</p>}
        </div>
      )}
    </section>
  );
}
