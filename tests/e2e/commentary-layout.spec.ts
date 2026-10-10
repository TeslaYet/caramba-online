import { expect, test, type Locator, type Page } from "@playwright/test";

const VIEWPORTS = [
  { name: "desktop-1920", width: 1920, height: 1080 },
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1280", width: 1280, height: 800 },
  { name: "mobile-375", width: 375, height: 812 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-430", width: 430, height: 932 },
  { name: "phone-landscape", width: 844, height: 390 },
] as const;

function card(suit: "hearts" | "clubs", rank: string, index: number) {
  return {
    id: `deck1-${suit}-${rank}-${String(index).padStart(3, "0")}`,
    rank,
    suit,
    color: suit === "hearts" ? "red" : "black",
  };
}

function overlaps(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  return a.x < b.x + b.width - 1 && a.x + a.width > b.x + 1 && a.y < b.y + b.height - 1 && a.y + a.height > b.y + 1;
}

async function box(locator: Locator) {
  const value = await locator.boundingBox();
  expect(value).toBeTruthy();
  return value!;
}

async function createRoom(page: Page, nickname: string) {
  await page.goto("/lobby/create");
  await page.getByTestId("nickname-input").fill(nickname);
  await page.getByTestId("create-room").click();
  await page.waitForURL(/\/room\//);
  const text = await page.getByText(/Room code:/).innerText();
  return text.replace("Room code:", "").trim();
}

async function joinRoom(page: Page, nickname: string, code: string) {
  await page.goto("/lobby/join");
  await page.getByTestId("nickname-input").fill(nickname);
  await page.getByTestId("code-input").fill(code);
  await page.getByTestId("join-room").click();
  await page.waitForURL(new RegExp(`/room/${code}`));
}

async function actIfTurn(page: Page, labels: string[]) {
  if (!(await page.getByRole("heading", { name: "Your turn" }).isVisible())) {
    return;
  }
  for (const label of labels) {
    await page.getByTestId("player-hand").getByLabel(label).click();
  }
  await page.getByTestId("play-button").click();
  await page.getByTestId("draw-button").click();
}

test("commentary stays off the table center on desktop and collapses on a phone", async ({ browser }) => {
  test.setTimeout(120_000);
  const hostContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const guestContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
  const code = await createRoom(host, "Hugo");
  await joinRoom(guest, "Alex", code);
  await guest.getByTestId("ready-button").click();
  await host.getByTestId("start-game").click();
  await host.waitForURL(/\/game\//);
  await guest.waitForURL(/\/game\//);
  const hostSnap = await host.request.get(`/api/rooms/${code}`);
  const guestSnap = await guest.request.get(`/api/rooms/${code}`);
  const hugoId = (await hostSnap.json()).viewerId as string;
  const alexId = (await guestSnap.json()).viewerId as string;
  await host.request.post("/api/test/arrange", {
    data: {
      code,
      hands: {
        [hugoId]: [card("hearts", "5", 1), card("hearts", "9", 2), card("clubs", "K", 3)],
        [alexId]: [card("clubs", "4", 4), card("clubs", "8", 5), card("hearts", "2", 6)],
      },
      drawPile: [card("clubs", "3", 7), card("hearts", "6", 8), card("clubs", "7", 9), card("hearts", "J", 10)],
    },
  });

  await actIfTurn(guest, ["4 of clubs"]);
  await expect(host.getByRole("heading", { name: "Your turn" })).toBeVisible();
  await actIfTurn(host, ["5 of hearts"]);
  await expect(guest.getByRole("heading", { name: "Your turn" })).toBeVisible();
  await actIfTurn(guest, ["8 of clubs"]);
  await expect(host.getByTestId("commentary").locator("li").filter({ hasText: "discarded" }).first()).toBeAttached();

  for (const viewport of VIEWPORTS) {
    await host.setViewportSize({ width: viewport.width, height: viewport.height });
    const feed = host.getByTestId("commentary");
    const deck = host.getByRole("button", { name: /Draw from deck|Draw pile/ });
    const hand = host.getByTestId("player-hand");
    const turn = host.getByTestId("turn-banner");
    await expect(feed).toBeVisible();
    await expect(feed).not.toContainText("'s turn");
    const feedBox = await box(feed);
    const deckBox = await box(deck);
    const handBox = await box(hand);
    const turnBox = await box(turn);
    expect(overlaps(feedBox, deckBox), viewport.name).toBe(false);
    expect(overlaps(feedBox, handBox), viewport.name).toBe(false);
    expect(overlaps(feedBox, turnBox), viewport.name).toBe(false);
    expect(feedBox.y + feedBox.height).toBeLessThanOrEqual(handBox.y + 1);

    if (viewport.width >= 1024) {
      await expect(feed.getByText("Recent actions")).toBeVisible();
      expect(feedBox.x + feedBox.width / 2).toBeLessThan(deckBox.x);
      const board = host.getByRole("region", { name: "Scoreboard" });
      await expect(board).toBeVisible();
      const boardBox = await box(board);
      expect(overlaps(feedBox, boardBox), viewport.name).toBe(false);
      const chat = host.getByText("Table chat");
      expect(overlaps(feedBox, await box(chat)), viewport.name).toBe(false);
      await feed.getByRole("button", { name: "View history" }).click();
      const opened = await box(feed);
      expect(overlaps(opened, deckBox), `${viewport.name} history`).toBe(false);
      expect(opened.y + opened.height).toBeLessThanOrEqual(handBox.y + 1);
      await feed.getByRole("button", { name: "Close history" }).click();
    } else {
      if (viewport.height > 520) {
        await expect(feed.getByText("Recent action", { exact: true })).toBeVisible();
      }
      await expect(feed.locator("li:visible")).toHaveCount(1);
    }
  }

  await host.setViewportSize({ width: 390, height: 844 });
  const phone = host.getByTestId("commentary");
  await phone.getByRole("button", { name: "View history" }).click();
  await expect(phone.locator("li:visible").first()).toBeVisible();
  expect(await phone.locator("li:visible").count()).toBeGreaterThan(1);
  const openBox = await box(phone);
  const handBox = await box(host.getByTestId("player-hand"));
  expect(openBox.y + openBox.height).toBeLessThanOrEqual(handBox.y + 1);
  await phone.getByRole("button", { name: "Close history" }).click();
  await expect(phone.locator("li:visible")).toHaveCount(1);

  await hostContext.close();
  await guestContext.close();
});
