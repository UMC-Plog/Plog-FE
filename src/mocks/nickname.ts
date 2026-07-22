const TAKEN_NICKNAMES = new Set(["무니", "곰곰", "포도", "plog", "admin", "test"]);

export async function mockCheckNickname(nickname: string) {
  await new Promise((resolve) => setTimeout(resolve, 450));
  return !TAKEN_NICKNAMES.has(nickname.trim().toLowerCase());
}
