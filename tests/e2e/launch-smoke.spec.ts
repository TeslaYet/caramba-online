import { expect, test, type Browser, type Page } from "@playwright/test";

const VIEWPORTS = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1280", width: 1280, height: 800 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "tablet-820", width: 820, height: 1180 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-375", width: 375, height: 812 },
  { name: "mobile-430", width: 430, height: 932 },
  { name: "phone-landscape", width: 844, height: 390 },
] as const;

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

test("legal pages and consent stay off the network trackers", async ({ page }) => {
  const thirdParty: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("googlesyndication") || url.includes("stripe.com") || url.includes("doubleclick")) {
      thirdParty.push(url);
    }
  });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Refuse advertising" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Accept advertising" })).toBeVisible();
  const refuse = await page.getByRole("button", { name: "Refuse advertising" }).boundingBox();
  const accept = await page.getByRole("button", { name: "Accept advertising" }).boundingBox();
  expect(refuse && accept && Math.abs(refuse.height - accept.height) < 2).toBeTruthy();
  await page.getByRole("button", { name: "Refuse advertising" }).click();
  await page.goto("/legal/privacy");
  await expect(page.getByRole("heading", { name: "Privacy policy" })).toBeVisible();
  await expect(page.getByText("[LEGAL BUSINESS NAME]")).toBeVisible();
  await page.goto("/legal/mentions");
  await expect(page.getByRole("heading", { name: "Legal notice" })).toBeVisible();
  await page.goto("/premium");
  await page.getByRole("button", { name: "Subscribe" }).click();
  await expect(page.getByText("Sign in before subscribing.")).toBeVisible();
  expect(thirdParty).toEqual([]);
});

test("home controls stay clear of the consent banner", async ({ page }) => {
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");
    const banner = page.getByRole("dialog", { name: "Cookies" });
    await expect(banner).toBeVisible();
    const bannerBox = await banner.boundingBox();
    const play = page.getByRole("link", { name: "Play With Friends" });
    const playBox = await play.boundingBox();
    expect(bannerBox && playBox && playBox.y + playBox.height <= bannerBox.y + 1, viewport.name).toBeTruthy();
  }
});

test("a phone table has cards and no legal footer", async ({ browser }) => {
  test.setTimeout(90_000);
  const hostContext = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
  const code = await createRoom(host, "Hugo");
  await joinRoom(guest, "Alex", code);
  await guest.getByTestId("ready-button").click();
  await host.getByTestId("start-game").click();
  await host.waitForURL(/\/game\//);
  await expect(host.getByTestId("player-hand").getByLabel(/of /)).toHaveCount(5);
  await expect(host.getByText("Legal pages are drafts")).toHaveCount(0);
  await expect(host.getByRole("dialog", { name: "Cookies" })).toHaveCount(0);
  await expect(host.getByText("Advertisement")).toHaveCount(0);
  const hand = await host.getByTestId("player-hand").boundingBox();
  expect(hand && hand.y + hand.height <= 844).toBeTruthy();
  await hostContext.close();
  await guestContext.close();
});

async function fillTable(browser: Browser, count: number) {
  const contexts = [];
  const pages: Page[] = [];
  for (let index = 0; index < count; index += 1) {
    const context = await browser.newContext();
    contexts.push(context);
    pages.push(await context.newPage());
  }
  const host = pages[0]!;
  const code = await createRoom(host, "P1");
  for (let index = 1; index < count; index += 1) {
    await joinRoom(pages[index]!, `P${index + 1}`, code);
    await pages[index]!.getByTestId("ready-button").click();
  }
  await expect(host.getByTestId("start-game")).toBeEnabled();
  await host.getByTestId("start-game").click();
  await host.waitForURL(/\/game\//);
  const snap = await host.request.get(`/api/rooms/${code}`);
  const data = await snap.json();
  expect(data.players).toHaveLength(count);
  expect(data.game.players).toHaveLength(count);
  const seats = data.game.players.map((player: { seatIndex: number }) => player.seatIndex);
  expect(new Set(seats).size).toBe(count);
  expect(data.game.players.every((player: { cardCount: number; hand: unknown }) => player.cardCount === 5)).toBe(true);
  const hidden = data.game.players.filter((player: { id: string; hand: unknown }) => player.id !== data.viewerId && player.hand === null);
  expect(hidden).toHaveLength(count - 1);
  for (const context of contexts) {
    await context.close();
  }
}

test("four and eight players get distinct seats and hidden hands", async ({ browser }) => {
  test.setTimeout(120_000);
  await fillTable(browser, 4);
  await fillTable(browser, 8);
});
