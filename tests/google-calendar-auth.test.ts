import { describe, expect, it } from "vitest";

import {
  BrowserGoogleCalendarTokenProvider,
  GOOGLE_CALENDAR_READONLY_SCOPE,
} from "@/connectors/google-calendar/google-calendar-auth";

describe("Google Calendar token provider", () => {
  it("connects with the exact read-only calendar events scope", async () => {
    window.localStorage.clear();
    let requestedScope = "";
    const provider = new BrowserGoogleCalendarTokenProvider({
      clientId: "client-id",
      now: () => new Date("2026-05-20T13:00:00.000Z"),
      createTokenClient: (config) => {
        requestedScope = config.scope;
        return {
          requestAccessToken: () =>
            config.callback({
              access_token: "secret-access-token",
              expires_in: 60,
              scope: config.scope,
            }),
        };
      },
    });

    const result = await provider.connect();

    expect(result.ok).toBe(true);
    expect(requestedScope).toBe(GOOGLE_CALENDAR_READONLY_SCOPE);
    expect(provider.status().status).toBe("connected");
    expect(provider.getAccessToken()?.accessToken).toBe("secret-access-token");
    expect(window.localStorage.length).toBe(0);
    expect(JSON.stringify(window.localStorage)).not.toContain(
      "secret-access-token",
    );
    expect(JSON.stringify(window.localStorage)).not.toContain("refresh");
  });

  it("returns setup-needed state when the client ID is missing", async () => {
    const provider = new BrowserGoogleCalendarTokenProvider({
      clientId: "",
    });

    const result = await provider.connect();

    expect(result.ok).toBe(false);
    expect(provider.status().status).toBe("blocked");
    expect(provider.status().lastError?.code).toBe(
      "google-calendar-client-id-missing",
    );
  });

  it("surfaces token response errors", async () => {
    const provider = new BrowserGoogleCalendarTokenProvider({
      clientId: "client-id",
      createTokenClient: (config) => ({
        requestAccessToken: () =>
          config.callback({
            error: "access_denied",
            error_description: "The user denied access.",
          }),
      }),
    });

    const result = await provider.connect();

    expect(result.ok).toBe(false);
    expect(provider.status().status).toBe("error");
    expect(provider.getAccessToken()).toBeNull();
  });

  it("disconnect clears the in-memory token", async () => {
    const provider = new BrowserGoogleCalendarTokenProvider({
      clientId: "client-id",
      createTokenClient: (config) => ({
        requestAccessToken: () =>
          config.callback({
            access_token: "temporary-token",
            expires_in: 60,
            scope: config.scope,
          }),
      }),
    });

    await provider.connect();
    provider.disconnect();

    expect(provider.status().status).toBe("disconnected");
    expect(provider.getAccessToken()).toBeNull();
  });

  it("marks expired tokens as expired and unavailable", async () => {
    let now = new Date("2026-05-20T13:00:00.000Z");
    const provider = new BrowserGoogleCalendarTokenProvider({
      clientId: "client-id",
      now: () => now,
      createTokenClient: (config) => ({
        requestAccessToken: () =>
          config.callback({
            access_token: "short-token",
            expires_in: 1,
            scope: config.scope,
          }),
      }),
    });

    await provider.connect();
    now = new Date("2026-05-20T13:00:02.000Z");

    expect(provider.getAccessToken()).toBeNull();
    expect(provider.status().status).toBe("expired");
  });
});
