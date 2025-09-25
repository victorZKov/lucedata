import { useState, useEffect, useMemo } from "react";
import Editor from "@monaco-editor/react";
import { format as sqlFormat } from "sql-formatter";

import { useTheme } from "../contexts/ThemeContext";

import Resizer from "./Resizer";
import EditableDataGrid from "./EditableDataGrid";

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
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
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
        } catch {}
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
    } catch {}
  }, []);

  // Persist tabs and active tab
  useEffect(() => {
    try {
      const toSave = tabs.map(t => t);
      localStorage.setItem("sqlhelper-tabs", JSON.stringify(toSave));
      if (activeTabId)
        localStorage.setItem("sqlhelper-active-tab", activeTabId);
    } catch {}
  }, [tabs, activeTabId]);
  const [sqlHeight, setSqlHeight] = useState(() => {
    const saved = localStorage.getItem("sqlhelper-sql-height");
    return saved ? parseInt(saved, 10) : 320;
  });
  const [showResults, setShowResults] = useState(() => {
    const saved = localStorage.getItem("sqlhelper-show-results");
    return saved ? JSON.parse(saved) : true;
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

  // For multiple query results - track which result is currently active
  const [activeResultIndex, setActiveResultIndex] = useState(0);

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

  // Reset active result index when switching tabs or when results change
  useEffect(() => {
    setActiveResultIndex(0);
  }, [activeTabId]);

  useEffect(() => {
    const handleToggleResults = () => setShowResults((prev: boolean) => !prev);
    document.addEventListener("toggle-results", handleToggleResults);
    return () =>
      document.removeEventListener("toggle-results", handleToggleResults);
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
      updateActiveTab({ status: "running", startedAt: Date.now() });

      const results: QueryResult[] = [];
      let totalExecutionTime = 0;

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
          totalExecutionTime += executionTime;

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
    }
  };

  const explainQuery = async () => {
    if (!activeTab || !activeTab.connectionId) return;
    const prefix = (() => {
      switch (activeTab.connectionType) {
        case "postgresql":
          return "EXPLAIN ";
        case "sqlserver":
          return "SET SHOWPLAN_ALL ON; ";
        default:
          return "EXPLAIN ";
      }
    })();
    let query = activeTab.sql;
    try {
      updateActiveTab({ status: "running", startedAt: Date.now() });
      const res = await window.electronAPI.database.executeQuery(
        activeTab.connectionId!,
        prefix + query
      );
      const columns =
        res.columns?.map(c => c.name) ||
        (res.rows[0] ? Object.keys(res.rows[0]) : []);
      updateActiveTab({
        result: {
          query: prefix + query,
          columns,
          rows: res.rows || [],
          rowCount: res.rowCount || res.rows?.length || 0,
          executionTime: res.executionTime || 0,
          messages: res.messages || [],
          startTime: Date.now() - (res.executionTime || 0),
          endTime: Date.now(),
        },
      });
      updateActiveTab({ status: "idle" });
      setShowResults(true);
    } catch (err: any) {
      updateActiveTab({
        result: {
          query: prefix + query,
          columns: [],
          rows: [],
          rowCount: 0,
          executionTime: 0,
          error: err?.message || String(err),
          startTime: Date.now(),
          endTime: Date.now(),
        },
      });
      updateActiveTab({ status: "error", activeResultTab: "messages" });
    } finally {
      if (activeTab.connectionType === "sqlserver") {
        try {
          await window.electronAPI.database.executeQuery(
            activeTab.connectionId!,
            "SET SHOWPLAN_ALL OFF;"
          );
        } catch {}
      }
    }
  };

  const formatSql = () => {
    if (!activeTab) return;
    try {
      const dialect =
        activeTab.connectionType === "postgresql"
          ? "postgresql"
          : activeTab.connectionType === "sqlserver"
            ? "transactsql"
            : "sql";
      const formatted = sqlFormat(activeTab.sql, { language: dialect as any });
      updateActiveTab({ sql: formatted });
    } catch {}
  };

  const updateActiveTab = (patch: Partial<Tab>) => {
    setTabs(prev =>
      prev.map(t => (t.id === activeTabId ? { ...t, ...patch } : t))
    );
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
    const newSql = injectOrderBy(activeTab.sql, column, dir);
    await execQueryWithSql(newSql);
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
          if (activeTab.filePath) {
            await window.electronAPI?.files?.write(
              activeTab.filePath,
              activeTab.sql
            );
          } else {
            const suggested =
              (activeTab.title?.replace(/\s+/g, "_") || "query") + ".sql";
            const res = await window.electronAPI?.files?.saveDialog({
              defaultPath: suggested,
            });
            if (!res || res.canceled || !res.filePath) break;
            await window.electronAPI?.files?.write(res.filePath, activeTab.sql);
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
          const suggested =
            (activeTab.title?.replace(/\s+/g, "_") || "query") + ".sql";
          const res = await window.electronAPI?.files?.saveDialog({
            defaultPath: activeTab.filePath || suggested,
          });
          if (!res || res.canceled || !res.filePath) break;
          await window.electronAPI?.files?.write(res.filePath, activeTab.sql);
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
      <div className="flex items-center overflow-x-auto border-b border-border bg-secondary min-w-0">
        {tabs.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground"></div>
        ) : (
          tabs.map(tab => (
            <div
              key={tab.id}
              className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer border-r border-border flex-shrink-0 border-t-2 ${
                activeTabId === tab.id
                  ? "bg-[hsl(var(--tab-active-bg))] text-secondary-foreground rounded-t-md border-t-accent"
                  : "bg-muted text-muted-foreground hover:bg-accent border-t-transparent"
              }`}
              onClick={() => setActiveTabId(tab.id)}
            >
              <span
                className="truncate max-w-[180px]"
                title={`${tab.connectionName || ""} • ${tab.title}`}
              >
                {tab.title}
              </span>
              <button
                className="text-xs text-muted-foreground hover:text-foreground"
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

      {/* Toolbar (only when a tab is active and not edit-data or content-viewer) */}
      {activeTab &&
        activeTab.type !== "edit-data" &&
        activeTab.type !== "content-viewer" && (
          <div className="border-b border-border p-2 bg-secondary flex-shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={runQuery}
                disabled={!activeTab?.connectionId}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                Run
              </button>
              <button
                onClick={explainQuery}
                disabled={!activeTab?.connectionId}
                className="px-3 py-1 bg-muted text-foreground rounded text-sm hover:bg-accent disabled:opacity-50"
              >
                Explain
              </button>
              <button
                onClick={formatSql}
                className="px-3 py-1 bg-muted text-foreground rounded text-sm hover:bg-accent"
              >
                Format
              </button>
            </div>
            <div className="text-xs text-muted-foreground">
              {activeTab?.connectionName || activeTab?.database
                ? [activeTab.connectionName, activeTab.database]
                    .filter(Boolean)
                    .join(" • ")
                : "No database selected"}
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
                        theme="vs-dark"
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
                  <div className="h-full border border-border rounded bg-card overflow-hidden min-w-0">
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
                      theme={theme === "dark" ? "vs-dark" : "light"}
                      onMount={(editor, monaco) => {
                        editor.addCommand(
                          monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
                          () => runQuery()
                        );
                        editor.addCommand(
                          monaco.KeyMod.CtrlCmd |
                            monaco.KeyMod.Shift |
                            monaco.KeyCode.Enter,
                          () => explainQuery()
                        );
                        // F5 to run query inside editor
                        editor.addCommand(monaco.KeyCode.F5, () => runQuery());
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
                        editor.onDidFocusEditorText(() =>
                          updateActiveTab({ editorFocused: true })
                        );
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
                <div className="h-full border border-border rounded bg-card flex flex-col min-w-0">
                  <div className="flex items-center justify-between border-b border-border px-2 py-1 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        className={`${(activeTab.activeResultTab ?? "results") === "results" ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"} px-2 py-0.5 rounded hover:bg-accent`}
                        onClick={() =>
                          updateActiveTab({ activeResultTab: "results" })
                        }
                      >
                        Results
                      </button>
                      <button
                        className={`${(activeTab.activeResultTab ?? "results") === "messages" ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"} px-2 py-0.5 rounded hover:bg-accent`}
                        onClick={() =>
                          updateActiveTab({ activeResultTab: "messages" })
                        }
                      >
                        Messages
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="px-2 py-0.5 bg-muted text-foreground rounded hover:bg-accent"
                        onClick={autoFitColumns}
                        disabled={!activeTab?.result?.columns?.length}
                      >
                        Auto-fit
                      </button>
                      <button
                        className="px-2 py-0.5 bg-muted text-foreground rounded hover:bg-accent"
                        onClick={resetColumnWidths}
                        disabled={!activeTab?.result?.columns?.length}
                      >
                        Reset widths
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto">
                    {(() => {
                      const currentResult = getCurrentResult(activeTab);

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
                        return (
                          <div className="p-3 text-xs space-y-1">
                            {currentResult?.messages &&
                            currentResult.messages.length > 0 ? (
                              currentResult.messages.map((m, i) => (
                                <div key={i} className="text-foreground/80">
                                  {m}
                                </div>
                              ))
                            ) : (
                              <div className="text-muted-foreground">
                                No messages
                              </div>
                            )}
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
                              <div className="flex items-center gap-2 p-2 border-b border-border">
                                <span className="text-xs text-muted-foreground">
                                  Results:
                                </span>
                                {activeTab.results.map((result, index) => (
                                  <button
                                    key={index}
                                    className={`px-2 py-1 text-xs rounded ${
                                      activeResultIndex === index
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted text-foreground hover:bg-accent"
                                    }`}
                                    onClick={() => {
                                      console.log(
                                        "🔧 Switching to result index:",
                                        index
                                      );
                                      setActiveResultIndex(index);
                                    }}
                                  >
                                    Query {index + 1} ({result.rowCount || 0}{" "}
                                    rows)
                                  </button>
                                ))}
                              </div>
                            )}

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
                            <table className="w-full text-xs">
                              <thead className="sticky top-0 bg-muted">
                                <tr>
                                  {currentResult.columns.map((c, i) => (
                                    <th
                                      key={i}
                                      ref={el => {
                                        (headerRefs as any)[c] = el;
                                      }}
                                      className="text-left px-2 py-1 border-b border-border whitespace-nowrap relative"
                                      style={
                                        activeTab.columnWidths?.[c]
                                          ? { width: activeTab.columnWidths[c] }
                                          : { minWidth: "100px" }
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
                                      {c}
                                      <span
                                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500/40"
                                        onMouseDown={e => startResize(c, e)}
                                      />
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {currentResult.rows.map((r, i) => (
                                  <tr key={i} className="odd:bg-muted/50">
                                    {currentResult.columns.map((c, j) => {
                                      const {
                                        content,
                                        shouldTruncate,
                                        originalLength,
                                      } = getTruncatedContent(r[c]);
                                      return (
                                        <td
                                          key={j}
                                          className="px-2 py-1 align-top border-b border-border/60"
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
                                            <pre className="whitespace-pre-wrap break-words text-[11px]">
                                              {content}
                                            </pre>
                                            {shouldTruncate && (
                                              <button
                                                className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 bg-blue-600 text-white text-[9px] px-1 py-0.5 rounded text-nowrap hover:bg-blue-700 transition-opacity"
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
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
                onClick={() =>
                  document.dispatchEvent(new Event("open-add-connection"))
                }
              >
                New Connection
              </button>
              <button
                className="px-4 py-2 rounded bg-muted text-foreground text-sm hover:bg-accent"
                onClick={async () => {
                  const res = await window.electronAPI?.files?.open();
                  if (!res || res.canceled || !res.filePath) return;
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
                }}
              >
                Open SQL File…
              </button>
              <button
                className="px-4 py-2 rounded bg-muted text-foreground text-sm hover:bg-accent"
                onClick={() =>
                  document.dispatchEvent(
                    new CustomEvent("open-ai-engines-settings")
                  )
                }
              >
                Setup AI Engines
              </button>
            </div>
            <div className="text-xs text-muted-foreground">
              Tip: Press <span className="font-medium text-foreground">F5</span>{" "}
              or{" "}
              <span className="font-medium text-foreground">
                Cmd/Ctrl+Enter
              </span>{" "}
              to run queries.
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

function injectOrderBy(sql: string, column: string, dir: "ASC" | "DESC") {
  // Very basic ORDER BY toggler: if ORDER BY exists, replace; else, add.
  const hasOrder = /order\s+by/gi.test(sql);
  if (hasOrder) {
    return sql.replace(
      /order\s+by[\s\S]*?($|;)/i,
      `ORDER BY ${wrapIdent(column)} ${dir}$1`
    );
  }
  // Inject before trailing ; if present
  return sql.replace(/;?\s*$/, ` ORDER BY ${wrapIdent(column)} ${dir};`);
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
