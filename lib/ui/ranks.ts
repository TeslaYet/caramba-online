export function rankTitle(rating: number): string {
  if (rating >= 1900) return "Champion";
  if (rating >= 1700) return "Diamond";
  if (rating >= 1500) return "Platinum";
  if (rating >= 1300) return "Gold";
  if (rating >= 1100) return "Silver";
  return "Bronze";
}

export function winRate(wins: number, games: number): number {
  if (games <= 0) {
    return 0;
  }
  return Math.round((wins / games) * 1000) / 10;
}
