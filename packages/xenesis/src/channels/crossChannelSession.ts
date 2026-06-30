/**
 * Cross-channel session continuity (Sprint 10-3).
 *
 * Maps user identities across channels so a conversation started
 * in Slack can continue in Telegram with full context.
 */

export interface ChannelIdentity {
  channel: string;
  userId: string;
  displayName?: string;
}

export interface UnifiedUser {
  id: string;
  identities: ChannelIdentity[];
  lastActiveChannel: string;
  lastActiveAt: number;
}

export interface CrossChannelSessionManager {
  linkIdentity(unifiedId: string, identity: ChannelIdentity): void;
  findUnifiedUser(channel: string, userId: string): UnifiedUser | undefined;
  getOrCreateUser(channel: string, userId: string, displayName?: string): UnifiedUser;
  getSessionContext(unifiedId: string): string | undefined;
  setSessionContext(unifiedId: string, context: string): void;
  listUsers(): UnifiedUser[];
}

export function createCrossChannelSessionManager(): CrossChannelSessionManager {
  const users = new Map<string, UnifiedUser>();
  const channelIndex = new Map<string, string>();
  const sessionContexts = new Map<string, string>();
  let userSeq = 0;

  function channelKey(channel: string, userId: string): string {
    return `${channel}:${userId}`;
  }

  return {
    linkIdentity(unifiedId, identity): void {
      const user = users.get(unifiedId);
      if (!user) return;
      if (!user.identities.some((i) => i.channel === identity.channel && i.userId === identity.userId)) {
        user.identities.push(identity);
      }
      channelIndex.set(channelKey(identity.channel, identity.userId), unifiedId);
    },

    findUnifiedUser(channel, userId): UnifiedUser | undefined {
      const unifiedId = channelIndex.get(channelKey(channel, userId));
      return unifiedId ? users.get(unifiedId) : undefined;
    },

    getOrCreateUser(channel, userId, displayName): UnifiedUser {
      const existing = this.findUnifiedUser(channel, userId);
      if (existing) {
        existing.lastActiveChannel = channel;
        existing.lastActiveAt = Date.now();
        return existing;
      }

      const id = `user-${++userSeq}`;
      const user: UnifiedUser = {
        id,
        identities: [{ channel, userId, displayName }],
        lastActiveChannel: channel,
        lastActiveAt: Date.now(),
      };
      users.set(id, user);
      channelIndex.set(channelKey(channel, userId), id);
      return user;
    },

    getSessionContext(unifiedId): string | undefined {
      return sessionContexts.get(unifiedId);
    },

    setSessionContext(unifiedId, context): void {
      sessionContexts.set(unifiedId, context);
    },

    listUsers(): UnifiedUser[] {
      return Array.from(users.values());
    },
  };
}
