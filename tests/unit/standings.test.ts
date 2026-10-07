import { describe, expect, it } from "vitest";
import { deriveStandings, placeLabel } from "@/lib/ui/standings";

function player(
  id: string,
  score: number,
  extras?: { eliminated?: boolean; seatIndex?: number; roundScore?: number | null },
) {
  return {
    id,
    nickname: id,
    seatIndex: extras?.seatIndex ?? 0,
    score,
    roundScore: extras?.roundScore ?? null,
    eliminated: extras?.eliminated ?? false,
  };
}

describe("lowest score ranks first", () => {
  it("ranks 12 ahead of 34 ahead of 57", () => {
    const rows = deriveStandings(
      [player("C", 57, { seatIndex: 2 }), player("A", 12, { seatIndex: 0 }), player("B", 34, { seatIndex: 1 })],
      null,
    );
    expect(rows.map((row) => [row.playerId, row.rank, row.medal])).toEqual([
      ["A", 1, "gold"],
      ["B", 2, "silver"],
      ["C", 3, "bronze"],
    ]);
  });

  it("does not treat a higher score as a better rank", () => {
    const rows = deriveStandings(
      [player("high", 90), player("low", 4, { seatIndex: 1 })],
      null,
    );
    expect(rows[0]?.playerId).toBe("low");
    expect(rows[0]?.rank).toBeLessThan(rows[1]?.rank ?? 0);
  });

  it("shares a medal when cumulative scores are equal", () => {
    const rows = deriveStandings(
      [
        player("Alex", 51, { seatIndex: 2 }),
        player("Tesla", 30, { seatIndex: 1 }),
        player("Rayane", 30, { seatIndex: 0 }),
      ],
      null,
    );
    expect(rows.map((row) => [row.nickname, row.rank, row.medal, row.tied])).toEqual([
      ["Rayane", 1, "gold", true],
      ["Tesla", 1, "gold", true],
      ["Alex", 3, "bronze", false],
    ]);
  });

  it("keeps eliminated players visible behind active players", () => {
    const rows = deriveStandings(
      [
        player("Sarah", 10, { eliminated: true, seatIndex: 3 }),
        player("Alex", 79, { seatIndex: 2 }),
        player("Tesla", 72, { seatIndex: 1 }),
        player("Rayane", 61, { seatIndex: 0 }),
      ],
      null,
    );
    expect(rows.map((row) => [row.nickname, row.rank, row.status])).toEqual([
      ["Rayane", 1, "PLAYING"],
      ["Tesla", 2, "PLAYING"],
      ["Alex", 3, "PLAYING"],
      ["Sarah", 4, "ELIMINATED"],
    ]);
    expect(rows[3]?.medal).toBeNull();
  });

  it("marks the authoritative winner without resorting the table", () => {
    const rows = deriveStandings(
      [player("Tesla", 40, { eliminated: true, seatIndex: 1 }), player("Rayane", 18, { seatIndex: 0 })],
      "Rayane",
    );
    expect(rows[0]).toMatchObject({ nickname: "Rayane", status: "WINNER", medal: "gold" });
    expect(rows[1]).toMatchObject({ nickname: "Tesla", status: "ELIMINATED", medal: "silver" });
  });

  it("names the first three places for screen readers", () => {
    expect(placeLabel(1)).toBe("First place");
    expect(placeLabel(2)).toBe("Second place");
    expect(placeLabel(3)).toBe("Third place");
    expect(placeLabel(4)).toBe("Place 4");
  });
});
