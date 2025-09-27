import { useState, useEffect, useMemo, useRef } from "react";
import Editor from "@monaco-editor/react";
import { format as sqlFormat } from "sql-formatter";
import type * as Monaco from "monaco-editor";

import { useTheme } from "../contexts/ThemeContext";

import Resizer from "./Resizer";
import EditableDataGrid from "./EditableDataGrid";
import ExecutionPlanViewer from "./ExecutionPlanViewer";
import { VERSION_INFO } from "./VersionDialog";

// Simplified Design System - following style3.txt specifications

// Add custom CSS for query highlighting and global styles
const customStyles = `
  .highlighted-query {
    background-color: rgba(37, 99, 235, 0.1) !important;
    border-left: 3px solid #2563EB !important;
  }
  .highlighted-query-text {
    background-color: rgba(37, 99, 235, 0.05) !important;
  }
  
  /* Simplified scrollbar styling */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: #9CA3AF;
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #6B7280;
  }
`;

// Inject styles
if (typeof document !== "undefined") {
  const styleElement = document.createElement("style");
  styleElement.textContent = customStyles;
  document.head.appendChild(styleElement);
}

type QueryResult = {
  query: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  rowCount: number;
  executionTime: number;
  messages?: string[];
  error?: string;
  startTime: number;
  endTime: number;
  xmlExecutionPlan?: string; // SQL Server XML execution plan data
};

type Tab = {
  id: string;
  title: string;
  type?: "sql" | "edit-data" | "content-viewer"; // Add content viewer tab type
  filePath?: string; // persisted file path for Save
  connectionId?: string;
  connectionName?: string;
  connectionType?: string;
  database?: string;
  schema?: string;
  table?: string;
  sql: string;
  // Content viewer specific fields
  content?: string;
  rawContent?: string; // Store original unformatted content
  contentType?:
    | "text"
    | "json"
    | "xml"
    | "html"
    | "sql"
    | "yaml"
    | "csv"
    | "javascript"
    | "css";
  showFormatted?: boolean; // Toggle between formatted and raw content
  activeResultTab?: "results" | "messages";
  result?: QueryResult; // Legacy single result for backward compatibility
  results?: QueryResult[]; // Multiple results for multi-query execution
  status?: "idle" | "running" | "error";
  startedAt?: number | null;
  columnWidths?: Record<string, number>; // px per column key
  editorPos?: { line: number; column: number };
  editorFocused?: boolean;
};

// Utility function to parse SQL text into individual queries
const parseSQLQueries = (sqlText: string): string[] => {
  if (!sqlText || !sqlText.trim()) return [];

  // Split by semicolon, but be careful about semicolons inside string literals
  const queries: string[] = [];
  let currentQuery = "";
  let inString = false;
  let stringChar = "";
  let escaped = false;

  for (let i = 0; i < sqlText.length; i++) {
    const char = sqlText[i];
    const nextChar = sqlText[i + 1];

    if (escaped) {
      currentQuery += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      currentQuery += char;
      continue;
    }

    if (!inString && (char === '"' || char === "'")) {
      inString = true;
      stringChar = char;
      currentQuery += char;
      continue;
    }

    if (inString && char === stringChar) {
      // Check for escaped quotes
      if (nextChar === stringChar) {
        currentQuery += char + nextChar;
        i++; // Skip next character
        continue;
      }
      inString = false;
      stringChar = "";
      currentQuery += char;
      continue;
    }

    if (!inString && char === ";") {
      const trimmedQuery = currentQuery.trim();
      if (trimmedQuery) {
        queries.push(trimmedQuery);
      }
      currentQuery = "";
      continue;
    }

    currentQuery += char;
  }

  // Add the last query if it doesn't end with semicolon
  const trimmedQuery = currentQuery.trim();
  if (trimmedQuery) {
    queries.push(trimmedQuery);
  }

  return queries.filter(q => q.length > 0);
};

