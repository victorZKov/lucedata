import React, { useEffect, useState } from "react";

import { VERSION_INFO } from "./VersionDialog";

type ConfigBackend = { backend: string | null; descriptor?: string | null };

const IconSqlite = ({ color = "#CC9933" }: { color?: string }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <circle cx="12" cy="12" r="10" fill={color} />
    <path
      d="M7 12c1.5-3 5-4 9-3"
      stroke="#fff"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconPostgres = ({ color = "#336699" }: { color?: string }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <rect x="2" y="4" width="20" height="16" rx="2" fill={color} />
    <circle cx="8" cy="11" r="2" fill="#fff" />
    <circle cx="12" cy="8" r="1.2" fill="#fff" />
  </svg>
);

const IconSqlServer = ({ color = "#6A2EFE" }: { color?: string }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <rect x="2" y="4" width="20" height="16" rx="2" fill={color} />
    <path
      d="M4 8c4 3 8 3 12 0"
      stroke="#fff"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

const StatusBar: React.FC = () => {
  const [dbConfig, setDbConfig] = useState<ConfigBackend>({
    backend: null,
    descriptor: null,
  });
  const [version, setVersion] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const info = await (window as any).electronAPI.getAppConfigInfo();
        if (mounted)
          setDbConfig({
            backend: info?.backend || "sqlite",
            descriptor: info?.descriptor || null,
          });
      } catch (_err) {
        if (mounted) setDbConfig({ backend: "sqlite", descriptor: null });
      }
    })();

    // Use the build-time VERSION_INFO as the application version. Keep a small state for compatibility.
    if (mounted) setVersion(VERSION_INFO?.version || "");

    return () => {
      mounted = false;
    };
  }, []);

  const backend = (dbConfig.backend || "sqlite").toLowerCase();

  const renderBackend = () => {
    const label =
      backend === "sqlite"
        ? "SQLite"
        : backend === "postgres"
          ? "Postgres"
          : backend === "sqlserver"
            ? "SQL Server"
            : backend;
    const descriptor = dbConfig.descriptor || "";

    let icon = <IconSqlite />;
    let color = "#CC9933";
    if (backend === "postgres") {
      icon = <IconPostgres />;
      color = "#336699";
    }
    if (backend === "sqlserver") {
      icon = <IconSqlServer />;
      color = "#6A2EFE";
    }

    return (
      <div
        style={{ display: "flex", alignItems: "center", gap: 8 }}
        title={descriptor || label}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 18,
              height: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </div>
          <div style={{ fontSize: 12 }}>
            <strong style={{ color }}>{label}</strong>
            {descriptor ? (
              <span style={{ marginLeft: 8, color: "var(--muted)" }}>
                {descriptor}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        height: 36,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 12px",
        borderTop: "2px solid rgba(0,0,0,0.08)",
        boxShadow: "0 -1px 0 rgba(0,0,0,0.06)",
        background: "var(--surface)",
        zIndex: 999,
      }}
    >
      <div style={{ display: "flex", gap: 0, alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            paddingLeft: 6,
          }}
        >
          <div
            title="Database used for configuration"
            style={{ display: "flex", alignItems: "center", padding: "0 12px" }}
          >
            {renderBackend()}
          </div>
          <div
            title="Currently signed user"
            style={{
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              padding: "0 12px",
              borderLeft: "1px solid rgba(0,0,0,0.12)",
            }}
          >
            <strong style={{ marginRight: 8 }}>User:</strong> (not signed)
          </div>
          <div
            title="Application license status"
            style={{
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              padding: "0 12px",
              borderLeft: "1px solid rgba(0,0,0,0.12)",
            }}
          >
            <strong style={{ marginRight: 8 }}>License:</strong> (none)
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12, opacity: 0.9 }} title={`Version ${version}`}>
        {version}
      </div>
    </div>
  );
};

export default StatusBar;
