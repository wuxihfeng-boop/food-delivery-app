"use client";

import { User } from "@/types";

const TOKEN_KEY = "food-delivery-token";
const USER_KEY = "food-delivery-user";
export const SESSION_EVENT = "food-delivery-session-changed";

export type StoredSession = {
  token: string | null;
  user: User | null;
};

function parseUser(raw: string | null): User | null {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function readSession(): StoredSession {
  if (typeof window === "undefined") {
    return { token: null, user: null };
  }

  return {
    token: window.localStorage.getItem(TOKEN_KEY),
    user: parseUser(window.localStorage.getItem(USER_KEY)),
  };
}

export function writeSession(token: string, user: User) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event(SESSION_EVENT));
}