export default function WorkArea() {
  const { theme } = useTheme();
  const monacoEditorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(
    null
  );
  const monacoRef = useRef<typeof Monaco | null>(null);
  const decorationIdsRef = useRef<string[]>([]);

  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [isExplainLoading, setIsExplainLoading] = useState(false);
  const [isRunLoading, setIsRunLoading] = useState(false);
  const [isFormatLoading, setIsFormatLoading] = useState(false);
  const [sortFields, setSortFields] = useState<
    Array<{ column: string; direction: "asc" | "desc" }>
  >([]);
  const [showSortManager, setShowSortManager] = useState(false);
  // Connections for database dropdown
  const [connections, setConnections] = useState<
    Array<{
      id: string;
      name: string;
      type: string;
    }>
  >([]);
  // AI engines for button ordering
  const [aiEngines, setAiEngines] = useState<
    Array<{
      id: string;
      name: string;
      type: string;
    }>
  >([]);
  // Loading states for button ordering
  const [connectionsLoaded, setConnectionsLoaded] = useState(false);
  const [aiEnginesLoaded, setAiEnginesLoaded] = useState(false);
  const headerRefs = useMemo(
    () => ({}) as Record<string, HTMLTableCellElement | null>,
    []
  );
  const resizingCol = useMemo(
    () => ({ key: null as string | null, startX: 0, startWidth: 0 }),
    []
  );
  // Load saved tabs
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sqlhelper-tabs");
      const savedActive = localStorage.getItem("sqlhelper-active-tab");
      if (saved) {
        const parsed: Tab[] = JSON.parse(saved);
        // Do not restore result payloads to avoid heavy memory
        const sanitized = parsed.map(t => ({ ...t, result: undefined }));
        setTabs(sanitized);
        setActiveTabId(savedActive || (sanitized[0]?.id ?? null));
      } else {
        // No saved tabs: open a default empty query and try to bind to last used connection
        const id = "local:new:1";
        let connId: string | undefined;
        let connName: string | undefined;
        let connType: string | undefined;
        let dbName: string | undefined;
        try {
          // Pull a last-used connection from localStorage if present (set by Explorer after successful connect)
          const lastCtx = localStorage.getItem("sqlhelper-last-connection");
          if (lastCtx) {
            const parsed = JSON.parse(lastCtx);
            connId = parsed.id;
            connName = parsed.name;
            connType = parsed.type;
            dbName = parsed.database;
          }
        } catch {
          // Failed to parse connection string - will use default values
        }
        const newTab: Tab = {
          id,
          type: "sql",
          title: "New Query",
          sql: "",
          activeResultTab: "results",
          connectionId: connId,
          connectionName: connName,
          connectionType: connType,
          database: dbName,
        } as Tab;
        setTabs([newTab]);
        setActiveTabId(id);
      }
    } catch {
      // Failed to load saved tabs - continue with default state
    }
  }, []);

  // Persist tabs and active tab
  useEffect(() => {
    try {
      const toSave = tabs.map(t => t);
      localStorage.setItem("sqlhelper-tabs", JSON.stringify(toSave));
      if (activeTabId)
        localStorage.setItem("sqlhelper-active-tab", activeTabId);
    } catch {
      // Failed to persist tabs to localStorage - continue normally
    }
  }, [tabs, activeTabId]);
  const [sqlHeight, setSqlHeight] = useState(() => {
    const saved = localStorage.getItem("sqlhelper-sql-height");
    return saved ? parseInt(saved, 10) : 320;
  });
  const [showResults, setShowResults] = useState(() => {
    const saved = localStorage.getItem("sqlhelper-show-results");
    return saved ? JSON.parse(saved) : true;
  });

  // AI Context Sharing state
  const [shareContextWithAI, setShareContextWithAI] = useState(() => {
    const saved = localStorage.getItem("sqlhelper-share-context-with-ai");
    return saved ? JSON.parse(saved) : false;
  });

  const activeTab = useMemo(
    () => tabs.find(t => t.id === activeTabId) || null,
    [tabs, activeTabId]
  );
  const [resultMenu, setResultMenu] = useState<{
    x: number;
    y: number;
    show: boolean;
  }>({ x: 0, y: 0, show: false });
  const [columnMenu, setColumnMenu] = useState<{
    x: number;
    y: number;
    show: boolean;
    column?: string;
  }>({ x: 0, y: 0, show: false });

  // Tab management state
  const [tabContextMenu, setTabContextMenu] = useState<{
    x: number;
    y: number;
    show: boolean;
    tabId?: string;
  }>({ x: 0, y: 0, show: false });
  const [showTabDropdown, setShowTabDropdown] = useState(false);

  // For multiple query results - track which result is currently active
  const [activeResultIndex, setActiveResultIndex] = useState(0);

  // Track current sort state for click-to-sort functionality
  const [currentSort, setCurrentSort] = useState<{
    column: string;
    direction: "ASC" | "DESC";
  } | null>(null);

  // Search/filter state for results table
  const [searchFilter, setSearchFilter] = useState<{
    column: string; // empty string means search all columns
    value: string;
  }>({ column: "", value: "" });

  // Helper to get the current result to display
  const getCurrentResult = (tab: Tab) => {
    if (tab.results && tab.results.length > 0) {
      // Ensure activeResultIndex is within bounds
      const safeIndex = Math.max(
        0,
        Math.min(activeResultIndex, tab.results.length - 1)
      );
      const result = tab.results[safeIndex];
      console.log("🔧 getCurrentResult - multiple results mode:", {
        activeResultIndex,
        safeIndex,
        totalResults: tab.results.length,
        selectedResult: result,
      });
      return result;
    }
    console.log("🔧 getCurrentResult - single result mode:", tab.result);
    return tab.result;
  };

  useEffect(() => {
    localStorage.setItem("sqlhelper-sql-height", sqlHeight.toString());
  }, [sqlHeight]);

  useEffect(() => {
    localStorage.setItem("sqlhelper-show-results", JSON.stringify(showResults));
  }, [showResults]);

  useEffect(() => {
    localStorage.setItem(
      "sqlhelper-share-context-with-ai",
      JSON.stringify(shareContextWithAI)
    );
  }, [shareContextWithAI]);

  // Reset active result index when switching tabs or when results change
  useEffect(() => {
    setActiveResultIndex(0);
    // Clear query highlighting when switching tabs
    clearQueryHighlighting();
    // Clear search filter when switching tabs
    setSearchFilter({ column: "", value: "" });
  }, [activeTabId]);

  // Clear search filter when switching between result tabs
  useEffect(() => {
    setSearchFilter({ column: "", value: "" });
  }, [activeResultIndex]);

  useEffect(() => {
    const handleToggleResults = () => setShowResults((prev: boolean) => !prev);
    document.addEventListener("toggle-results", handleToggleResults);
    return () =>
      document.removeEventListener("toggle-results", handleToggleResults);
  }, []);

  // Load connections for database dropdown
  useEffect(() => {
    const loadConnections = async () => {
      try {
        const result = await window.electronAPI.connections.list();

        setConnections(result || []);
        setConnectionsLoaded(true);
      } catch (error) {
        console.error("Failed to load connections for dropdown:", error);
        setConnections([]);
        setConnectionsLoaded(true);
      }
    };

    loadConnections();
  }, []);

  // Load AI engines for button ordering
  useEffect(() => {
    const loadAiEngines = async () => {
      try {
        const result = await window.electronAPI.aiEngines.list();

        setAiEngines(result || []);
        setAiEnginesLoaded(true);
      } catch (error) {
        console.error("Failed to load AI engines for button ordering:", error);
        setAiEngines([]);
        setAiEnginesLoaded(true);
      }
    };

    loadAiEngines();
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const { detail } = e as CustomEvent<{
        connectionId: string;
        connectionType?: string;
        connectionName?: string;
        database?: string;
        schema: string;
        table: string;
        customSql?: string;
      }>;
      if (!detail) return;
      const {
        connectionId,
        connectionName,
        connectionType,
        database,
        schema,
        table,
        customSql,
      } = detail;
      const title = `${schema}.${table}`;
      const id = `${connectionId}:${schema}.${table}`;
      const already = tabs.find(t => t.id === id);
      const sql = customSql ?? buildInitialSql(connectionType, schema, table);
      if (already) {
        setActiveTabId(already.id);
      } else {
        const newTab: Tab = {
          id,
          type: "sql",
          title,
          connectionId,
          connectionName,
          connectionType,
          database,
          schema,
          table,
          sql,
          activeResultTab: "results",
        };
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(id);
      }
    };
    document.addEventListener("open-sql-tab", handler as EventListener);
    const scriptHandler = (e: Event) => {
      const { detail } = e as CustomEvent<{
        connectionId: string;
        connectionType?: string;
        connectionName?: string;
        database?: string;
        schema?: string;
        title: string;
        sql: string;
      }>;
      if (!detail) return;
      const {
        connectionId,
        connectionName,
        connectionType,
        database,
        schema,
        title,
        sql,
      } = detail;
      const id = `${connectionId}:${schema ?? "script"}:${title}`;
      const existing = tabs.find(t => t.id === id);
      if (existing) {
        setTabs(prev =>
          prev.map(t => (t.id === existing.id ? { ...t, sql } : t))
        );
        setActiveTabId(existing.id);
      } else {
        const newTab: Tab = {
          id,
          type: "sql",
          title,
          connectionId,
          connectionName,
          connectionType,
          database,
          schema,
          table: "",
          sql,
          activeResultTab: "results",
        };
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(id);
      }
    };
    document.addEventListener(
      "open-sql-script",
      scriptHandler as EventListener
    );
    const emptyHandler = (e: Event) => {
      const { detail } = e as CustomEvent<{
        connectionId: string;
        connectionType?: string;
        connectionName?: string;
        database?: string;
        schema: string;
      }>;
      if (!detail) return;
      const { connectionId, connectionName, connectionType, database, schema } =
        detail;
      const id = `${connectionId}:${schema}:new`;
      const title = `${schema} • New Query`;
      const existing = tabs.find(t => t.id === id);
      const sql = "";
      if (existing) setActiveTabId(existing.id);
      else {
        const newTab: Tab = {
          id,
          type: "sql",
          title,
          connectionId,
          connectionName,
          connectionType,
          database,
          schema,
          table: "",
          sql,
          activeResultTab: "results",
        };
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(id);
      }
    };
    document.addEventListener(
      "open-empty-sql-tab",
      emptyHandler as EventListener
    );
    const editDataHandler = (e: Event) => {
      const { detail } = e as CustomEvent<{
        connectionId: string;
        connectionType?: string;
        connectionName?: string;
        database?: string;
        schema: string;
        table: string;
      }>;
      if (!detail) return;
      const {
        connectionId,
        connectionName,
        connectionType,
        database,
        schema,
        table,
      } = detail;
      const id = `${connectionId}:edit-data:${schema}.${table}`;
      const title = `${schema}.${table} • Edit Data`;
      const existing = tabs.find(t => t.id === id);
      if (existing) {
        setActiveTabId(existing.id);
      } else {
        const newTab: Tab = {
          id,
          type: "edit-data",
          title,
          connectionId,
          connectionName,
          connectionType,
          database,
          schema,
          table,
          sql: "", // Not needed for edit-data tabs
          activeResultTab: "results",
        };
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(id);
      }
    };
    document.addEventListener(
      "open-edit-data-tab",
      editDataHandler as EventListener
    );

    const routineHandler = (e: Event) => {
      const { detail } = e as CustomEvent<{
        connectionId: string;
        connectionType?: string;
        connectionName?: string;
        database?: string;
        schema: string;
        table?: string;
        routine: string;
        routineType: "procedure" | "function" | "trigger";
        definition: string;
      }>;
      if (!detail) return;

      const {
        connectionId,
        connectionName,
        connectionType,
        database,
        schema,
        table,
        routine,
        routineType,
        definition,
      } = detail;

      // Create a unique tab ID based on the routine type and context
      const tabContext = table ? `${schema}.${table}` : schema;
      const id = `${connectionId}:${routineType}:${tabContext}:${routine}`;
      const title = table
        ? `${routine} (${routineType} on ${schema}.${table})`
        : `${routine} (${routineType} in ${schema})`;

      const existing = tabs.find(t => t.id === id);
      if (existing) {
        // Update existing tab with fresh definition
        setTabs(prev =>
          prev.map(t => (t.id === existing.id ? { ...t, sql: definition } : t))
        );
        setActiveTabId(existing.id);
      } else {
        const newTab: Tab = {
          id,
          type: "sql",
          title,
          connectionId,
          connectionName,
          connectionType,
          database,
          schema,
          table: table || "",
          sql: definition,
          activeResultTab: "results",
        };
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(id);
      }
    };
    document.addEventListener(
      "open-routine-tab",
      routineHandler as EventListener
    );

    return () => {
      document.removeEventListener("open-sql-tab", handler as EventListener);
      document.removeEventListener(
        "open-sql-script",
        scriptHandler as EventListener
      );
      document.removeEventListener(
        "open-empty-sql-tab",
        emptyHandler as EventListener
      );
      document.removeEventListener(
        "open-edit-data-tab",
        editDataHandler as EventListener
      );
      document.removeEventListener(
        "open-routine-tab",
        routineHandler as EventListener
      );
    };
  }, [tabs]);

  const buildInitialSql = (
    type: string | undefined,
    schema: string,
    table: string
  ) => {
    const ident = (n: string) => {
      switch (type) {
        case "sqlserver":
          return `[${n}]`;
        case "postgresql":
          return `"${n}"`;
        default:
          return `"${n}"`;
      }
    };
    const qualified = `${ident(schema)}.${ident(table)}`;
    switch (type) {
      case "sqlserver":
        return `SELECT TOP 100 * FROM ${qualified};`;
      default:
        return `SELECT * FROM ${qualified} LIMIT 100;`;
    }
  };

  const closeTab = (id: string) => {
    setTabs(prev => prev.filter(t => t.id !== id));
    if (activeTabId === id) {
      const idx = tabs.findIndex(t => t.id === id);
      const next = tabs[idx + 1] || tabs[idx - 1] || null;
      setActiveTabId(next ? next.id : null);
    }
  };

  // Tab management functions
  const closeAllTabs = () => {
    setTabs([]);
    setActiveTabId(null);
  };

  const closeOtherTabs = (keepTabId: string) => {
    setTabs(prev => prev.filter(t => t.id === keepTabId));
    setActiveTabId(keepTabId);
  };

  const handleTabRightClick = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setTabContextMenu({
      x: e.clientX,
      y: e.clientY,
      show: true,
      tabId,
    });
  };

  // Function to detect content type based on content
  const detectContentType = (
    content: string
  ):
    | "text"
    | "json"
    | "xml"
    | "html"
    | "sql"
    | "yaml"
    | "csv"
    | "javascript"
    | "css" => {
    if (!content || typeof content !== "string") return "text";

    const trimmed = content.trim();
    const lowerContent = content.toLowerCase();

    // JSON detection - more thorough
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        JSON.parse(trimmed);
        return "json";
      } catch {
        // Could be JavaScript object notation or malformed JSON
        if (
          trimmed.includes("function") ||
          trimmed.includes("=>") ||
          /\b(const|let|var)\s+\w+\s*=/.test(trimmed)
        ) {
          return "javascript";
        }
      }
    }

    // XML/HTML detection - improved patterns
    if (
      trimmed.startsWith("<") &&
      (trimmed.endsWith(">") || trimmed.includes("</"))
    ) {
      const htmlIndicators = [
        "<!doctype html",
        "<html",
        "<head>",
        "<body>",
        "<div",
        "<span",
        "<p>",
        "<h1",
        "<h2",
        "<h3",
        "<a ",
        "<img",
        "<script",
        "<style",
        "<link",
      ];
      if (htmlIndicators.some(indicator => lowerContent.includes(indicator))) {
        return "html";
      }
      // Check for XML declaration or namespaces
      if (
        trimmed.startsWith("<?xml") ||
        trimmed.includes("xmlns") ||
        /^<\w+(\s+[\w:]+="[^"]*")*\s*(\/?>|>[\s\S]*<\/\w+>)$/.test(trimmed)
      ) {
        return "xml";
      }
      return "xml"; // Default to XML for angle bracket content
    }

    // SQL detection - enhanced keyword matching
    const sqlKeywords = [
      "SELECT",
      "INSERT",
      "UPDATE",
      "DELETE",
      "CREATE",
      "ALTER",
      "DROP",
      "FROM",
      "WHERE",
      "JOIN",
      "INNER JOIN",
      "LEFT JOIN",
      "RIGHT JOIN",
      "GROUP BY",
      "ORDER BY",
      "HAVING",
      "UNION",
      "WITH",
    ];
    const hasSqlKeywords = sqlKeywords.some(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, "i");
      return regex.test(content);
    });
    if (hasSqlKeywords) {
      return "sql";
    }

    // YAML detection - improved patterns
    if (
      content.includes("---") ||
      /^[\w\-_]+:\s*.+$/m.test(content) ||
      /^\s*-\s+\w+/.test(content)
    ) {
      return "yaml";
    }

    // CSV detection - enhanced logic
    const lines = content.split("\n").filter(line => line.trim().length > 0);
    if (lines.length >= 2) {
      const firstLine = lines[0];
      const secondLine = lines[1];
      if (firstLine.includes(",") && secondLine.includes(",")) {
        const firstLineCommas = (firstLine.match(/,/g) || []).length;
        const secondLineCommas = (secondLine.match(/,/g) || []).length;
        if (
          firstLineCommas === secondLineCommas &&
          firstLineCommas > 0 &&
          firstLineCommas < 20
        ) {
          return "csv";
        }
      }
    }

    // CSS detection - better patterns
    const cssPatterns = [
      /[\w-.#[\]]+\s*\{[^}]*\}/, // CSS rules
      /@\w+\s*\{/, // CSS at-rules
      /\w+\s*:\s*[^;]+;/, // CSS properties
    ];
    const hasCssPatterns = cssPatterns.some(pattern => pattern.test(content));
    const hasCssKeywords = [
      "color",
      "margin",
      "padding",
      "font",
      "background",
      "border",
      "width",
      "height",
    ].some(keyword => content.includes(keyword + ":"));
    if (hasCssPatterns || (hasCssKeywords && content.includes("{"))) {
      return "css";
    }

    // JavaScript detection - comprehensive patterns
    const jsPatterns = [
      /\bfunction\s+\w+\s*\(/, // Function declarations
      /\b(const|let|var)\s+\w+\s*=/, // Variable declarations
      /=>\s*[{\w]/, // Arrow functions
      /\bconsole\.\w+\s*\(/, // Console methods
      /\bdocument\.\w+/, // DOM access
      /\bwindow\.\w+/, // Window object
      /import\s+.*\s+from\s+['"`]/, // ES6 imports
      /export\s+(default\s+)?\w+/, // ES6 exports
      /require\s*\(\s*['"`]/, // CommonJS require
      /module\.exports\s*=/, // CommonJS exports
    ];
    if (jsPatterns.some(pattern => pattern.test(content))) {
      return "javascript";
    }

    return "text";
  };

  // Function to format content based on type
  const formatContent = (
    content: string,
    type:
      | "text"
      | "json"
      | "xml"
      | "html"
      | "sql"
      | "yaml"
      | "csv"
      | "javascript"
      | "css"
  ): string => {
    if (!content) return "";

    try {
      switch (type) {
        case "json":
          try {
            const parsed = JSON.parse(content);
            return JSON.stringify(parsed, null, 2);
          } catch {
            return content;
          }
        case "sql":
          // Basic SQL formatting - add line breaks after keywords
          return content
            .replace(/\bSELECT\b/gi, "\nSELECT")
            .replace(/\bFROM\b/gi, "\nFROM")
            .replace(/\bWHERE\b/gi, "\nWHERE")
            .replace(/\bJOIN\b/gi, "\nJOIN")
            .replace(/\bINNER JOIN\b/gi, "\nINNER JOIN")
            .replace(/\bLEFT JOIN\b/gi, "\nLEFT JOIN")
            .replace(/\bRIGHT JOIN\b/gi, "\nRIGHT JOIN")
            .replace(/\bORDER BY\b/gi, "\nORDER BY")
            .replace(/\bGROUP BY\b/gi, "\nGROUP BY")
            .replace(/\bHAVING\b/gi, "\nHAVING")
            .trim();
        case "html":
        case "xml": {
          // Basic XML/HTML formatting - add line breaks and indentation
          let formatted = content;
          formatted = formatted.replace(/></g, ">\n<");
          // Simple indentation
          const lines = formatted.split("\n");
          let indent = 0;
          return lines
            .map(line => {
              const trimmed = line.trim();
              if (trimmed.startsWith("</")) indent = Math.max(0, indent - 1);
              const result = "  ".repeat(indent) + trimmed;
              if (
                trimmed.startsWith("<") &&
                !trimmed.startsWith("</") &&
                !trimmed.endsWith("/>")
              ) {
                indent++;
              }
              return result;
            })
            .join("\n");
        }
        case "css": {
          // Basic CSS formatting
          return content
            .replace(/\{/g, " {\n  ")
            .replace(/\}/g, "\n}\n")
            .replace(/;/g, ";\n  ")
            .replace(/,/g, ",\n")
            .split("\n")
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join("\n");
        }
        default:
          return content;
      }
    } catch {
      return content;
    }
  };

  // Function to open content in a new tab with auto-detection
  const openContentTab = (
    content: string,
    title: string,
    contentType?:
      | "text"
      | "json"
      | "xml"
      | "html"
      | "sql"
      | "yaml"
      | "csv"
      | "javascript"
      | "css"
  ) => {
    const detectedType = contentType || detectContentType(content);
    const formattedContent = formatContent(content, detectedType);

    const id = `content-${Date.now()}`;
    const newTab: Tab = {
      id,
      title: `📄 ${title}`,
      type: "content-viewer",
      content: formattedContent,
      rawContent: content, // Store original unformatted content
      contentType: detectedType,
      showFormatted: true, // Default to formatted view
      sql: "", // Required field but not used for content viewer
    };

    setTabs(prev => [...prev, newTab]);
    setActiveTabId(id);
  };

  const runQuery = async () => {
    if (!activeTab || !activeTab.connectionId || !window.electronAPI) return;

    const queries = parseSQLQueries(activeTab.sql);
    if (queries.length === 0) return;

    try {
      setIsRunLoading(true);
      updateActiveTab({ status: "running", startedAt: Date.now() });

      const results: QueryResult[] = [];
      let _totalExecutionTime = 0;

      for (let i = 0; i < queries.length; i++) {
        const query = queries[i];
        const startTime = Date.now();

        try {
          const res = await window.electronAPI.database.executeQuery(
            activeTab.connectionId,
            query
          );

          const endTime = Date.now();
          const executionTime = endTime - startTime;
          _totalExecutionTime += executionTime;

          const columns =
            res.columns?.map(c => c.name) ||
            (res.rows[0] ? Object.keys(res.rows[0]) : []);

          results.push({
            query,
            columns,
            rows: res.rows || [],
            rowCount: res.rowCount || res.rows?.length || 0,
            executionTime,
            messages: res.messages || [],
            startTime,
            endTime,
          });
        } catch (queryError: any) {
          const endTime = Date.now();
          results.push({
            query,
            columns: [],
            rows: [],
            rowCount: 0,
            executionTime: endTime - startTime,
            error: queryError?.message || String(queryError),
            startTime,
            endTime,
          });
        }
      }

      // Update tab with all results
      if (results.length === 1) {
        // Single query - maintain backward compatibility
        updateActiveTab({
          result: results[0],
          results: undefined,
          status: "idle",
        });
      } else {
        // Multiple queries - use new results array
        console.log("🔧 Multiple queries executed, results:", results);
        updateActiveTab({
          result: results[0], // Set first result as fallback
          results,
          status: "idle",
        });
        // Reset to first result when we have new multiple results
        setActiveResultIndex(0);
      }

      setShowResults(true);
    } catch (err: any) {
      updateActiveTab({
        result: {
          query: activeTab.sql,
          columns: [],
          rows: [],
          rowCount: 0,
          executionTime: 0,
          error: err?.message || String(err),
          startTime: Date.now(),
          endTime: Date.now(),
        },
        status: "error",
        activeResultTab: "messages",
      });
    } finally {
      setIsRunLoading(false);
    }
  };

  const explainQuery = async () => {
    if (!activeTab || !activeTab.connectionId) return;

    let query = activeTab.sql.trim();
    if (!query) return;

    try {
      setIsExplainLoading(true);
      updateActiveTab({ status: "running", startedAt: Date.now() });

      let res: any;
      let actualQuery: string;

      if (activeTab.connectionType === "sqlserver") {
        // For SQL Server, try to get XML execution plan for better visualization
        actualQuery = `-- Execution Plan Analysis: ${query}`;

        try {
          // All SHOWPLAN_XML approaches fail due to Node.js mssql driver limitations
          // Let's use SQL Server's query execution plan cache instead
          console.log(
            "🔍 Attempting to get execution plan using plan cache approach for query:",
            query.substring(0, 100)
          );

          // Create a unique query ID to identify our execution
          const timestamp = Date.now();
          const queryId = `/* EXPLAIN_QUERY_${timestamp} */ ${query}`;

          console.log("🔍 Step 1: Execute query to populate plan cache");
          // First execute the query normally to get it in the plan cache
          await window.electronAPI.database.executeQuery(
            activeTab.connectionId!,
            queryId
          );
          console.log(
            "🔍 Normal execution completed, now fetching plan from cache"
          );

          // Wait a moment to ensure the plan is in cache
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Now query the plan cache to get the XML execution plan
          const planCacheQuery = `
            SELECT 
              qp.query_plan as ExecutionPlanXML,
              qt.text as QueryText
            FROM sys.dm_exec_cached_plans cp
            CROSS APPLY sys.dm_exec_query_plan(cp.plan_handle) qp
            CROSS APPLY sys.dm_exec_sql_text(cp.plan_handle) qt
            WHERE qt.text LIKE '%EXPLAIN_QUERY_${timestamp}%'
              AND qt.text NOT LIKE '%sys.dm_exec_cached_plans%'
              AND qp.query_plan IS NOT NULL
            ORDER BY cp.usecounts DESC
          `;

          console.log("🔍 Step 2: Querying plan cache for execution plan");
          let xmlResult = await window.electronAPI.database.executeQuery(
            activeTab.connectionId!,
            planCacheQuery
          );

          // Extract XML plan from result - check all possible locations
          let xmlPlan: string | null = null;
          console.log("🔍 Plan cache query result structure:", {
            hasResult: !!xmlResult,
            isArray: Array.isArray(xmlResult),
            resultType: typeof xmlResult,
            hasRows: xmlResult?.rows ? xmlResult.rows.length : 0,
            hasColumns: xmlResult?.columns ? xmlResult.columns.length : 0,
            hasMessages: xmlResult?.messages ? xmlResult.messages.length : 0,
            messages: xmlResult?.messages,
            allKeys: xmlResult ? Object.keys(xmlResult) : [],
            columnNames: xmlResult?.columns?.map((c: any) => c.name) || [],
          });

          // If we got 0 rows, the plan cache query didn't find our query
          if (xmlResult?.rows && xmlResult.rows.length === 0) {
            console.log(
              "🔍 Plan cache query returned 0 rows - our query may not be in cache or timestamp mismatch"
            );

            // Try a broader search without timestamp
            const broadQuery = `
              SELECT TOP 5
                qp.query_plan as ExecutionPlanXML,
                qt.text as QueryText,
                cp.usecounts,
                cp.size_in_bytes
              FROM sys.dm_exec_cached_plans cp
              CROSS APPLY sys.dm_exec_query_plan(cp.plan_handle) qp
              CROSS APPLY sys.dm_exec_sql_text(cp.plan_handle) qt
              WHERE qt.text LIKE '%${query.substring(20, 50).trim()}%'
                AND qt.text NOT LIKE '%sys.dm_exec_cached_plans%'
                AND qp.query_plan IS NOT NULL
              ORDER BY cp.usecounts DESC
            `;

            console.log("🔍 Trying broader plan cache search...");
            xmlResult = await window.electronAPI.database.executeQuery(
              activeTab.connectionId!,
              broadQuery
            );
            console.log("🔍 Broader search result:", {
              hasRows: xmlResult?.rows ? xmlResult.rows.length : 0,
              columnNames: xmlResult?.columns?.map((c: any) => c.name) || [],
            });
          }

          // First check if the entire result is XML (common with SHOWPLAN_XML)
          if (
            typeof xmlResult === "string" &&
            (xmlResult as string).trim().startsWith("<")
          ) {
            console.log("🔍 Entire result is XML string");
            xmlPlan = xmlResult as string;
          }

          // Check messages array for XML content
          if (!xmlPlan && xmlResult?.messages) {
            console.log("🔍 Checking messages array for XML content");
            for (let i = 0; i < xmlResult.messages.length; i++) {
              const message = xmlResult.messages[i];
              console.log(`🔍 Message ${i}:`, {
                type: typeof message,
                length: typeof message === "string" ? message.length : "N/A",
                startsWithXml:
                  typeof message === "string" && message.trim().startsWith("<"),
                content:
                  typeof message === "string"
                    ? message.substring(0, 500)
                    : message,
              });

              if (
                typeof message === "string" &&
                message.trim().startsWith("<") &&
                (message.includes("ShowPlan") || message.includes("QueryPlan"))
              ) {
                xmlPlan = message;
                console.log(`✅ Found XML plan in messages[${i}]`);
                break;
              }
            }
          }

          // STATISTICS XML returns multiple result sets, check if we have an array
          let resultsToCheck = [];
          if (Array.isArray(xmlResult)) {
            resultsToCheck = xmlResult;
            console.log("🔍 Multiple result sets found:", xmlResult.length);
          } else {
            resultsToCheck = [xmlResult];
            console.log("🔍 Single result set found");
          }

          // Look for XML content in all result sets
          for (let i = 0; i < resultsToCheck.length; i++) {
            const result = resultsToCheck[i];
            console.log(`🔍 Checking result set ${i}:`, {
              hasRows: result?.rows?.length || 0,
              hasColumns: result?.columns?.length || 0,
              columnNames: result?.columns?.map((c: any) => c.name) || [],
            });

            if (result?.rows && result.rows.length > 0) {
              const firstRow = result.rows[0];
              console.log(`🔍 Result set ${i} first row content:`, firstRow);

              // Look specifically for ExecutionPlanXML field from plan cache query
              for (const [key, value] of Object.entries(firstRow)) {
                const isString = typeof value === "string";
                const startsWithXml = isString && value.trim().startsWith("<");
                const containsShowPlan =
                  isString &&
                  (value.includes("ShowPlan") ||
                    value.includes("<ShowPlanXML") ||
                    value.includes("QueryPlan") ||
                    value.includes("StatisticsProfile") ||
                    value.includes("<RelOp") ||
                    value.includes("ExecutionPlan"));

                // Special handling for ExecutionPlanXML field
                if (key === "ExecutionPlanXML" || key === "query_plan") {
                  console.log(`🔍 Found plan cache field '${key}':`, {
                    type: typeof value,
                    isString,
                    length: isString ? value.length : "N/A",
                    startsWithXml,
                    containsShowPlan,
                    preview: isString
                      ? value.substring(0, 500) +
                        (value.length > 500 ? "..." : "")
                      : value,
                  });

                  if (isString && startsWithXml && value.length > 50) {
                    xmlPlan = value;
                    console.log(
                      `✅ Found XML execution plan in plan cache field:`,
                      key
                    );
                    break;
                  }
                } else {
                  // Log other fields for debugging
                  console.log(`🔍 Field '${key}' analysis:`, {
                    type: typeof value,
                    isString,
                    length: isString ? value.length : "N/A",
                    startsWithXml,
                    containsShowPlan,
                    preview: isString
                      ? value.substring(0, 200) +
                        (value.length > 200 ? "..." : "")
                      : value,
                  });

                  // Fallback: accept any XML-like content
                  if (
                    !xmlPlan &&
                    isString &&
                    startsWithXml &&
                    containsShowPlan
                  ) {
                    xmlPlan = value;
                    console.log(
                      `✅ Found XML plan in result set ${i}, field:`,
                      key
                    );
                    break;
                  }
                }
              }

              if (xmlPlan) break;
            }
          }

          console.log("🔍 XML Plan result:", {
            hasXmlPlan: !!xmlPlan,
            xmlLength: xmlPlan?.length,
            startsWithXml: xmlPlan?.startsWith("<"),
            containsShowPlan: xmlPlan?.includes("<ShowPlanXML"),
          });

          if (xmlPlan) {
            // Create a mock result with the XML plan
            res = {
              columns: [],
              rows: [],
              rowCount: 0,
              executionTime: 0,
              messages: [
                "📊 SQL Server XML Execution Plan",
                "=".repeat(50),
                "",
                "✅ XML Execution Plan Generated Successfully",
                `📄 Plan Size: ${xmlPlan.length} characters`,
                "",
                "💡 Use the tree view below to explore the execution plan graphically",
              ],
              xmlExecutionPlan: xmlPlan,
            };
            actualQuery = `-- XML Execution Plan: ${query}`;
            console.log(
              "✅ Successfully set XML execution plan on result object"
            );
          } else {
            throw new Error("No XML execution plan returned");
          }
        } catch (_xmlError) {
          console.log(
            "❌ XML execution plan failed, falling back to text plan"
          );
          console.error("XML Error:", _xmlError);
          // Fall back to text execution plan
          try {
            // Also use separate batches for SHOWPLAN_TEXT
            await window.electronAPI.database.executeQuery(
              activeTab.connectionId!,
              `SET SHOWPLAN_TEXT ON`
            );

            res = await window.electronAPI.database.executeQuery(
              activeTab.connectionId!,
              query
            );

            await window.electronAPI.database.executeQuery(
              activeTab.connectionId!,
              `SET SHOWPLAN_TEXT OFF`
            );

            actualQuery = `-- Text Execution Plan: ${query}`;
          } catch (_textError) {
            // Final fallback: statistics only
            try {
              res = await window.electronAPI.database.executeQuery(
                activeTab.connectionId!,
                `SET STATISTICS IO ON;\nSET STATISTICS TIME ON;\n${query}`
              );
              actualQuery = `-- Query with Performance Statistics: ${query}`;
            } catch (_statsError) {
              // Ultimate fallback: just analyze the query structure
              res = {
                rows: [],
                messages: [`Unable to generate execution plan for: ${query}`],
                executionTime: 0,
              };
              actualQuery = `-- Query Analysis (Plan Unavailable): ${query}`;
            }
          }
        }
      } else {
        // For PostgreSQL and other databases, use standard EXPLAIN
        const prefix =
          activeTab.connectionType === "postgresql"
            ? "EXPLAIN ANALYZE "
            : "EXPLAIN ";
        actualQuery = prefix + query;
        res = await window.electronAPI.database.executeQuery(
          activeTab.connectionId!,
          actualQuery
        );
      }

      const columns =
        res.columns?.map((c: { name: string }) => c.name) ||
        (res.rows?.[0] ? Object.keys(res.rows[0]) : []);

      // For explain queries, we want to show the plan in Messages tab
      // Create formatted messages that include the execution plan
      const planMessages = [];

      if (activeTab.connectionType === "sqlserver") {
        // Check if we have XML execution plan
        if ((res as any).xmlExecutionPlan) {
          planMessages.push("📊 SQL Server XML Execution Plan");
          planMessages.push("=".repeat(50));
          planMessages.push("");
          planMessages.push("✅ XML Execution Plan Generated Successfully");
          planMessages.push("");

          const xmlContent = (res as any).xmlExecutionPlan;

          // Extract useful information from XML
          if (xmlContent.includes("StatementSubTreeCost")) {
            const costMatch = xmlContent.match(
              /StatementSubTreeCost="([^"]+)"/
            );
            if (costMatch) {
              planMessages.push(`💰 Estimated Cost: ${costMatch[1]}`);
            }
          }

          if (xmlContent.includes("PhysicalOp")) {
            const operations = xmlContent.match(/PhysicalOp="([^"]+)"/g);
            if (operations) {
              planMessages.push("");
              planMessages.push("🔧 Physical Operations:");
              const uniqueOps = [
                ...new Set(
                  operations
                    .map((op: string) => op.match(/"([^"]+)"/)?.[1])
                    .filter(Boolean)
                ),
              ] as string[];
              uniqueOps.slice(0, 8).forEach(op => {
                planMessages.push(`   • ${op}`);
              });
              if (uniqueOps.length > 8) {
                planMessages.push(
                  `   • ... and ${uniqueOps.length - 8} more operations`
                );
              }
            }
          }

          planMessages.push("");
          planMessages.push("💡 Tips for Graphical Visualization:");
          planMessages.push(
            "   • Copy this XML to SQL Server Management Studio"
          );
          planMessages.push(
            "   • Use 'Display Estimated Execution Plan' (Ctrl+L)"
          );
          planMessages.push("   • Save as .sqlplan file for sharing");
          planMessages.push("");
          planMessages.push("📄 Raw XML Plan:");
          planMessages.push("-".repeat(30));
          planMessages.push(xmlContent);
        } else {
          planMessages.push("📊 SQL Server Execution Plan Analysis");
          planMessages.push("=".repeat(50));

          if (res.messages && res.messages.length > 0) {
            planMessages.push(...res.messages);
          }

          // If we have execution plan data in rows, format it nicely
          if (res.rows && res.rows.length > 0) {
            planMessages.push("");
            planMessages.push("🔍 Execution Plan Details:");
            planMessages.push("-".repeat(30));

            res.rows.forEach((row: any, index: number) => {
              Object.entries(row).forEach(([key, value]) => {
                if (String(value).trim()) {
                  // Handle SHOWPLAN_TEXT output specially
                  if (
                    key.toLowerCase().includes("showplan") ||
                    key.toLowerCase().includes("plan")
                  ) {
                    const lines = String(value)
                      .split("\n")
                      .filter(line => line.trim());
                    lines.forEach(line => planMessages.push(line));
                  } else {
                    planMessages.push(`${key}: ${value}`);
                  }
                }
              });
              if (index < res.rows.length - 1) planMessages.push("");
            });
          }

          planMessages.push("");
          planMessages.push(
            "💡 Tip: For graphical plans, use SQL Server Management Studio"
          );
        }
      } else {
        planMessages.push("📊 Query Execution Plan");
        planMessages.push("=".repeat(30));

        if (res.rows && res.rows.length > 0) {
          res.rows.forEach((row: any) => {
            if (typeof row === "object") {
              Object.entries(row).forEach(([key, value]) => {
                planMessages.push(`${key}: ${value}`);
              });
            } else {
              planMessages.push(String(row));
            }
          });
        }

        if (res.messages && res.messages.length > 0) {
          planMessages.push("");
          planMessages.push("Additional Information:");
          planMessages.push(...res.messages);
        }
      }

      updateActiveTab({
        result: {
          query: actualQuery,
          columns,
          rows: res.rows || [],
          rowCount: res.rowCount || res.rows?.length || 0,
          executionTime: res.executionTime || 0,
          messages: planMessages,
          startTime: Date.now() - (res.executionTime || 0),
          endTime: Date.now(),
          xmlExecutionPlan: (res as any).xmlExecutionPlan, // Pass through XML plan data
        },
        status: "idle",
        activeResultTab: "messages", // Automatically switch to Messages tab
      });
      setShowResults(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      updateActiveTab({
        result: {
          query: `EXPLAIN: ${query}`,
          columns: [],
          rows: [],
          rowCount: 0,
          executionTime: 0,
          error: errorMessage,
          startTime: Date.now(),
          endTime: Date.now(),
        },
        status: "error",
        activeResultTab: "messages",
      });
    } finally {
      setIsExplainLoading(false);
    }
  };

  const formatSql = () => {
    if (!activeTab) return;
    try {
      setIsFormatLoading(true);
      const dialect =
        activeTab.connectionType === "postgresql"
          ? "postgresql"
          : activeTab.connectionType === "sqlserver"
            ? "transactsql"
            : "sql";
      const formatted = sqlFormat(activeTab.sql, { language: dialect as any });
      updateActiveTab({ sql: formatted });
    } catch {
      // Handle formatting errors silently
    } finally {
      setIsFormatLoading(false);
    }
  };

  const updateActiveTab = (patch: Partial<Tab>) => {
    setTabs(prev =>
      prev.map(t => (t.id === activeTabId ? { ...t, ...patch } : t))
    );
  };

  // Handle database selection change for current tab
  const handleDatabaseChange = (connectionId: string) => {
    if (!activeTab || !connectionId) return;

    const selectedConnection = connections.find(
      conn => conn.id === connectionId
    );
    if (selectedConnection) {
      updateActiveTab({
        connectionId: selectedConnection.id,
        connectionName: selectedConnection.name,
        connectionType: selectedConnection.type,
        // Clear results when changing database
        result: undefined,
        results: undefined,
        status: "idle",
      });
    }
  };

  // Function to format XML execution plan in a new tab
  const formatXmlPlan = (xmlContent: string) => {
    try {
      // Simple XML formatting
      const formatted = xmlContent
        .replace(/></g, ">\n<")
        .replace(/^\s*\n/gm, "")
        .split("\n")
        .map((line, index, arr) => {
          const trimmed = line.trim();
          if (!trimmed) return "";

          let depth = 0;
          // Count opening tags before this line
          for (let i = 0; i < index; i++) {
            const prevLine = arr[i].trim();
            const openTags = (prevLine.match(/<[^/!][^>]*>/g) || []).length;
            const closeTags = (prevLine.match(/<\/[^>]*>/g) || []).length;
            depth += openTags - closeTags;
          }

          // Adjust depth for current line
          if (trimmed.startsWith("</")) {
            depth = Math.max(0, depth - 1);
          }

          return "  ".repeat(depth) + trimmed;
        })
        .filter(line => line.trim())
        .join("\n");

      // Create a new tab with formatted XML
      const timestamp = new Date().toLocaleString();
      const newTab: Tab = {
        id: Date.now().toString(),
        title: `Execution Plan XML - ${timestamp}`,
        type: "content-viewer",
        content: formatted,
        contentType: "xml",
        sql: "",
        showFormatted: true,
        status: "idle",
        activeResultTab: "results",
      };

      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
    } catch (error) {
      console.error("Error formatting XML:", error);
      alert("Error formatting XML execution plan");
    }
  };

  // Function to save XML execution plan as .sqlplan file
  const saveAsSqlPlan = (xmlContent: string) => {
    try {
      const blob = new Blob([xmlContent], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Generate filename with timestamp
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 19);
      link.download = `execution-plan-${timestamp}.sqlplan`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error saving SQLPlan file:", error);
      alert("Error saving execution plan file");
    }
  };

  // Function to clear all query highlighting
  const clearQueryHighlighting = () => {
    if (!monacoEditorRef.current || decorationIdsRef.current.length === 0)
      return;

    const editor = monacoEditorRef.current;
    // Clear existing decorations using stored IDs
    decorationIdsRef.current = editor.deltaDecorations(
      decorationIdsRef.current,
      []
    );
  };

  // Function to filter table results based on search criteria
  const filterTableResults = (result: QueryResult) => {
    if (!searchFilter.value.trim()) return result; // No filter applied

    const filteredRows = result.rows.filter(row => {
      const searchTerm = searchFilter.value.toLowerCase().trim();

      if (!searchFilter.column) {
        // Search in all columns
        return result.columns.some(column => {
          const value = row[column];
          const stringValue =
            value !== null && value !== undefined
              ? String(value).toLowerCase()
              : "";
          return stringValue.includes(searchTerm);
        });
      } else {
        // Search in specific column
        const value = row[searchFilter.column];
        const stringValue =
          value !== null && value !== undefined
            ? String(value).toLowerCase()
            : "";
        return stringValue.includes(searchTerm);
      }
    });

    return {
      ...result,
      rows: filteredRows,
      rowCount: filteredRows.length,
    };
  };

  // Function to highlight a specific query in the Monaco Editor
  const highlightQuery = (queryIndex: number, sqlText: string) => {
    if (!monacoEditorRef.current || !monacoRef.current) return;

    const editor = monacoEditorRef.current;
    const monaco = monacoRef.current;

    try {
      // Clear any existing decorations first
      clearQueryHighlighting();

      // Parse the SQL to get individual queries
      const queries = parseSQLQueries(sqlText);

      if (queryIndex >= queries.length || queryIndex < 0) return;

      // Calculate line positions for the specific query
      let currentLine = 1;
      let startLine = 1;
      let endLine = 1;

      // Find the position of our target query
      for (let i = 0; i <= queryIndex; i++) {
        if (i === queryIndex) {
          startLine = currentLine;
          const queryLines = queries[i].split("\n").length;
          endLine = currentLine + queryLines - 1;
          break;
        } else {
          // Count lines in this query and the separator
          const queryLines = queries[i].split("\n").length;
          currentLine += queryLines;
          // Add one for the semicolon separator if not the last query
          if (i < queries.length - 1) {
            currentLine += 1;
          }
        }
      }

      // Highlight the target query and store decoration IDs
      const range = new monaco.Range(startLine, 1, endLine, 1);
      decorationIdsRef.current = editor.deltaDecorations(
        [],
        [
          {
            range,
            options: {
              className: "highlighted-query",
              isWholeLine: true,
              inlineClassName: "highlighted-query-text",
            },
          },
        ]
      );

      // Scroll to show the highlighted query
      editor.revealRange(range, monaco.editor.ScrollType.Smooth);
    } catch (error) {
      console.warn("Error highlighting query:", error);
    }
  };

  // Execute a query using a provided SQL string
  const execQueryWithSql = async (sqlString: string) => {
    if (!activeTab || !activeTab.connectionId || !window.electronAPI) return;
    try {
      updateActiveTab({ status: "running", startedAt: Date.now() });
      const res = await window.electronAPI.database.executeQuery(
        activeTab.connectionId,
        sqlString
      );
      const columns =
        res.columns?.map((c: any) => c.name) ||
        (res.rows[0] ? Object.keys(res.rows[0]) : []);
      updateActiveTab({
        sql: sqlString,
        result: {
          query: sqlString,
          columns,
          rows: res.rows || [],
          rowCount: res.rowCount || res.rows?.length || 0,
          executionTime: res.executionTime || 0,
          messages: res.messages || [],
          startTime: Date.now(),
          endTime: Date.now(),
        },
        status: "idle",
      });
      setShowResults(true);
    } catch (err: any) {
      updateActiveTab({
        result: {
          query: sqlString,
          columns: [],
          rows: [],
          rowCount: 0,
          executionTime: 0,
          error: err?.message || String(err),
          startTime: Date.now(),
          endTime: Date.now(),
        },
        status: "error",
        activeResultTab: "messages",
      });
    }
  };

  const applyOrderBy = async (column: string, dir: "ASC" | "DESC") => {
    if (!activeTab) return;
    const newSql = injectOrderBy(activeTab.sql, column, dir, activeResultIndex);
    setCurrentSort({ column, direction: dir });
    await execQueryWithSql(newSql);
  };

  const handleColumnHeaderClick = async (
    column: string,
    event?: React.MouseEvent
  ) => {
    if (!activeTab?.connectionId) return;

    // Check if Ctrl/Cmd key is held for multi-field sorting
    const isMultiSort = event?.ctrlKey || event?.metaKey;

    if (isMultiSort) {
      // Add to multi-sort fields
      addToSortFields(column);
    } else {
      // Traditional single-column sort
      // Toggle sort direction: if same column, switch direction; if new column, start with ASC
      let newDirection: "ASC" | "DESC" = "ASC";
      if (currentSort?.column === column) {
        newDirection = currentSort.direction === "ASC" ? "DESC" : "ASC";
      }

      await applyOrderBy(column, newDirection);
      // Clear multi-sort when doing single sort
      setSortFields([]);
    }
  };

  // Multi-field sorting functions
  const addToSortFields = (column: string) => {
    setSortFields(prev => {
      const existingIndex = prev.findIndex(field => field.column === column);
      if (existingIndex >= 0) {
        // Toggle direction if column already exists
        const updated = [...prev];
        updated[existingIndex].direction =
          updated[existingIndex].direction === "asc" ? "desc" : "asc";
        return updated;
      } else {
        // Add new column to sort
        return [...prev, { column, direction: "asc" as const }];
      }
    });
  };

  const applyMultiSort = async () => {
    if (!activeTab || sortFields.length === 0) return;
    const newSql = injectMultiOrderBy(
      activeTab.sql,
      sortFields,
      activeResultIndex
    );
    await execQueryWithSql(newSql);
    setCurrentSort(null); // Clear single sort when using multi-sort
  };

  const removeSortField = (column: string) => {
    setSortFields(prev => prev.filter(field => field.column !== column));
  };

  const clearAllSorts = () => {
    setSortFields([]);
    setCurrentSort(null);
  };

  // Clipboard helpers
  const writeClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {}
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-10000px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  };

  const stringifyCSV = (
    rows: Array<Record<string, unknown>>,
    columns: string[]
  ) => {
    const esc = (v: any) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    const header = columns.map(esc).join(",");
    const body = rows
      .map(r => columns.map(c => esc((r as any)[c])).join(","))
      .join("\n");
    return header + (body ? "\n" + body : "");
  };

  const copyCSV = async () => {
    if (!activeTab) return;
    const res = getCurrentResult(activeTab);
    if (!res || !res.columns?.length) return;
    const csv = stringifyCSV(res.rows || [], res.columns);
    await writeClipboard(csv);
  };

  const copyJSON = async () => {
    if (!activeTab) return;
    const res = getCurrentResult(activeTab);
    if (!res) return;
    const json = JSON.stringify(res.rows || [], null, 2);
    await writeClipboard(json);
  };

  const downloadText = (filename: string, content: string, mime: string) => {
    try {
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {}
  };

  const exportCSV = async () => {
    if (!activeTab) return;
    const res = getCurrentResult(activeTab);
    if (!res || !res.columns?.length) return;
    const csv = stringifyCSV(res.rows || [], res.columns);
    const base = activeTab?.title || "results";
    if (window.electronAPI?.export?.save) {
      await window.electronAPI.export.save({
        defaultPath: `${base}.csv`,
        filters: [{ name: "CSV", extensions: ["csv"] }],
        content: csv,
      });
    } else {
      downloadText(`${base}.csv`, csv, "text/csv;charset=utf-8;");
    }
  };

  const exportJSON = async () => {
    if (!activeTab) return;
    const res = getCurrentResult(activeTab);
    if (!res) return;
    const json = JSON.stringify(res.rows || [], null, 2);
    const base = activeTab?.title || "results";
    if (window.electronAPI?.export?.save) {
      await window.electronAPI.export.save({
        defaultPath: `${base}.json`,
        filters: [{ name: "JSON", extensions: ["json"] }],
        content: json,
      });
    } else {
      downloadText(`${base}.json`, json, "application/json;charset=utf-8;");
    }
  };

  // Listen for app menu actions coming from main
  useEffect(() => {
    const handler = async (action: string) => {
      switch (action) {
        case "records-copy-csv":
          copyCSV();
          break;
        case "records-copy-json":
          copyJSON();
          break;
        case "records-export-csv":
          exportCSV();
          break;
        case "records-export-json":
          exportJSON();
          break;
        case "file-open": {
          const res = await window.electronAPI?.files?.open();
          if (!res || res.canceled || !res.filePath) break;
          // Create or update a script tab with the opened file
          const title = res.filePath.split(/[\\/]/).pop() || "Untitled";
          const id = `file:${res.filePath}`;
          const existing = tabs.find(t => t.id === id);
          if (existing) {
            setTabs(prev =>
              prev.map(t =>
                t.id === id ? { ...t, sql: res.content || "" } : t
              )
            );
            setActiveTabId(id);
          } else {
            const newTab: Tab = {
              id,
              type: "sql",
              title,
              sql: res.content || "",
              filePath: res.filePath,
              activeResultTab: "results",
            } as Tab;
            setTabs(prev => [...prev, newTab]);
            setActiveTabId(id);
          }
          setShowResults(false);
          break;
        }
        case "file-save": {
          if (!activeTab) break;

          // Determine content and extension based on tab type
          const isContentViewer = activeTab.type === "content-viewer";
          const content = isContentViewer
            ? activeTab.content || ""
            : activeTab.sql;
          const extension = isContentViewer
            ? activeTab.contentType || "txt"
            : "sql";

          if (activeTab.filePath) {
            await window.electronAPI?.files?.write(activeTab.filePath, content);
          } else {
            const suggested =
              (activeTab.title?.replace(/\s+/g, "_") || "query") +
              `.${extension}`;
            const res = await window.electronAPI?.files?.saveDialog({
              defaultPath: suggested,
            });
            if (!res || res.canceled || !res.filePath) break;
            await window.electronAPI?.files?.write(res.filePath, content);
            setTabs(prev =>
              prev.map(t =>
                t.id === activeTab.id
                  ? {
                      ...t,
                      filePath: res.filePath,
                      title: res.filePath!.split(/[\\/]/).pop() || t.title,
                    }
                  : t
              )
            );
          }
          break;
        }
        case "file-save-as": {
          if (!activeTab) break;

          // Determine content and extension based on tab type
          const isContentViewer = activeTab.type === "content-viewer";
          const content = isContentViewer
            ? activeTab.content || ""
            : activeTab.sql;
          const extension = isContentViewer
            ? activeTab.contentType || "txt"
            : "sql";

          const suggested =
            (activeTab.title?.replace(/\s+/g, "_") || "query") +
            `.${extension}`;
          const res = await window.electronAPI?.files?.saveDialog({
            defaultPath: activeTab.filePath || suggested,
          });
          if (!res || res.canceled || !res.filePath) break;
          await window.electronAPI?.files?.write(res.filePath, content);
          setTabs(prev =>
            prev.map(t =>
              t.id === activeTab.id
                ? {
                    ...t,
                    filePath: res.filePath,
                    title: res.filePath!.split(/[\\/]/).pop() || t.title,
                  }
                : t
            )
          );
          break;
        }
      }
    };
    window.electronAPI?.onMenuAction(handler);
    return () => window.electronAPI?.removeAllListeners?.("menu-action");
  }, [activeTab]);

  // Broadcast workspace context to AI when sharing is enabled
  useEffect(() => {
    if (!shareContextWithAI || !activeTab) {
      // Clear context when sharing is disabled or no active tab
      const event = new CustomEvent("workspace-context-change", {
        detail: { enabled: false, context: null },
      });
      document.dispatchEvent(event);
      return;
    }

    // Get current query and results
    const currentResult = getCurrentResult(activeTab);
    const context = {
      enabled: true,
      query: activeTab.sql?.trim() || null,
      results: currentResult
        ? {
            columns: currentResult.columns || [],
            rowCount: currentResult.rowCount || 0,
            executionTime: currentResult.executionTime || 0,
            // Include a sample of the data (first 5 rows) for context
            sampleRows: (currentResult.rows || []).slice(0, 5),
            error: currentResult.error || null,
            connectionName: activeTab.connectionName || null,
            database: activeTab.database || null,
            connectionType: activeTab.connectionType || null,
          }
        : null,
    };

    // Broadcast the context
    const event = new CustomEvent("workspace-context-change", {
      detail: context,
    });
    document.dispatchEvent(event);
  }, [
    shareContextWithAI,
    activeTab,
    activeTab?.sql,
    activeTab?.result,
    activeTab?.results,
    activeResultIndex,
  ]);

  // Listen for new tab creation events from main process
  useEffect(() => {
    const handler = (tabData: {
      id: string;
      title: string;
      sql: string;
      connectionId?: string;
      connectionName?: string;
      connectionType?: string;
      database?: string;
      activeResultTab: "results" | "messages";
      autoExecute?: boolean;
    }) => {
      console.log("Creating new tab from main process:", tabData);

      // Check if tab already exists
      const existing = tabs.find(t => t.id === tabData.id);
      if (existing) {
        setActiveTabId(existing.id);
        return;
      }

      // Create new tab
      const newTab: Tab = {
        ...tabData,
      };

      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);

      // Auto-execute query if requested
      if (tabData.autoExecute && tabData.sql.trim() && tabData.connectionId) {
        // Use setTimeout to ensure the tab is fully created and active before running the query
        setTimeout(async () => {
          console.log("Auto-executing query for new tab:", tabData.id);

          // Execute query directly on the new tab instead of relying on activeTab
          try {
            const res = await window.electronAPI.database.executeQuery(
              tabData.connectionId!,
              tabData.sql
            );
            const columns =
              res.columns?.map(c => c.name) ||
              (res.rows[0] ? Object.keys(res.rows[0]) : []);

            // Update the specific tab with results
            setTabs(prev =>
              prev.map(tab =>
                tab.id === tabData.id
                  ? {
                      ...tab,
                      result: {
                        query: tabData.sql,
                        columns,
                        rows: res.rows || [],
                        rowCount: res.rowCount || res.rows?.length || 0,
                        executionTime: res.executionTime || 0,
                        messages: res.messages || [],
                        startTime: Date.now() - (res.executionTime || 0),
                        endTime: Date.now(),
                      },
                      status: "idle",
                      activeResultTab: "results",
                    }
                  : tab
              )
            );
            setShowResults(true);
            console.log(
              "Auto-execution completed successfully for tab:",
              tabData.id
            );
          } catch (err: any) {
            console.error("Auto-execution failed:", err);
            // Update tab with error
            setTabs(prev =>
              prev.map(tab =>
                tab.id === tabData.id
                  ? {
                      ...tab,
                      result: {
                        query: tabData.sql,
                        columns: [],
                        rows: [],
                        rowCount: 0,
                        executionTime: 0,
                        error: err?.message || String(err),
                        startTime: Date.now(),
                        endTime: Date.now(),
                      },
                      status: "idle",
                      activeResultTab: "results",
                    }
                  : tab
              )
            );
          }
        }, 300);
      }
    };

    // Temporarily disabled until preload script is properly loaded
    // window.electronAPI?.onCreateNewTab(handler);
    // return () => window.electronAPI?.removeAllListeners?.("create-new-tab");

    if (window.electronAPI?.onCreateNewTab) {
      window.electronAPI.onCreateNewTab(handler);
      return () => window.electronAPI?.removeAllListeners?.("create-new-tab");
    }
  }, [tabs]);

  // Global F5 handler to run query and prevent window reload in Electron
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F5") {
        e.preventDefault();
        e.stopPropagation();
        runQuery();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [activeTab]);

  // Close menus on global click
  useEffect(() => {
    const closer = () => {
      setResultMenu(prev => (prev.show ? { ...prev, show: false } : prev));
      setColumnMenu(prev => (prev.show ? { ...prev, show: false } : prev));
      setTabContextMenu(prev => (prev.show ? { ...prev, show: false } : prev));
      setShowTabDropdown(false);
    };
    window.addEventListener("click", closer);
    return () => window.removeEventListener("click", closer);
  }, []);

  // Column resize
  const startResize = (colKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    const th = headerRefs[colKey];
    if (!th) return;
    resizingCol.key = colKey;
    resizingCol.startX = e.clientX;
    resizingCol.startWidth = th.getBoundingClientRect().width;
    window.addEventListener("mousemove", onResizeMove);
    window.addEventListener("mouseup", onResizeUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const onResizeMove = (e: MouseEvent) => {
    if (!activeTab || !resizingCol.key) return;
    const delta = e.clientX - resizingCol.startX;
    const width = Math.max(60, Math.min(1200, resizingCol.startWidth + delta));
    const next = {
      ...(activeTab.columnWidths || {}),
      [resizingCol.key]: width,
    };
    updateActiveTab({ columnWidths: next });
  };

  const onResizeUp = () => {
    resizingCol.key = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    window.removeEventListener("mousemove", onResizeMove);
    window.removeEventListener("mouseup", onResizeUp);
  };

  const autoFitColumns = () => {
    if (!activeTab?.result) return;
    const cols = activeTab.result.columns;
    const rows = activeTab.result.rows || [];
    const charPx = 8; // approx per char width
    const pad = 16; // cell padding
    const sample = rows.slice(0, 200);
    const next: Record<string, number> = {};
    cols.forEach(c => {
      let maxLen = String(c).length;
      for (const r of sample) {
        const v = (r as any)[c];
        const s = v === null || v === undefined ? "" : String(v);
        if (s.length > maxLen) maxLen = s.length;
      }
      next[c] = Math.max(80, Math.min(800, Math.round(maxLen * charPx + pad)));
    });
    updateActiveTab({ columnWidths: next });
  };

  const resetColumnWidths = () => {
    updateActiveTab({ columnWidths: {} });
  };

  return (
    <div className="h-full flex-1 flex flex-col bg-background text-foreground min-w-0">
      {/* Tabs Header */}
      <div className="flex items-center border-b border-border bg-muted min-w-0">
        <div className="flex items-center overflow-x-auto flex-1 min-w-0">
          {tabs.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-500"></div>
          ) : (
            tabs.map(tab => (
              <div
                key={tab.id}
                className={`flex items-center gap-2 h-8 px-2.5 text-sm cursor-pointer border-r border-border flex-shrink-0 relative ${
                  activeTabId === tab.id
                    ? "bg-background text-foreground shadow-sm border-b-2 border-b-blue-500"
                    : "bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
                onClick={() => setActiveTabId(tab.id)}
                onContextMenu={e => handleTabRightClick(e, tab.id)}
              >
                <span
                  className="truncate max-w-[180px]"
                  title={`${tab.connectionName || ""} • ${tab.title}`}
                >
                  {tab.title}
                </span>
                <button
                  className="text-xs hover:text-red-500 opacity-70 hover:opacity-100"
                  onClick={e => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>

        {/* Tab Dropdown Button */}
        {tabs.length > 0 && (
          <div className="relative">
            <button
              className="h-8 px-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent border-l border-border flex items-center gap-1"
              onClick={e => {
                e.stopPropagation();
                setShowTabDropdown(!showTabDropdown);
              }}
              title="All tabs"
            >
              <span className="text-xs">⏷</span>
              <span className="hidden sm:inline text-xs">{tabs.length}</span>
            </button>

            {/* Tab Dropdown Menu */}
            {showTabDropdown && (
              <div className="absolute right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg z-50 min-w-[200px] max-h-[300px] overflow-y-auto">
                <div className="py-1">
                  {tabs.map((tab, index) => (
                    <button
                      key={tab.id}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2 ${
                        activeTabId === tab.id
                          ? "bg-accent/50 text-foreground font-medium"
                          : "text-muted-foreground"
                      }`}
                      onClick={e => {
                        e.stopPropagation();
                        setActiveTabId(tab.id);
                        setShowTabDropdown(false);
                      }}
                    >
                      <span className="flex-shrink-0 text-xs text-muted-foreground w-6 text-center">
                        {index + 1}
                      </span>
                      <span className="truncate flex-1">{tab.title}</span>
                      {tab.connectionName && (
                        <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                          {tab.connectionName}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toolbar (only when a tab is active and not edit-data or content-viewer) */}
      {activeTab &&
        activeTab.type !== "edit-data" &&
        activeTab.type !== "content-viewer" && (
          <div className="border-b border-border px-4 py-3 bg-muted flex-shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={runQuery}
                disabled={!activeTab?.connectionId || isRunLoading}
                className="h-8 px-3 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isRunLoading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                Run
              </button>
              <button
                onClick={explainQuery}
                disabled={!activeTab?.connectionId || isExplainLoading}
                className="h-8 px-3 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isExplainLoading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                Explain
              </button>
              <button
                onClick={formatSql}
                disabled={isFormatLoading}
                className="h-8 px-3 bg-amber-600 text-white rounded text-sm hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isFormatLoading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                Format
              </button>

              {/* AI Context Sharing Toggle */}
              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border">
                <label
                  htmlFor="ai-context-toggle"
                  className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground"
                  title={
                    shareContextWithAI
                      ? "Query and results are shared with AI Assistant"
                      : "Click to share query and results with AI Assistant"
                  }
                >
                  <input
                    id="ai-context-toggle"
                    type="checkbox"
                    checked={shareContextWithAI}
                    onChange={e => setShareContextWithAI(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-background border-border rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="whitespace-nowrap">🤖 Share with AI</span>
                </label>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-xs text-muted-foreground whitespace-nowrap">
                Database:
              </label>
              <select
                value={activeTab?.connectionId || ""}
                onChange={e => handleDatabaseChange(e.target.value)}
                className="px-2 py-1 text-xs border border-border rounded bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-xs"
              >
                <option value="">Select Database...</option>
                {connections.map(conn => (
                  <option key={conn.id} value={conn.id}>
                    {conn.name} ({conn.type})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

      {/* Editor + Results / EditableDataGrid */}
      {activeTab ? (
        activeTab.type === "edit-data" ? (
          <div className="flex-1 min-h-0">
            <EditableDataGrid
              connectionId={activeTab.connectionId!}
              connectionType={activeTab.connectionType}
              schema={activeTab.schema!}
              table={activeTab.table!}
              onStatusChange={(status, _message) => {
                // Update tab status if needed
                updateActiveTab({
                  status:
                    status === "loading"
                      ? "running"
                      : status === "saving"
                        ? "running"
                        : "idle",
                });
              }}
            />
          </div>
        ) : activeTab.type === "content-viewer" ? (
          <div className="flex-1 min-h-0 p-4">
            <div className="h-full border border-border rounded bg-card overflow-hidden flex flex-col">
              <div className="flex items-center justify-between border-b border-border px-3 py-2 bg-muted/50 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-sm">
                    {activeTab.title.replace("📄 ", "")}
                  </h3>
                  <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full font-mono">
                    {activeTab.contentType?.toUpperCase() || "TEXT"}
                  </span>
                  {activeTab.showFormatted ? (
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full font-mono">
                      FORMATTED
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full font-mono">
                      RAW
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {activeTab.showFormatted
                      ? activeTab.content?.length || 0
                      : activeTab.rawContent?.length || 0}{" "}
                    characters
                  </span>
                  <button
                    onClick={() => {
                      const contentToCopy = activeTab.showFormatted
                        ? activeTab.content
                        : activeTab.rawContent;
                      if (contentToCopy) {
                        navigator.clipboard.writeText(contentToCopy);
                      }
                    }}
                    className="px-2 py-1 bg-muted text-foreground rounded hover:bg-accent transition-colors"
                    title="Copy to clipboard"
                  >
                    📋 Copy
                  </button>
                  <button
                    onClick={() => {
                      updateActiveTab({
                        showFormatted: !activeTab.showFormatted,
                      });
                    }}
                    className="px-2 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                    title={
                      activeTab.showFormatted
                        ? "Show raw content"
                        : "Show formatted content"
                    }
                  >
                    {activeTab.showFormatted ? "🔧 Raw" : "✨ Format"}
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                {(() => {
                  const currentContent = activeTab.showFormatted
                    ? activeTab.content
                    : activeTab.rawContent;
                  const useMonaco =
                    activeTab.showFormatted &&
                    activeTab.contentType &&
                    [
                      "json",
                      "xml",
                      "html",
                      "sql",
                      "yaml",
                      "javascript",
                      "css",
                    ].includes(activeTab.contentType);

                  if (useMonaco) {
                    return (
                      <Editor
                        height="100%"
                        language={(() => {
                          const type = activeTab.contentType;
                          switch (type) {
                            case "javascript":
                              return "javascript";
                            case "sql":
                              return "sql";
                            case "json":
                              return "json";
                            case "html":
                              return "html";
                            case "xml":
                              return "xml";
                            case "yaml":
                              return "yaml";
                            case "css":
                              return "css";
                            default:
                              return "plaintext";
                          }
                        })()}
                        value={currentContent || "No content"}
                        options={{
                          readOnly: true,
                          minimap: { enabled: false },
                          fontSize: 13,
                          lineNumbers: "on",
                          wordWrap: "on",
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                          folding: true,
                          renderWhitespace: "selection",
                          contextmenu: true,
                          selectOnLineNumbers: true,
                        }}
                        theme={theme === "dark" ? "vs-dark" : "vs"}
                      />
                    );
                  } else {
                    return (
                      <div className="p-4 h-full overflow-auto">
                        <pre className="whitespace-pre-wrap break-words text-sm font-mono bg-muted/30 p-4 rounded border">
                          {currentContent || "No content"}
                        </pre>
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {(() => {
              const resultsVisible =
                showResults && !!getCurrentResult(activeTab);
              return (
                <div
                  className={
                    resultsVisible ? "flex-shrink-0 p-2" : "flex-1 p-2 min-w-0"
                  }
                  style={resultsVisible ? { height: sqlHeight } : undefined}
                >
                  <div className="h-full border border-border rounded bg-background overflow-hidden min-w-0">
                    <Editor
                      height="100%"
                      defaultLanguage="sql"
                      value={activeTab.sql}
                      onChange={v => updateActiveTab({ sql: v || "" })}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        wordWrap: "on",
                      }}
                      theme={
                        theme === "dark"
                          ? "sql-custom-dark"
                          : "sql-custom-light"
                      }
                      onMount={(editor, monaco) => {
                        // Store editor and monaco references for highlighting
                        monacoEditorRef.current = editor;
                        monacoRef.current = monaco;

                        // Define simplified SQL syntax highlighting themes - following style3.txt
                        monaco.editor.defineTheme("sql-custom-light", {
                          base: "vs",
                          inherit: true,
                          rules: [
                            { token: "keyword.sql", foreground: "2563EB" }, // Keywords - blue
                            { token: "string.sql", foreground: "059669" }, // Strings - green
                            {
                              token: "comment.sql",
                              foreground: "6B7280",
                              fontStyle: "italic",
                            }, // Comments - gray
                          ],
                          colors: {
                            "editor.background": "#FFFFFF",
                            "editor.foreground": "#000000", // Pure black for light mode
                            "editorLineNumber.foreground": "#6B7280",
                            "editor.selectionBackground": "#DBEAFE",
                            "editor.lineHighlightBackground": "#F8FAFC",
                          },
                        });

                        monaco.editor.defineTheme("sql-custom-dark", {
                          base: "vs-dark",
                          inherit: true,
                          rules: [
                            { token: "keyword.sql", foreground: "60A5FA" }, // Keywords - blue
                            { token: "string.sql", foreground: "10B981" }, // Strings - green
                            {
                              token: "comment.sql",
                              foreground: "9CA3AF",
                              fontStyle: "italic",
                            }, // Comments - gray
                          ],
                          colors: {
                            "editor.background": "#1F2937",
                            "editor.foreground": "#FFFFFF", // Pure white for dark mode
                            "editorLineNumber.foreground": "#9CA3AF",
                            "editor.selectionBackground": "#243B66",
                            "editor.lineHighlightBackground": "#374151",
                          },
                        });

                        editor.addCommand(
                          monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
                          () => {
                            if (!isRunLoading) {
                              runQuery();
                            }
                          }
                        );
                        editor.addCommand(
                          monaco.KeyMod.CtrlCmd |
                            monaco.KeyMod.Shift |
                            monaco.KeyCode.Enter,
                          () => {
                            if (!isExplainLoading) {
                              explainQuery();
                            }
                          }
                        );
                        // F5 to run query inside editor
                        editor.addCommand(monaco.KeyCode.F5, () => {
                          if (!isRunLoading) {
                            runQuery();
                          }
                        });
                        editor.addCommand(
                          monaco.KeyMod.CtrlCmd |
                            monaco.KeyMod.Shift |
                            monaco.KeyCode.KeyF,
                          () => formatSql()
                        );

                        const updatePos = () => {
                          const pos = editor.getPosition();
                          if (pos)
                            updateActiveTab({
                              editorPos: {
                                line: pos.lineNumber,
                                column: pos.column,
                              },
                            });
                        };
                        updatePos();
                        editor.onDidChangeCursorPosition(() => updatePos());
                        editor.onDidFocusEditorText(() => {
                          updateActiveTab({ editorFocused: true });
                          // Clear query highlighting when user clicks in editor
                          clearQueryHighlighting();
                        });
                        editor.onDidBlurEditorText(() =>
                          updateActiveTab({ editorFocused: false })
                        );
                      }}
                    />
                  </div>
                </div>
              );
            })()}

            {showResults && !!getCurrentResult(activeTab) && (
              <Resizer
                direction="vertical"
                onResize={delta =>
                  setSqlHeight(prev =>
                    Math.max(200, Math.min(800, prev + delta))
                  )
                }
                className="border-t border-border"
              />
            )}

            {showResults && !!getCurrentResult(activeTab) && (
              <div className="flex-1 min-h-[160px] bg-muted p-2 overflow-hidden">
                <div className="h-full border border-border rounded bg-background flex flex-col min-w-0">
                  <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-3 py-2 text-sm">
                    <div className="flex items-center gap-1">
                      <button
                        className={`h-8 px-2.5 rounded font-medium ${
                          (activeTab.activeResultTab ?? "results") === "results"
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        }`}
                        onClick={() =>
                          updateActiveTab({ activeResultTab: "results" })
                        }
                      >
                        Results
                      </button>
                      <button
                        className={`h-8 px-2.5 rounded font-medium ${
                          (activeTab.activeResultTab ?? "results") ===
                          "messages"
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        }`}
                        onClick={() =>
                          updateActiveTab({ activeResultTab: "messages" })
                        }
                      >
                        Messages
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      {sortFields.length > 0 && (
                        <button
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium transition-colors duration-150 shadow-sm text-xs"
                          onClick={() => setShowSortManager(true)}
                          title={`Manage ${sortFields.length} sort field${sortFields.length > 1 ? "s" : ""}`}
                        >
                          📊 Sort ({sortFields.length})
                        </button>
                      )}
                      <button
                        className="px-3 py-1.5 bg-muted text-foreground rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors duration-150 shadow-sm"
                        onClick={autoFitColumns}
                        disabled={!activeTab?.result?.columns?.length}
                      >
                        Auto-fit
                      </button>
                      <button
                        className="px-3 py-1.5 bg-muted text-foreground rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors duration-150 shadow-sm"
                        onClick={resetColumnWidths}
                        disabled={!activeTab?.result?.columns?.length}
                      >
                        Reset widths
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto">
                    {(() => {
                      const rawResult = getCurrentResult(activeTab);
                      const currentResult = rawResult
                        ? filterTableResults(rawResult)
                        : null;

                      if (currentResult?.error) {
                        return (
                          <div className="p-3 text-sm text-red-600">
                            {currentResult.error}
                          </div>
                        );
                      }

                      if (
                        (activeTab.activeResultTab ?? "results") === "messages"
                      ) {
                        // Check if we have XML execution plan data
                        const hasXmlPlan = currentResult?.xmlExecutionPlan;
                        console.log("🔍 Messages tab render check:", {
                          hasCurrentResult: !!currentResult,
                          hasXmlPlan: !!hasXmlPlan,
                          xmlPlanType: typeof currentResult?.xmlExecutionPlan,
                          xmlPlanLength:
                            currentResult?.xmlExecutionPlan?.length,
                        });

                        return (
                          <div className="p-3 space-y-4">
                            {/* Show ExecutionPlanViewer if we have XML plan data */}
                            {hasXmlPlan && currentResult.xmlExecutionPlan && (
                              <div>
                                <div className="text-sm text-green-600 mb-2">
                                  🌳 SQL Server Execution Plan
                                </div>
                                <ExecutionPlanViewer
                                  xmlContent={currentResult.xmlExecutionPlan}
                                  onFormatXml={() =>
                                    currentResult.xmlExecutionPlan &&
                                    formatXmlPlan(
                                      currentResult.xmlExecutionPlan
                                    )
                                  }
                                  onSaveAsSqlPlan={() =>
                                    currentResult.xmlExecutionPlan &&
                                    saveAsSqlPlan(
                                      currentResult.xmlExecutionPlan
                                    )
                                  }
                                />
                              </div>
                            )}

                            {/* Show regular messages */}
                            <div className="text-xs space-y-1">
                              {currentResult?.messages &&
                              currentResult.messages.length > 0 ? (
                                (() => {
                                  let filteredMessages = currentResult.messages;

                                  // If we have XML execution plan, filter out the raw XML section
                                  if (hasXmlPlan) {
                                    const rawXmlStart =
                                      filteredMessages.findIndex(
                                        msg =>
                                          msg.includes("📄 Raw XML Plan:") ||
                                          msg.includes("Raw XML Plan")
                                      );
                                    if (rawXmlStart !== -1) {
                                      filteredMessages = filteredMessages.slice(
                                        0,
                                        rawXmlStart
                                      );
                                    }
                                  }

                                  return filteredMessages.map((m, i) => (
                                    <div key={i} className="text-foreground/80">
                                      {m}
                                    </div>
                                  ));
                                })()
                              ) : (
                                <div className="text-muted-foreground">
                                  No messages
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      if (!currentResult) {
                        console.log("🔧 No current result to display");
                        return null;
                      }

                      const hasRows =
                        currentResult.rows && currentResult.rows.length > 0;
                      console.log("🔧 Rendering result check:", {
                        hasCurrentResult: !!currentResult,
                        rowsLength: currentResult.rows?.length,
                        hasRows,
                        columns: currentResult.columns,
                      });

                      if (!hasRows) {
                        return (
                          <div className="p-3 text-sm text-muted-foreground">
                            No rows returned
                          </div>
                        );
                      }

                      return (
                        <div className="flex flex-col h-full">
                          {/* Multiple Results Navigation */}
                          {activeTab.results &&
                            activeTab.results.length > 1 && (
                              <div className="flex items-center overflow-x-auto border-b border-border bg-secondary min-w-0">
                                <span className="px-3 py-2 text-sm text-muted-foreground flex-shrink-0 font-medium">
                                  Results:
                                </span>
                                {activeTab.results.map((result, index) => (
                                  <button
                                    key={index}
                                    className={`h-8 px-2.5 text-sm border-r border-border flex-shrink-0 transition-colors duration-150 font-medium rounded-lg relative ${
                                      activeResultIndex === index
                                        ? "bg-[#E0F2FE] dark:bg-[#1F2937] text-[#2563EB] dark:text-[#60A5FA]"
                                        : "bg-transparent text-[#6B7280] dark:text-[#9CA3AF] hover:bg-accent hover:text-foreground"
                                    }`}
                                    onClick={() => {
                                      console.log(
                                        "🔧 Switching to result index:",
                                        index
                                      );

                                      // If clicking the same tab that's already active, clear highlighting
                                      if (activeResultIndex === index) {
                                        clearQueryHighlighting();
                                      } else {
                                        // Switch to new tab and highlight corresponding query
                                        setActiveResultIndex(index);
                                        if (activeTab?.sql) {
                                          highlightQuery(index, activeTab.sql);
                                        }
                                      }
                                    }}
                                  >
                                    Query {index + 1} ({result.rowCount || 0}{" "}
                                    rows)
                                    {activeResultIndex === index && (
                                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563EB] dark:bg-[#60A5FA] rounded-t"></div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}

                          {/* Search/Filter Interface */}
                          <div className="h-10 px-4 flex items-center border-b border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
                            <div className="flex items-center gap-3 w-full">
                              <label className="text-sm text-black dark:text-white font-medium flex-shrink-0">
                                Search:
                              </label>
                              <select
                                className="h-8 text-sm px-3 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-black dark:text-white min-w-[140px] focus:outline-2 focus:outline-blue-500 focus:outline-offset-2"
                                value={searchFilter.column}
                                onChange={e =>
                                  setSearchFilter(prev => ({
                                    ...prev,
                                    column: e.target.value,
                                  }))
                                }
                              >
                                <option value="">All columns</option>
                                {currentResult.columns.map((column, i) => (
                                  <option key={i} value={column}>
                                    {column}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                className="h-8 text-sm px-3 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-black dark:text-white flex-1 min-w-[200px] focus:outline-2 focus:outline-blue-500 focus:outline-offset-2 placeholder-gray-400"
                                placeholder={
                                  searchFilter.column
                                    ? `Search in ${searchFilter.column}...`
                                    : "Search in all columns..."
                                }
                                value={searchFilter.value}
                                onChange={e =>
                                  setSearchFilter(prev => ({
                                    ...prev,
                                    value: e.target.value,
                                  }))
                                }
                              />
                              {searchFilter.value && (
                                <button
                                  className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-800 text-black dark:text-white rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                                  onClick={() =>
                                    setSearchFilter({ column: "", value: "" })
                                  }
                                  title="Clear search"
                                >
                                  Clear
                                </button>
                              )}
                              {/* Filter result count */}
                              <span className="text-sm text-[#6B7280] dark:text-[#9CA3AF] font-medium flex-shrink-0">
                                {searchFilter.value
                                  ? `${currentResult.rows.length} of ${rawResult?.rows.length || 0} rows`
                                  : `${currentResult.rows.length} rows`}
                              </span>
                            </div>
                          </div>

                          {/* Results Table */}
                          <div
                            className="w-full h-full overflow-auto"
                            onContextMenu={e => {
                              e.preventDefault();
                              const result = getCurrentResult(activeTab);
                              if (!result) return;
                              setResultMenu({
                                x: e.clientX,
                                y: e.clientY,
                                show: true,
                              });
                            }}
                          >
                            <table className="w-full text-sm">
                              <thead className="sticky top-0 bg-white dark:bg-gray-800 z-10">
                                <tr>
                                  {currentResult.columns.map((c, i) => (
                                    <th
                                      key={i}
                                      ref={el => {
                                        (headerRefs as any)[c] = el;
                                      }}
                                      className="h-10 text-left px-2.5 border-b border-gray-200 dark:border-gray-600 whitespace-nowrap relative cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 font-medium text-black dark:text-white"
                                      style={
                                        activeTab.columnWidths?.[c]
                                          ? { width: activeTab.columnWidths[c] }
                                          : { minWidth: "120px" }
                                      }
                                      onClick={e =>
                                        handleColumnHeaderClick(c, e)
                                      }
                                      onContextMenu={e => {
                                        e.preventDefault();
                                        if (!activeTab?.connectionId) return;
                                        setColumnMenu({
                                          x: e.clientX,
                                          y: e.clientY,
                                          show: true,
                                          column: c,
                                        });
                                      }}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold">
                                          {c}
                                        </span>
                                        {currentSort?.column === c && (
                                          <span className="ml-2 text-sm">
                                            {currentSort.direction === "ASC"
                                              ? "↑"
                                              : "↓"}
                                          </span>
                                        )}
                                      </div>
                                      <span
                                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-[#2563EB]/60"
                                        onMouseDown={e => startResize(c, e)}
                                      />
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {currentResult.rows.map((r, i) => (
                                  <tr
                                    key={i}
                                    className={`hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                                      i % 2 === 0
                                        ? "bg-white dark:bg-gray-800"
                                        : "bg-gray-50 dark:bg-gray-750"
                                    }`}
                                  >
                                    {currentResult.columns.map((c, j) => {
                                      const {
                                        content,
                                        shouldTruncate,
                                        originalLength,
                                      } = getTruncatedContent(r[c]);
                                      return (
                                        <td
                                          key={j}
                                          className="px-2.5 py-2.5 align-top border-b border-gray-200 dark:border-gray-600"
                                          style={
                                            activeTab.columnWidths?.[c]
                                              ? {
                                                  width:
                                                    activeTab.columnWidths[c],
                                                }
                                              : undefined
                                          }
                                        >
                                          <div className="relative group">
                                            {(() => {
                                              const cellValue = r[c];
                                              const isUrl =
                                                typeof cellValue === "string" &&
                                                /^https?:\/\//.test(cellValue);

                                              if (isUrl) {
                                                return (
                                                  <a
                                                    href={cellValue}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 dark:text-blue-400 hover:underline break-words text-sm"
                                                  >
                                                    {content}
                                                  </a>
                                                );
                                              } else {
                                                return (
                                                  <span
                                                    className="text-sm text-black dark:text-white break-words"
                                                    title={
                                                      shouldTruncate
                                                        ? String(cellValue)
                                                        : undefined
                                                    }
                                                  >
                                                    {content}
                                                  </span>
                                                );
                                              }
                                            })()}
                                            {shouldTruncate && (
                                              <button
                                                className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 bg-blue-600 text-white text-xs px-2 py-1 rounded hover:bg-blue-700"
                                                onClick={() => {
                                                  const fullContent =
                                                    formatCell(r[c]);
                                                  const title = `${c} (${originalLength} chars)`;
                                                  openContentTab(
                                                    fullContent,
                                                    title
                                                  );
                                                }}
                                                title={`Show full content (${originalLength} characters)`}
                                              >
                                                📄 View All
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  {/* Status Bar */}
                  <StatusBar tab={activeTab} />
                  {/* Context Menus */}
                  {resultMenu.show && (
                    <div
                      className="fixed z-50 border border-border rounded shadow-lg text-xs isolate mix-blend-normal overflow-hidden bg-[hsl(var(--modal))] text-[hsl(var(--modal-foreground))]"
                      style={{ left: resultMenu.x, top: resultMenu.y }}
                      onMouseLeave={() =>
                        setResultMenu(prev => ({ ...prev, show: false }))
                      }
                      onClick={() =>
                        setResultMenu(prev => ({ ...prev, show: false }))
                      }
                    >
                      <MenuItem
                        label="Copy CSV"
                        onClick={copyCSV}
                        disabled={!getCurrentResult(activeTab)?.columns?.length}
                      />
                      <MenuItem
                        label="Copy JSON"
                        onClick={copyJSON}
                        disabled={!getCurrentResult(activeTab)}
                      />
                      <div className="h-px bg-border mx-1" />
                      <MenuItem
                        label="Export CSV…"
                        onClick={exportCSV}
                        disabled={!getCurrentResult(activeTab)?.columns?.length}
                      />
                      <MenuItem
                        label="Export JSON…"
                        onClick={exportJSON}
                        disabled={!getCurrentResult(activeTab)}
                      />
                    </div>
                  )}
                  {columnMenu.show && (
                    <div
                      className="fixed z-50 border border-border rounded shadow-lg text-xs isolate mix-blend-normal overflow-hidden bg-[hsl(var(--modal))] text-[hsl(var(--modal-foreground))]"
                      style={{ left: columnMenu.x, top: columnMenu.y }}
                      onMouseLeave={() =>
                        setColumnMenu(prev => ({ ...prev, show: false }))
                      }
                    >
                      <MenuItem
                        label={`Order by ${columnMenu.column} ASC`}
                        onClick={() => {
                          setColumnMenu(prev => ({ ...prev, show: false }));
                          applyOrderBy(columnMenu.column!, "ASC");
                        }}
                      />
                      <MenuItem
                        label={`Order by ${columnMenu.column} DESC`}
                        onClick={() => {
                          setColumnMenu(prev => ({ ...prev, show: false }));
                          applyOrderBy(columnMenu.column!, "DESC");
                        }}
                      />
                      <div className="border-t border-border my-1" />
                      <MenuItem
                        label={`Add ${columnMenu.column} to sort (ASC)`}
                        onClick={() => {
                          setColumnMenu(prev => ({ ...prev, show: false }));
                          setSortFields(prev => {
                            const existingIndex = prev.findIndex(
                              field => field.column === columnMenu.column
                            );
                            if (existingIndex >= 0) {
                              const updated = [...prev];
                              updated[existingIndex].direction = "asc";
                              return updated;
                            } else {
                              return [
                                ...prev,
                                {
                                  column: columnMenu.column!,
                                  direction: "asc",
                                },
                              ];
                            }
                          });
                        }}
                      />
                      <MenuItem
                        label={`Add ${columnMenu.column} to sort (DESC)`}
                        onClick={() => {
                          setColumnMenu(prev => ({ ...prev, show: false }));
                          setSortFields(prev => {
                            const existingIndex = prev.findIndex(
                              field => field.column === columnMenu.column
                            );
                            if (existingIndex >= 0) {
                              const updated = [...prev];
                              updated[existingIndex].direction = "desc";
                              return updated;
                            } else {
                              return [
                                ...prev,
                                {
                                  column: columnMenu.column!,
                                  direction: "desc",
                                },
                              ];
                            }
                          });
                        }}
                      />
                      {sortFields.length > 0 && (
                        <>
                          <div className="border-t border-border my-1" />
                          <MenuItem
                            label="Manage Sort Order..."
                            onClick={() => {
                              setColumnMenu(prev => ({ ...prev, show: false }));
                              setShowSortManager(true);
                            }}
                          />
                        </>
                      )}
                    </div>
                  )}

                  {/* Tab Context Menu */}
                  {tabContextMenu.show && (
                    <div
                      className="fixed z-50 border border-border rounded shadow-lg text-xs isolate mix-blend-normal overflow-hidden bg-[hsl(var(--modal))] text-[hsl(var(--modal-foreground))]"
                      style={{ left: tabContextMenu.x, top: tabContextMenu.y }}
                      onMouseLeave={() =>
                        setTabContextMenu(prev => ({ ...prev, show: false }))
                      }
                      onClick={() =>
                        setTabContextMenu(prev => ({ ...prev, show: false }))
                      }
                    >
                      <MenuItem
                        label="Close Tab"
                        onClick={() => {
                          if (tabContextMenu.tabId) {
                            closeTab(tabContextMenu.tabId);
                          }
                        }}
                      />
                      <MenuItem
                        label="Close Other Tabs"
                        onClick={() => {
                          if (tabContextMenu.tabId) {
                            closeOtherTabs(tabContextMenu.tabId);
                          }
                        }}
                        disabled={tabs.length <= 1}
                      />
                      <MenuItem
                        label="Close All Tabs"
                        onClick={closeAllTabs}
                        disabled={tabs.length === 0}
                      />
                    </div>
                  )}

                  {/* Sort Manager Dialog */}
                  {showSortManager && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                      <div className="bg-white dark:bg-gray-800 border border-border rounded-lg shadow-xl w-96 max-h-[80vh] overflow-hidden">
                        <div className="px-4 py-3 border-b border-border bg-gray-50 dark:bg-gray-700">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-sm">
                              Sort Order Manager
                            </h3>
                            <button
                              onClick={() => setShowSortManager(false)}
                              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        <div className="p-4">
                          {sortFields.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                              No sort fields configured.
                              <br />
                              Right-click on column headers to add fields to
                              sort.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                                Drag to reorder • Click direction to toggle •
                                Click × to remove
                              </div>

                              {sortFields.map((field, index) => (
                                <div
                                  key={`${field.column}-${index}`}
                                  className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded border"
                                >
                                  <div className="flex-1 text-sm font-medium">
                                    {index + 1}. {field.column}
                                  </div>
                                  <button
                                    onClick={() => {
                                      setSortFields(prev => {
                                        const updated = [...prev];
                                        updated[index].direction =
                                          updated[index].direction === "asc"
                                            ? "desc"
                                            : "asc";
                                        return updated;
                                      });
                                    }}
                                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                  >
                                    {field.direction.toUpperCase()}
                                  </button>
                                  <button
                                    onClick={() =>
                                      removeSortField(field.column)
                                    }
                                    className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="px-4 py-3 border-t border-border bg-gray-50 dark:bg-gray-700 flex gap-2">
                          <button
                            onClick={applyMultiSort}
                            disabled={sortFields.length === 0}
                            className="flex-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Apply Sort ({sortFields.length} fields)
                          </button>
                          <button
                            onClick={clearAllSorts}
                            className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                          >
                            Clear All
                          </button>
                          <button
                            onClick={() => setShowSortManager(false)}
                            className="px-3 py-1 text-sm border border-border rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      ) : (
        <div className="flex-1 min-h-0 flex items-center justify-center p-6">
          <div className="w-full max-w-2xl border border-border rounded-xl bg-card p-8 shadow-sm text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full flex items-center justify-center bg-[hsl(var(--tab-active-bg))] text-secondary-foreground">
              <span className="text-2xl">🗄️</span>
            </div>
            <h2 className="text-2xl font-semibold mb-2">
              Welcome to SQL Helper
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Connect to a database to explore schemas, run queries, and work
              faster with AI assistance.
            </p>
            <div className="flex items-center justify-center gap-3 mb-4">
              {!connectionsLoaded || !aiEnginesLoaded ? (
                // Loading state - show default order while data loads
                <>
                  <div className="px-4 py-2 rounded bg-blue-600/70 text-white text-sm animate-pulse cursor-pointer">
                    Loading...
                  </div>
                </>
              ) : (
                (() => {
                  // Determine button order based on what's configured
                  const hasConnections = connections.length > 0;
                  const hasAiEngines = aiEngines.length > 0;

                  // Define button data with actions
                  const buttons = [
                    {
                      key: "connection",
                      text: "Setup Connections",
                      onClick: () => {
                        document.dispatchEvent(
                          new CustomEvent("open-settings")
                        );
                        setTimeout(() => {
                          document.dispatchEvent(
                            new CustomEvent("settings-tab-change", {
                              detail: { tab: "connections" },
                            })
                          );
                        }, 100);
                      },
                    },
                    {
                      key: "query",
                      text: "New Query",
                      onClick: () => {
                        const newTab: Tab = {
                          id: `query-${Date.now()}`,
                          type: "sql",
                          title: "New Query",
                          sql: "",
                          activeResultTab: "results",
                        } as Tab;
                        setTabs(prev => [...prev, newTab]);
                        setActiveTabId(newTab.id);
                      },
                    },
                    {
                      key: "file",
                      text: "Open SQL File…",
                      onClick: async () => {
                        const res = await window.electronAPI?.files?.open();
                        if (!res || res.canceled || !res.filePath) return;
                        const title =
                          res.filePath.split(/[\\/]/).pop() || "Untitled";
                        const id = `file:${res.filePath}`;
                        const existing = tabs.find(t => t.id === id);
                        if (existing) {
                          setTabs(prev =>
                            prev.map(t =>
                              t.id === id ? { ...t, sql: res.content || "" } : t
                            )
                          );
                          setActiveTabId(id);
                        } else {
                          const newTab: Tab = {
                            id,
                            type: "sql",
                            title,
                            sql: res.content || "",
                            filePath: res.filePath,
                            activeResultTab: "results",
                          } as Tab;
                          setTabs(prev => [...prev, newTab]);
                          setActiveTabId(id);
                        }
                      },
                    },
                    {
                      key: "ai",
                      text: "Setup AI Engines",
                      onClick: () => {
                        document.dispatchEvent(
                          new CustomEvent("open-settings")
                        );
                        setTimeout(() => {
                          document.dispatchEvent(
                            new CustomEvent("settings-tab-change", {
                              detail: { tab: "ai-engines" },
                            })
                          );
                        }, 100);
                      },
                    },
                  ];

                  // Determine button order
                  let orderedButtonKeys: string[];

                  if (!hasConnections) {
                    // No connections: prioritize New Connection first
                    if (!hasAiEngines) {
                      // No connections, no AI engines: Connection first, AI setup second
                      orderedButtonKeys = ["connection", "ai", "query", "file"];
                    } else {
                      // No connections but has AI engines: Connection first, then query actions
                      orderedButtonKeys = ["connection", "query", "file", "ai"];
                    }
                  } else if (!hasAiEngines) {
                    // Has connections but no AI engines: Query first, AI setup second
                    orderedButtonKeys = ["query", "ai", "file", "connection"];
                  } else {
                    // Has both connections and AI engines: Query and file operations prioritized
                    orderedButtonKeys = ["query", "file", "connection", "ai"];
                  }

                  // Map ordered keys to buttons with position-based styling
                  return orderedButtonKeys.map((buttonKey, index) => {
                    const button = buttons.find(b => b.key === buttonKey)!;

                    // Style based on position: 1st = green (main), 2nd = blue (secondary), rest = muted
                    let className: string;
                    if (index === 0) {
                      // Main action - green
                      className =
                        "px-4 py-2 rounded bg-green-600 text-white text-sm hover:bg-green-700 cursor-pointer";
                    } else if (index === 1) {
                      // Secondary action - blue
                      className =
                        "px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 cursor-pointer";
                    } else {
                      // Tertiary actions - muted
                      className =
                        "px-4 py-2 rounded bg-muted text-foreground text-sm hover:bg-accent cursor-pointer";
                    }

                    return (
                      <button
                        key={button.key}
                        className={className}
                        onClick={button.onClick}
                      >
                        {button.text}
                      </button>
                    );
                  });
                })()
              )}
            </div>
            <div className="text-xs text-muted-foreground mb-4">
              Tip: Press <span className="font-medium text-foreground">F5</span>{" "}
              or{" "}
              <span className="font-medium text-foreground">
                Cmd/Ctrl+Enter
              </span>{" "}
              to run queries.
            </div>
            <div className="pt-4 border-t border-border">
              <div className="text-xs text-muted-foreground text-center">
                SQL Helper v{VERSION_INFO.version} • Build {VERSION_INFO.build}{" "}
                • {VERSION_INFO.buildDate}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatCell(value: unknown) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

// Helper function to truncate content and determine if it should show an expand button
function getTruncatedContent(value: unknown): {
  content: string;
  shouldTruncate: boolean;
  originalLength: number;
} {
  const formatted = formatCell(value);
  const lines = formatted.split("\n");
  const maxLines = 3;
  const maxCharsPerLine = 100;

  // Check if content is long enough to truncate
  const shouldTruncate =
    lines.length > maxLines ||
    lines.some(line => line.length > maxCharsPerLine);

  if (!shouldTruncate) {
    return {
      content: formatted,
      shouldTruncate: false,
      originalLength: formatted.length,
    };
  }

  // Truncate to first few lines and limit line length
  const truncatedLines = lines
    .slice(0, maxLines)
    .map(line =>
      line.length > maxCharsPerLine
        ? line.substring(0, maxCharsPerLine) + "..."
        : line
    );

  // Add "..." if we cut off lines
  if (lines.length > maxLines) {
    truncatedLines.push("...");
  }

  return {
    content: truncatedLines.join("\n"),
    shouldTruncate: true,
    originalLength: formatted.length,
  };
}

function injectOrderBy(
  sql: string,
  column: string,
  dir: "ASC" | "DESC",
  queryIndex: number = 0
) {
  // Parse SQL into individual queries
  const queries = parseSQLQueries(sql);

  if (queries.length === 0) return sql;

  // Make sure queryIndex is within bounds
  const targetIndex = Math.min(queryIndex, queries.length - 1);
  const targetQuery = queries[targetIndex];

  // Apply ORDER BY to the target query
  const hasOrder = /order\s+by/gi.test(targetQuery);
  let modifiedQuery: string;

  if (hasOrder) {
    modifiedQuery = targetQuery.replace(
      /order\s+by[\s\S]*?$/i,
      `ORDER BY ${wrapIdent(column)} ${dir}`
    );
  } else {
    // Remove trailing semicolon if present, add ORDER BY, then add semicolon back
    modifiedQuery = targetQuery.replace(
      /;?\s*$/,
      ` ORDER BY ${wrapIdent(column)} ${dir}`
    );
  }

  // Replace the target query in the array
  const modifiedQueries = [...queries];
  modifiedQueries[targetIndex] = modifiedQuery;

  // Rejoin the queries with semicolons
  return modifiedQueries.map(q => q.trim()).join(";\n") + ";";
}

function injectMultiOrderBy(
  sql: string,
  sortFields: Array<{ column: string; direction: "asc" | "desc" }>,
  queryIndex: number = 0
) {
  // Parse SQL into individual queries
  const queries = parseSQLQueries(sql);

  if (queries.length === 0 || sortFields.length === 0) return sql;

  // Make sure queryIndex is within bounds
  const targetIndex = Math.min(queryIndex, queries.length - 1);
  const targetQuery = queries[targetIndex];

  // Create ORDER BY clause from multiple fields
  const orderByClause = sortFields
    .map(field => `${wrapIdent(field.column)} ${field.direction.toUpperCase()}`)
    .join(", ");

  // Apply ORDER BY to the target query
  const hasOrder = /order\s+by/gi.test(targetQuery);
  let modifiedQuery: string;

  if (hasOrder) {
    modifiedQuery = targetQuery.replace(
      /order\s+by[\s\S]*?$/i,
      `ORDER BY ${orderByClause}`
    );
  } else {
    // Remove trailing semicolon if present, add ORDER BY, then add semicolon back
    modifiedQuery = targetQuery.replace(/;?\s*$/, ` ORDER BY ${orderByClause}`);
  }

  // Replace the target query in the array
  const modifiedQueries = [...queries];
  modifiedQueries[targetIndex] = modifiedQuery;

  // Rejoin the queries with semicolons
  return modifiedQueries.map(q => q.trim()).join(";\n") + ";";
}

function wrapIdent(name: string) {
  // Keep it simple: wrap with [ ] which is safe for SQL Server; acceptable placeholder for now.
  return `[${name}]`;
}

function StatusBar({ tab }: { tab: Tab }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (tab.status === "running") {
      const id = setInterval(() => setNow(Date.now()), 250);
      return () => clearInterval(id);
    }
  }, [tab.status]);
  const bg =
    tab.status === "running"
      ? "bg-yellow-100 dark:bg-yellow-900/30"
      : tab.status === "error"
        ? "bg-red-100 dark:bg-red-900/30"
        : "bg-muted";
  const elapsed =
    tab.status === "running" && tab.startedAt
      ? now - tab.startedAt
      : (tab.result?.executionTime ?? 0);
  const pos =
    tab.editorFocused && tab.editorPos
      ? `Ln ${tab.editorPos.line}, Col ${tab.editorPos.column}`
      : "";
  const dbName = tab.connectionName
    ? tab.database
      ? `${tab.connectionName} • ${tab.database}`
      : tab.connectionName
    : tab.database || "";
  return (
    <div
      className={`flex items-center justify-between px-3 py-[3px] text-[11px] leading-tight border-t border-border ${bg}`}
    >
      <div className="flex items-center gap-2 text-foreground/80">
        {pos && <span>{pos}</span>}
        {pos && dbName && <span className="opacity-60">|</span>}
        {dbName && <span>{dbName}</span>}
      </div>
      <div className="flex items-center gap-2 text-foreground/80">
        <span>Status: {tab.status || "idle"}</span>
        <span className="opacity-60">|</span>
        <span>{tab.result?.rowCount ?? 0} rows</span>
        <span className="opacity-60">|</span>
        <span>{elapsed} ms</span>
      </div>
    </div>
  );
}

function MenuItem({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className={`block w-56 text-left px-3 py-1 ${disabled ? "text-muted-foreground/60 cursor-not-allowed" : "text-foreground hover:bg-accent"}`}
      onClick={e => {
        e.stopPropagation();
        if (!disabled) onClick();
      }}
      disabled={!!disabled}
    >
      {label}
    </button>
  );
}
