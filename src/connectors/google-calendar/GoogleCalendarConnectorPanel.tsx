import type { ConnectorAccount } from "@/domain/types";

export function GoogleCalendarConnectorPanel({
  account,
  clientIdConfigured,
  mockEnabled,
  onConnect,
  onDisconnect,
}: {
  account: ConnectorAccount;
  clientIdConfigured: boolean;
  mockEnabled: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const setupRequired = !clientIdConfigured && !mockEnabled;
  const connecting = account.status === "connecting";
  const connected = account.status === "connected";

  return (
    <section
      className="connector-panel"
      aria-label="Google Calendar connector"
      data-testid="google-calendar-connector"
    >
      <div className="connector-panel-header">
        <div>
          <p className="eyebrow">Read-only connector</p>
          <h2>Google Calendar</h2>
        </div>
        <span className={`connector-status ${account.status}`}>
          {setupRequired ? "setup required" : account.status}
        </span>
      </div>
      <p>
        Reads calendar events only. Does not create, edit, delete, or send
        anything.
      </p>
      <p className="connector-note">
        Access tokens are held in memory for this local prototype.
      </p>
      {setupRequired ? (
        <div className="setup-note" role="status">
          Google Calendar setup required. Set VITE_GOOGLE_CLIENT_ID in
          `.env.local` to connect.
        </div>
      ) : null}
      {account.lastError ? (
        <div className="connector-error" role="status">
          {account.lastError.message}
        </div>
      ) : null}
      <div className="connector-actions">
        {connected ? (
          <button type="button" onClick={onDisconnect}>
            Disconnect
          </button>
        ) : (
          <button
            className="primary-button"
            type="button"
            data-testid="connect-google-calendar"
            disabled={setupRequired || connecting}
            onClick={onConnect}
          >
            {connecting ? "Connecting" : "Connect Google Calendar"}
          </button>
        )}
      </div>
    </section>
  );
}
