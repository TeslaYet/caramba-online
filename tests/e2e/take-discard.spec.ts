import { expect, test, type Browser, type Page } from "@playwright/test";

function card(
  suit: "hearts" | "diamonds" | "clubs" | "spades",
  rank: string,
  deck: 1 | 2,
  index: number,
) {
  return {
    id: `deck${deck}-${suit}-${rank}-${String(index).padStart(3, "0")}`,
    rank,
    suit,
    color: suit === "hearts" || suit === "diamonds" ? "red" : "black",
  };
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

async function openMatch(browser: Browser, viewport: { width: number; height: number }) {
  const hostContext = await browser.newContext({ viewport });
  const guestContext = await browser.newContext({ viewport, hasTouch: viewport.width < 500 });
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
  const hostData = await hostSnap.json();
  const guestData = await guestSnap.json();
  return {
    host,
    guest,
    code,
    hugoId: hostData.viewerId as string,
    alexId: guestData.viewerId as string,
    close: async () => {
      await hostContext.close();
      await guestContext.close();
    },
  };
}

test("a click takes the exact discard card on desktop and a tap does on mobile", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 390, height: 844 },
  ]) {
    const match = await openMatch(browser, viewport);
    const sequence = [
      card("hearts", "5", 1, 301),
      card("hearts", "6", 1, 302),
      card("hearts", "7", 1, 303),
    ];
    const hugoHand = [
      ...sequence,
      card("diamonds", "9", 1, 304),
      card("clubs", "K", 1, 305),
    ];
    const alexHand = [
      card("clubs", "4", 1, 306),
      card("spades", "8", 1, 307),
      card("clubs", "2", 1, 308),
      card("spades", "3", 1, 309),
      card("diamonds", "A", 1, 310),
    ];
    await match.host.request.post("/api/test/arrange", {
      data: {
        code: match.code,
        hands: { [match.hugoId]: hugoHand, [match.alexId]: alexHand },
        drawPile: [card("spades", "2", 2, 311), card("hearts", "3", 2, 312)],
      },
    });

    if (await match.guest.getByRole("heading", { name: "Your turn" }).isVisible()) {
      await match.guest.getByLabel("4 of clubs").click();
      await match.guest.getByTestId("play-button").click();
      await match.guest.getByTestId("draw-button").click();
    }
    await expect(match.host.getByRole("heading", { name: "Your turn" })).toBeVisible();
    for (const label of ["5 of hearts", "6 of hearts", "7 of hearts"]) {
      await match.host.getByTestId("player-hand").getByLabel(label).click();
    }
    await match.host.getByTestId("play-button").click();
    await match.host.getByTestId("draw-button").click();

    await expect(match.guest.getByRole("heading", { name: "Your turn" })).toBeVisible();
    await match.guest.getByLabel("8 of spades").click();
    await match.guest.getByTestId("play-button").click();
    const six = match.guest.getByRole("button", { name: "Take 6 of hearts from discard" });
    await expect(six).toBeVisible();
    await six.click({ clickCount: 2 });
    await expect(match.guest.getByTestId("player-hand").getByLabel("6 of hearts")).toBeVisible();
    await expect(match.guest.getByTestId("player-hand").getByLabel("5 of hearts")).toHaveCount(0);
    await expect(match.guest.getByTestId("player-hand").getByLabel("7 of hearts")).toHaveCount(0);
    await expect(match.host.getByRole("heading", { name: "Your turn" })).toBeVisible();
    await match.close();
  }
});

test("Take Discard takes the only card and does not choose among several", async ({ browser }) => {
  test.setTimeout(90_000);
  const match = await openMatch(browser, { width: 1280, height: 800 });
  const hugoHand = [
    card("hearts", "5", 1, 401),
    card("diamonds", "9", 1, 404),
    card("clubs", "K", 1, 405),
    card("spades", "Q", 1, 406),
    card("clubs", "J", 1, 407),
  ];
  const alexHand = [
    card("clubs", "4", 1, 408),
    card("spades", "8", 1, 409),
    card("clubs", "2", 1, 410),
    card("spades", "3", 1, 411),
    card("diamonds", "A", 1, 412),
  ];
  await match.host.request.post("/api/test/arrange", {
    data: {
      code: match.code,
      hands: { [match.hugoId]: hugoHand, [match.alexId]: alexHand },
      drawPile: [card("spades", "2", 2, 413)],
    },
  });
  if (await match.guest.getByRole("heading", { name: "Your turn" }).isVisible()) {
    await match.guest.getByLabel("4 of clubs").click();
    await match.guest.getByTestId("play-button").click();
    await match.guest.getByTestId("draw-button").click();
  }
  await expect(match.host.getByRole("heading", { name: "Your turn" })).toBeVisible();
  await match.host.getByTestId("player-hand").getByLabel("5 of hearts").click();
  await match.host.getByTestId("play-button").click();
  await match.host.getByTestId("draw-button").click();
  await expect(match.guest.getByRole("heading", { name: "Your turn" })).toBeVisible();
  await match.guest.getByLabel("8 of spades").click();
  await match.guest.getByTestId("play-button").click();
  await match.guest.getByTestId("take-discard-button").click();
  await expect(match.guest.getByTestId("player-hand").getByLabel("5 of hearts")).toBeVisible();
  await expect(match.host.getByRole("heading", { name: "Your turn" })).toBeVisible();
  await match.close();
});
