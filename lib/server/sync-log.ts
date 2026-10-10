export function logSync(event: string, fields: Record<string, string | number>) {
  if (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test") {
    return;
  }
  console.info(JSON.stringify({ scope: "sync", event, ...fields }));
}
