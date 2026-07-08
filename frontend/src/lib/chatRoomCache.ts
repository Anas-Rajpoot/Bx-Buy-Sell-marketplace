/**
 * In-memory cache of the last-loaded chat room (with its messages + participants)
 * per conversation pair, so re-opening a conversation paints instantly from
 * cache while a fresh copy loads in the background (stale-while-revalidate).
 *
 * Lives at module scope so it survives ChatWindow unmount/remount within the
 * session. Cleared on a full page reload — that's fine, it's only a fast-path.
 */

const cache = new Map<string, any>();

const keyOf = (a: string, b: string) => [a, b].sort().join("-");

export function getCachedChatRoom(userId: string, sellerId: string): any | null {
  return cache.get(keyOf(userId, sellerId)) ?? null;
}

export function setCachedChatRoom(userId: string, sellerId: string, data: any): void {
  if (data?.id) cache.set(keyOf(userId, sellerId), data);
}

export function clearCachedChatRoom(userId: string, sellerId: string): void {
  cache.delete(keyOf(userId, sellerId));
}
