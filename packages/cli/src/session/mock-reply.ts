export const MOCK_REPLY_DELAY_MS = 700;
export const REPLY_ERROR_TEXT = "No se pudo obtener la respuesta";

export type MockReply = (text: string) => Promise<string>;

export function isReplyError(text: string): boolean {
  return text.trim().toLowerCase() === "error";
}

export function resolveMockReply(text: string): string {
  if (isReplyError(text)) {
    throw new Error(REPLY_ERROR_TEXT);
  }
  return text;
}

const defaultMockReply: MockReply = async (text) => {
  await new Promise((resolve) => setTimeout(resolve, MOCK_REPLY_DELAY_MS));
  return resolveMockReply(text);
};

let current: MockReply = defaultMockReply;

export function mockReply(text: string): Promise<string> {
  return current(text);
}

export function setMockReply(next: MockReply): void {
  current = next;
}

export function resetMockReply(): void {
  current = defaultMockReply;
}
