import { expect, test, type Page } from "@playwright/test";

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
  await page.getByTestId("nickname-input").waitFor();
  await page.getByTestId("nickname-input").fill(nickname);
  await page.getByTestId("create-room").click();
  await page.waitForURL(/\/room\//, { timeout: 15000 });
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

test("friends can play a realtime Carramba match", async ({ browser }) => {
  test.setTimeout(90_000);
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();

  const code = await createRoom(host, "Hugo");
  await joinRoom(guest, "Alex", code);

  await expect(host.getByText("Alex")).toBeVisible();
  await expect(guest.getByText("Hugo")).toBeVisible();

  await guest.getByTestId("ready-button").click();
  await expect(guest.getByRole("button", { name: "Unready" })).toBeVisible();
  await expect(host.locator("p").filter({ hasText: /^Ready$/ })).toBeVisible();
  await host.getByTestId("start-game").click();
  await host.waitForURL(/\/game\//);
  await guest.waitForURL(/\/game\//);

  await expect(host.getByTestId("player-hand").getByLabel(/of /)).toHaveCount(5);
  await expect(guest.getByTestId("player-hand").getByLabel(/of /)).toHaveCount(5);

  const hostSnap = await host.request.get(`/api/rooms/${code}`);
  const guestSnap = await guest.request.get(`/api/rooms/${code}`);
  const hostData = await hostSnap.json();
  const guestData = await guestSnap.json();
  const hugoId = hostData.viewerId as string;
  const alexId = guestData.viewerId as string;

  expect(guestData.game.players.find((p: { id: string }) => p.id === hugoId).hand).toBeNull();
  expect(hostData.game.players.find((p: { id: string }) => p.id === alexId).hand).toBeNull();

  const hugoHand = [
    card("hearts", "9", 1, 201),
    card("diamonds", "10", 1, 202),
    card("hearts", "J", 1, 203),
    card("diamonds", "Q", 1, 204),
    card("hearts", "K", 1, 205),
  ];
  const alexHand = [
    card("clubs", "4", 1, 206),
    card("spades", "5", 1, 207),
    card("clubs", "6", 1, 208),
    card("spades", "8", 1, 209),
    card("clubs", "A", 1, 210),
  ];
  const drawPile = [
    card("spades", "2", 2, 211),
    card("hearts", "3", 2, 212),
    card("clubs", "7", 2, 213),
  ];

  await host.request.post("/api/test/arrange", {
    data: {
      code,
      hands: { [hugoId]: hugoHand, [alexId]: alexHand },
      drawPile,
    },
  });

  await expect(host.getByLabel("9 of hearts")).toBeVisible();
  await expect(guest.getByLabel("9 of hearts")).toHaveCount(0);

  for (const label of [
    "9 of hearts",
    "10 of diamonds",
    "J of hearts",
    "Q of diamonds",
    "K of hearts",
  ]) {
    await host.getByTestId("player-hand").getByLabel(label).click();
  }
  await expect(host.getByTestId("play-button")).toBeEnabled();
  await host.getByTestId("play-button").click();
  await host.getByTestId("draw-button").click();
  await expect(host.getByTestId("player-hand").getByLabel(/of /)).toHaveCount(1);

  await expect(guest.getByRole("heading", { name: "Your turn" })).toBeVisible();
  await guest.getByLabel("8 of spades").click();
  await guest.getByTestId("play-button").click();
  await guest.getByLabel("10 of diamonds").click();
  await guest.getByTestId("take-button").click();
  await expect(guest.getByLabel("10 of diamonds")).toBeVisible();

  await expect(host.getByRole("heading", { name: "Your turn" })).toBeVisible();
  await host.getByTestId("caramba-button").click();
  await host.getByTestId("confirm-caramba").click();
  await expect(host.getByText("called Carramba")).toBeVisible();
  await expect(guest.getByText("called Carramba")).toBeVisible();
  await expect(host.getByLabel("8 of spades").first()).toBeVisible();
  await expect(guest.getByLabel("2 of spades").first()).toBeVisible();

  await host.getByTestId("next-round").click();
  await expect(host.getByTestId("player-hand").getByLabel(/of /)).toHaveCount(5);
  await expect(guest.getByTestId("player-hand").getByLabel(/of /)).toHaveCount(5);

  const after = await host.request.get(`/api/rooms/${code}`);
  const afterData = await after.json();
  expect(afterData.game.roundNumber).toBe(2);
  expect(afterData.game.drawPileCount + 10).toBe(104);

  await host.reload();
  await expect(host.getByTestId("player-hand").getByLabel(/of /)).toHaveCount(5);
  await expect(host.getByRole("cell", { name: "Hugo" })).toBeVisible();

  await hostContext.close();
  await guestContext.close();
});
