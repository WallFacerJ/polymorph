import {
  getEdrHostActivityForDevice,
} from "./simulationAdapter";

import type {
  EdrHostActivityProjectionState,
} from "./simulationAdapter";

import "./EdrHostActivityPanel.css";

interface EdrHostActivityPanelProps {
  state: EdrHostActivityProjectionState;
  deviceId: string;
  onSearchSiem: (query: string) => void;
}

export function EdrHostActivityPanel({
  state,
  deviceId,
  onSearchSiem,
}: EdrHostActivityPanelProps) {
  const observations =
    getEdrHostActivityForDevice(
      state,
      deviceId,
    );

  if (observations.length === 0) {
    return null;
  }

  return (
    <section
      className="edr-host-activity"
      aria-label="EDR Range response history"
    >
      <header>
        <div>
          <p className="eyebrow">
            Endpoint response telemetry
          </p>
          <h4>Range response history</h4>
          <p>
            Material synthetic-host actions and collected host evidence projected from the canonical incident history.
          </p>
        </div>
        <strong>{observations.length}</strong>
      </header>

      <div className="edr-host-activity-list">
        {observations.map((observation) => (
          <article key={observation.eventId}>
            <div>
              <span>{observation.eventType}</span>
              <time>{observation.timestamp}</time>
            </div>
            <strong>{observation.targetId}</strong>
            <p>{observation.summary}</p>
            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                onSearchSiem(
                  `eventId:${observation.eventId}`,
                )
              }
            >
              Open canonical event in SIEM
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
