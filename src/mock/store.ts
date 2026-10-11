// Phase 1 stand-in for the backend. Holds fake people, requests, matches and
// messages in memory so screens can be tapped through end to end. Replaced by
// Supabase calls in Phases 2–5. Note the shapes mirror what the server will
// send: strangers carry only gender, age and a distance bucket — never a name.
import { useSyncExternalStore } from 'react';

export type Gender = 'Woman' | 'Man' | 'Non-binary';
export type DistanceBucket = 'Under 2 km' | '2–5 km' | '5–10 km' | '10+ km';

/** An anonymous card from `nearby()`: opaque id, gender, age, bucket, active flag. */
export type Stranger = { id: string; gender: Gender; age: number; bucket: DistanceBucket; active: boolean };

export type IncomingRequest = { id: string; from: Stranger; hoursLeft: number };
export type SentRequest = { id: string; to: Stranger; hoursLeft: number };

/** Only exists after both said yes — the first point a name is visible. */
export type Match = { id: string; firstName: string; age: number; bucket: DistanceBucket; matchedLabel: string };
export type Message = { id: string; fromMe: boolean; body: string };

type State = {
  me: { firstName: string; age: number; gender: Gender };
  requestsLeft: number;
  nearby: Stranger[];
  received: IncomingRequest[];
  sent: SentRequest[];
  matches: Match[];
  messages: Record<string, Message[]>;
  checkInOn: boolean;
};

const DAILY_LIMIT = 10;

let state: State = {
  me: { firstName: 'Aarav', age: 27, gender: 'Man' },
  requestsLeft: 7,
  nearby: [
    { id: 'p1', gender: 'Woman', age: 26, bucket: 'Under 2 km', active: true },
    { id: 'p2', gender: 'Woman', age: 31, bucket: 'Under 2 km', active: false },
    { id: 'p3', gender: 'Woman', age: 24, bucket: 'Under 2 km', active: true },
    { id: 'p4', gender: 'Woman', age: 29, bucket: 'Under 2 km', active: false },
    { id: 'p5', gender: 'Woman', age: 27, bucket: 'Under 2 km', active: true },
    { id: 'p6', gender: 'Woman', age: 33, bucket: 'Under 2 km', active: false },
    { id: 'p7', gender: 'Woman', age: 25, bucket: '2–5 km', active: true },
    { id: 'p8', gender: 'Woman', age: 30, bucket: '2–5 km', active: false },
    { id: 'p9', gender: 'Woman', age: 28, bucket: '5–10 km', active: false },
  ],
  received: [
    { id: 'r1', from: { id: 'q1', gender: 'Man', age: 28, bucket: '2–5 km', active: false }, hoursLeft: 18 },
    { id: 'r2', from: { id: 'q2', gender: 'Man', age: 30, bucket: 'Under 2 km', active: true }, hoursLeft: 6 },
  ],
  sent: [
    { id: 's1', to: { id: 'q3', gender: 'Woman', age: 25, bucket: '2–5 km', active: false }, hoursLeft: 21 },
    { id: 's2', to: { id: 'q4', gender: 'Woman', age: 29, bucket: 'Under 2 km', active: true }, hoursLeft: 9 },
    { id: 's3', to: { id: 'q5', gender: 'Woman', age: 32, bucket: '5–10 km', active: false }, hoursLeft: 2 },
  ],
  matches: [{ id: 'm1', firstName: 'Riya', age: 24, bucket: 'Under 2 km', matchedLabel: 'Matched today' }],
  messages: {
    m1: [
      { id: 'x1', fromMe: true, body: 'Hey! Really glad this was mutual.' },
      { id: 'x2', fromMe: false, body: 'Me too. Coffee first?' },
      { id: 'x3', fromMe: true, body: 'Perfect. The café by the park at 6?' },
      { id: 'x4', fromMe: false, body: 'Deal. See you there.' },
    ],
  },
  checkInOn: false,
};

const listeners = new Set<() => void>();
function set(update: (s: State) => Partial<State>) {
  state = { ...state, ...update(state) };
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useMock<T>(select: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => select(state));
}

const mockNames = ['Meera', 'Ishaan', 'Kabir', 'Ananya', 'Zoya', 'Vikram'];

export const mock = {
  dailyLimit: DAILY_LIMIT,
  stranger: (id: string) => state.nearby.find((p) => p.id === id),

  sendRequest(strangerId: string) {
    const to = state.nearby.find((p) => p.id === strangerId);
    if (!to || state.requestsLeft <= 0) return;
    set((s) => ({
      requestsLeft: s.requestsLeft - 1,
      nearby: s.nearby.filter((p) => p.id !== strangerId),
      sent: [{ id: `s-${strangerId}`, to, hoursLeft: 24 }, ...s.sent],
    }));
  },

  /** Ignoring just removes it here; the sender keeps seeing "pending" until it expires. */
  ignoreRequest(requestId: string) {
    set((s) => ({ received: s.received.filter((r) => r.id !== requestId) }));
  },

  /** Returns the new match id. The real server reveals the name only at this point. */
  acceptRequest(requestId: string): string | undefined {
    const req = state.received.find((r) => r.id === requestId);
    if (!req) return;
    const id = `m-${requestId}`;
    const firstName = mockNames[state.matches.length % mockNames.length];
    set((s) => ({
      received: s.received.filter((r) => r.id !== requestId),
      matches: [{ id, firstName, age: req.from.age, bucket: req.from.bucket, matchedLabel: 'Matched just now' }, ...s.matches],
      messages: { ...s.messages, [id]: [] },
    }));
    return id;
  },

  sendMessage(matchId: string, body: string) {
    set((s) => ({
      messages: { ...s.messages, [matchId]: [...(s.messages[matchId] ?? []), { id: `${Date.now()}`, fromMe: true, body }] },
    }));
  },

  /** Unmatch and block both remove the match and its chat from view. */
  removeMatch(matchId: string) {
    set((s) => ({ matches: s.matches.filter((m) => m.id !== matchId) }));
  },

  setCheckIn(on: boolean) {
    set(() => ({ checkInOn: on }));
  },
};
