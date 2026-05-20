import {
  asConnectorAccountId,
  asConnectorId,
  asIsoDateTime,
} from "@/domain/ids";
import type { ConnectorAccount, Result, WovithError } from "@/domain/types";

export const GOOGLE_CALENDAR_CONNECTOR_ID = asConnectorId(
  "connector_google_calendar",
);
export const GOOGLE_CALENDAR_READONLY_SCOPE =
  "https://www.googleapis.com/auth/calendar.events.readonly";

export interface GoogleAccessToken {
  accessToken: string;
  scope: string;
  expiresAt: string;
}

export interface GoogleCalendarTokenProvider {
  connect(): Promise<Result<GoogleAccessToken>>;
  disconnect(): void;
  getAccessToken(): GoogleAccessToken | null;
  status(): ConnectorAccount;
}

interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

interface GoogleTokenClient {
  requestAccessToken(options?: { prompt?: string }): void;
}

interface GoogleTokenClientConfig {
  client_id: string;
  scope: string;
  callback: (response: GoogleTokenResponse) => void;
  error_callback?: (error: unknown) => void;
}

type GoogleTokenClientFactory = (
  config: GoogleTokenClientConfig,
) => GoogleTokenClient;

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: GoogleTokenClientFactory;
        };
      };
    };
  }
}

export interface BrowserGoogleCalendarTokenProviderOptions {
  clientId?: string;
  now?: () => Date;
  loadGis?: () => Promise<void>;
  createTokenClient?: GoogleTokenClientFactory;
}

export class BrowserGoogleCalendarTokenProvider
  implements GoogleCalendarTokenProvider
{
  private account: ConnectorAccount;
  private token: GoogleAccessToken | null = null;

  constructor(
    private readonly options: BrowserGoogleCalendarTokenProviderOptions,
  ) {
    this.account = disconnectedAccount();
  }

  async connect(): Promise<Result<GoogleAccessToken>> {
    const clientId = this.options.clientId?.trim();
    if (!clientId) {
      const error = connectorError(
        "google-calendar-client-id-missing",
        "Google Calendar setup required. Set VITE_GOOGLE_CLIENT_ID to connect.",
      );
      this.account = {
        ...disconnectedAccount(),
        status: "blocked",
        lastError: error,
      };
      return { ok: false, error };
    }

    this.account = { ...this.status(), status: "connecting" };

    try {
      const createTokenClient =
        this.options.createTokenClient ?? (await this.loadTokenClient());
      return await new Promise<Result<GoogleAccessToken>>((resolve) => {
        const tokenClient = createTokenClient({
          client_id: clientId,
          scope: GOOGLE_CALENDAR_READONLY_SCOPE,
          callback: (response) => {
            if (response.error || !response.access_token) {
              const error = connectorError(
                response.error ?? "google-calendar-token-missing",
                response.error_description ??
                  "Google Calendar authorization did not return an access token.",
              );
              this.token = null;
              this.account = {
                ...disconnectedAccount(),
                status: "error",
                lastError: error,
              };
              resolve({ ok: false, error });
              return;
            }

            const now = this.now();
            const expiresAt = asIsoDateTime(
              new Date(
                now.getTime() + (response.expires_in ?? 3600) * 1000,
              ).toISOString(),
            );
            this.token = {
              accessToken: response.access_token,
              scope: response.scope ?? GOOGLE_CALENDAR_READONLY_SCOPE,
              expiresAt,
            };
            this.account = {
              ...disconnectedAccount(),
              status: "connected",
              grantedScopes: [GOOGLE_CALENDAR_READONLY_SCOPE],
              connectedAt: asIsoDateTime(now.toISOString()),
              expiresAt,
            };
            resolve({ ok: true, value: this.token });
          },
          error_callback: (error) => {
            const wovithError = connectorError(
              "google-calendar-token-error",
              "Google Calendar authorization failed.",
              error,
            );
            this.token = null;
            this.account = {
              ...disconnectedAccount(),
              status: "error",
              lastError: wovithError,
            };
            resolve({ ok: false, error: wovithError });
          },
        });
        tokenClient.requestAccessToken({ prompt: "consent" });
      });
    } catch (error) {
      const wovithError = connectorError(
        "google-calendar-gis-unavailable",
        "Google Identity Services could not be loaded.",
        error,
      );
      this.token = null;
      this.account = {
        ...disconnectedAccount(),
        status: "error",
        lastError: wovithError,
      };
      return { ok: false, error: wovithError };
    }
  }

  disconnect(): void {
    this.token = null;
    this.account = disconnectedAccount();
  }

  getAccessToken(): GoogleAccessToken | null {
    this.expireIfNeeded();
    return this.token;
  }

  status(): ConnectorAccount {
    this.expireIfNeeded();
    return this.account;
  }

  private async loadTokenClient(): Promise<GoogleTokenClientFactory> {
    await (this.options.loadGis ?? loadGoogleIdentityServicesScript)();
    const initTokenClient = window.google?.accounts?.oauth2?.initTokenClient;
    if (!initTokenClient) {
      throw new Error("Google Identity Services token client is unavailable.");
    }
    return initTokenClient;
  }

  private expireIfNeeded(): void {
    if (!this.token) {
      return;
    }
    if (Date.parse(this.token.expiresAt) <= this.now().getTime()) {
      const error = connectorError(
        "google-calendar-token-expired",
        "Google Calendar access expired. Reconnect to refresh events.",
      );
      this.token = null;
      this.account = {
        ...this.account,
        status: "expired",
        lastError: error,
      };
    }
  }

  private now(): Date {
    return this.options.now?.() ?? new Date();
  }
}

export class MockGoogleCalendarTokenProvider
  implements GoogleCalendarTokenProvider
{
  private account = disconnectedAccount();
  private token: GoogleAccessToken | null = null;

  connect(): Promise<Result<GoogleAccessToken>> {
    const connectedAt = asIsoDateTime("2026-05-20T13:00:00.000Z");
    const expiresAt = asIsoDateTime("2026-05-20T14:00:00.000Z");
    this.token = {
      accessToken: "mock-google-calendar-access-token",
      scope: GOOGLE_CALENDAR_READONLY_SCOPE,
      expiresAt,
    };
    this.account = {
      ...disconnectedAccount(),
      status: "connected",
      grantedScopes: [GOOGLE_CALENDAR_READONLY_SCOPE],
      connectedAt,
      expiresAt,
    };
    return Promise.resolve({ ok: true, value: this.token });
  }

  disconnect(): void {
    this.token = null;
    this.account = disconnectedAccount();
  }

  getAccessToken(): GoogleAccessToken | null {
    return this.token;
  }

  status(): ConnectorAccount {
    return this.account;
  }
}

function disconnectedAccount(): ConnectorAccount {
  return {
    id: asConnectorAccountId("google_calendar_primary"),
    connectorId: GOOGLE_CALENDAR_CONNECTOR_ID,
    provider: "google",
    displayName: "Google Calendar",
    status: "disconnected",
    grantedScopes: [],
  };
}

function connectorError(
  code: string,
  message: string,
  details?: unknown,
): WovithError {
  return { code, message, details };
}

function loadGoogleIdentityServicesScript(): Promise<void> {
  if (window.google?.accounts?.oauth2?.initTokenClient) {
    return Promise.resolve();
  }

  const existing = document.querySelector<HTMLScriptElement>(
    'script[src="https://accounts.google.com/gsi/client"]',
  );
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load Google Identity Services.")),
        { once: true },
      );
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Failed to load Google Identity Services.")),
      { once: true },
    );
    document.head.append(script);
  });
}
