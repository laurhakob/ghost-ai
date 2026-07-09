// Define Liveblocks types for your application
// https://liveblocks.io/docs/api-reference/liveblocks-react#Typing-your-data
import type { GhostAiState } from "@/types/ai";
import type { AiChatMessage, AiStatusMessage } from "@/types/tasks";

declare global {
  interface Liveblocks {
    // Each user's Presence, for useMyPresence, useOthers, etc.
    Presence: {
      // Live cursor position on the canvas, or null when off-canvas.
      cursor: { x: number; y: number } | null;
      // Whether this user is currently prompting the AI assistant.
      thinking: boolean;
    };

    // The Storage tree for the room, for useMutation, useStorage, etc.
    // Note: the collaborative nodes/edges are managed by @liveblocks/react-flow
    // under its own storage key; we only declare the AI agent's shared state.
    Storage: {
      // Design agent presence + status feed, published by the background task
      // and read by every participant. Absent until the agent first runs;
      // optional so rooms need no `initialStorage`.
      ai?: GhostAiState | null;
      // Shared AI status feed ("ai-status-feed"): a rolling list of status
      // messages published by AI tasks and read by every participant. Optional
      // (absent until the first message) so rooms still need no `initialStorage`.
      "ai-status-feed"?: AiStatusMessage[] | null;
      // Shared room chat feed ("ai-chat"): a separate, chat-only list of
      // human messages, kept distinct from the AI status feed above. Optional
      // (absent until the first message) so rooms still need no `initialStorage`.
      "ai-chat"?: AiChatMessage[] | null;
    };

    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string;
      info: {
        // Display name shown on cursors, avatar stacks, etc.
        name: string;
        // Avatar image URL.
        avatar: string;
        // Deterministic cursor color derived from the user ID.
        color: string;
      };
    };

    // Custom events, for useBroadcastEvent, useEventListener
    RoomEvent: {};
      // Example has two events, using a union
      // | { type: "PLAY" } 
      // | { type: "REACTION"; emoji: "🔥" };

    // Custom metadata set on threads, for useThreads, useCreateThread, etc.
    ThreadMetadata: {
      // Example, attaching coordinates to a thread
      // x: number;
      // y: number;
    };

    // Custom room info set with resolveRoomsInfo, for useRoomInfo
    RoomInfo: {
      // Example, rooms with a title and url
      // title: string;
      // url: string;
    };
  }
}

export {};
