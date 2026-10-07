"use client";

import { SCORE_PRESETS } from "@/lib/game/score-settings";

export function ScoreFields({
  maxScore,
  resetScore,
  onMaxScore,
  onResetScore,
}: {
  maxScore: number;
  resetScore: number;
  onMaxScore: (value: number) => void;
  onResetScore: (value: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="block text-sm">
        Maximum score
        <select
          value={SCORE_PRESETS.includes(maxScore as (typeof SCORE_PRESETS)[number]) ? maxScore : "custom"}
          onChange={(event) => {
            if (event.target.value === "custom") {
              return;
            }
            const next = Number(event.target.value);
            onMaxScore(next);
            if (resetScore >= next) {
              onResetScore(Math.max(1, Math.floor(next / 2)));
            }
          }}
          className="focus-ring mt-2 w-full rounded-2xl border border-[var(--line)] bg-black/20 px-3 py-3"
          data-testid="max-score"
        >
          {SCORE_PRESETS.map((preset) => (
            <option key={preset} value={preset}>
              {preset}
            </option>
          ))}
          <option value="custom">Custom</option>
        </select>
      </label>
      <label className="block text-sm">
        Reset score
        <input
          type="number"
          min={1}
          max={maxScore - 1}
          value={resetScore}
          onChange={(event) => onResetScore(Number(event.target.value))}
          className="focus-ring mt-2 w-full rounded-2xl border border-[var(--line)] bg-black/20 px-3 py-3"
          data-testid="reset-score"
        />
      </label>
      {!SCORE_PRESETS.includes(maxScore as (typeof SCORE_PRESETS)[number]) && (
        <label className="col-span-2 block text-sm">
          Custom maximum
          <input
            type="number"
            min={20}
            max={500}
            value={maxScore}
            onChange={(event) => onMaxScore(Number(event.target.value))}
            className="focus-ring mt-2 w-full rounded-2xl border border-[var(--line)] bg-black/20 px-3 py-3"
          />
        </label>
      )}
    </div>
  );
}
