import { useState, useEffect, useMemo } from "react";
import Resizer from "./Resizer";
import Editor from "@monaco-editor/react";
import { format as sqlFormat } from "sql-formatter";
import { useTheme } from "../contexts/ThemeContext";

type Tab = {
  id: string;
  title: string;
  filePath?: string; // persisted file path for Save
  connectionId?: string;
  connectionName?: string;
  connectionType?: string;
  database?: string;
  schema?: string;
  table?: string;
  sql: string;
  activeResultTab?: 'results' | 'messages';
  result?: {
    columns: string[];
    rows: Array<Record<string, unknown>>;
    rowCount: number;
    executionTime: number;
    messages?: string[];
    error?: string;
  };
  status?: 'idle' | 'running' | 'error';
  startedAt?: number | null;
  columnWidths?: Record<string, number>; // px per column key
  editorPos?: { line: number; column: number };
  editorFocused?: boolean;
};

export default function WorkArea() {
  const { theme } = useTheme();
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const headerRefs = useMemo(() => ({} as Record<string, HTMLTableCellElement | null>), []);
  const resizingCol = useMemo(() => ({ key: null as string | null, startX: 0, startWidth: 0 }), []);
  // Load saved tabs
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sqlhelper-tabs');
      const savedActive = localStorage.getItem('sqlhelper-active-tab');
      if (saved) {
        const parsed: Tab[] = JSON.parse(saved);
        // Do not restore result payloads to avoid heavy memory
        const sanitized = parsed.map(t => ({ ...t, result: undefined }));
        setTabs(sanitized);
        setActiveTabId(savedActive || (sanitized[0]?.id ?? null));
      }
    } catch {}
  }, []);

  // Persist tabs and active tab
  useEffect(() => {
    try {
      const toSave = tabs.map(t => t);
      localStorage.setItem('sqlhelper-tabs', JSON.stringify(toSave));
      if (activeTabId) localStorage.setItem('sqlhelper-active-tab', activeTabId);
    } catch {}
  }, [tabs, activeTabId]);
  const [sqlHeight, setSqlHeight] = useState(() => {
    const saved = localStorage.getItem('sqlhelper-sql-height');
    return saved ? parseInt(saved, 10) : 320;
  });
  const [showResults, setShowResults] = useState(() => {
    const saved = localStorage.getItem('sqlhelper-show-results');
    return saved ? JSON.parse(saved) : true;
  });

  const activeTab = useMemo(() => tabs.find(t => t.id === activeTabId) || null, [tabs, activeTabId]);
  const [resultMenu, setResultMenu] = useState<{ x: number; y: number; show: boolean }>({ x: 0, y: 0, show: false });
  const [columnMenu, setColumnMenu] = useState<{ x: number; y: number; show: boolean; column?: string }>({ x: 0, y: 0, show: false });

  useEffect(() => {
    localStorage.setItem('sqlhelper-sql-height', sqlHeight.toString());
  }, [sqlHeight]);

  useEffect(() => {
    localStorage.setItem('sqlhelper-show-results', JSON.stringify(showResults));
  }, [showResults]);

  useEffect(() => {
    const handleToggleResults = () => setShowResults((prev: boolean) => !prev);
    document.addEventListener('toggle-results', handleToggleResults);
    return () => document.removeEventListener('toggle-results', handleToggleResults);
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
      const { connectionId, connectionName, connectionType, database, schema, table, customSql } = detail;
      const title = `${schema}.${table}`;
      const id = `${connectionId}:${schema}.${table}`;
      const already = tabs.find(t => t.id === id);
      const sql = customSql ?? buildInitialSql(connectionType, schema, table);
      if (already) {
        setActiveTabId(already.id);
      } else {
        const newTab: Tab = { id, title, connectionId, connectionName, connectionType, database, schema, table, sql, activeResultTab: 'results' };
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(id);
      }
    };
    document.addEventListener('open-sql-tab', handler as EventListener);
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
      const { connectionId, connectionName, connectionType, database, schema, title, sql } = detail;
      const id = `${connectionId}:${schema ?? 'script'}:${title}`;
      const existing = tabs.find(t => t.id === id);
      if (existing) {
        setTabs(prev => prev.map(t => (t.id === existing.id ? { ...t, sql } : t)));
        setActiveTabId(existing.id);
      } else {
        const newTab: Tab = { id, title, connectionId, connectionName, connectionType, database, schema, table: '', sql, activeResultTab: 'results' };
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(id);
      }
    };
    document.addEventListener('open-sql-script', scriptHandler as EventListener);
    const emptyHandler = (e: Event) => {
      const { detail } = e as CustomEvent<{
        connectionId: string;
        connectionType?: string;
        connectionName?: string;
        database?: string;
        schema: string;
      }>;
      if (!detail) return;
      const { connectionId, connectionName, connectionType, database, schema } = detail;
      const id = `${connectionId}:${schema}:new`;
      const title = `${schema} • New Query`;
      const existing = tabs.find(t => t.id === id);
      const sql = '';
      if (existing) setActiveTabId(existing.id);
      else {
        const newTab: Tab = { id, title, connectionId, connectionName, connectionType, database, schema, table: '', sql, activeResultTab: 'results' };
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(id);
      }
    };
    document.addEventListener('open-empty-sql-tab', emptyHandler as EventListener);
    return () => {
      document.removeEventListener('open-sql-tab', handler as EventListener);
      document.removeEventListener('open-sql-script', scriptHandler as EventListener);
      document.removeEventListener('open-empty-sql-tab', emptyHandler as EventListener);
    };
  }, [tabs]);

  const buildInitialSql = (type: string | undefined, schema: string, table: string) => {
    const ident = (n: string) => {
      switch (type) {
        case 'sqlserver':
          return `[${n}]`;
        case 'postgresql':
          return `"${n}"`;
        default:
          return `"${n}"`;
      }
    };
    const qualified = `${ident(schema)}.${ident(table)}`;
    switch (type) {
      case 'sqlserver':
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

  const runQuery = async () => {
    if (!activeTab || !activeTab.connectionId || !window.electronAPI) return;
    try {
  updateActiveTab({ status: 'running', startedAt: Date.now() });
      const res = await window.electronAPI.database.executeQuery(activeTab.connectionId, activeTab.sql);
      const columns = res.columns?.map(c => c.name) || (res.rows[0] ? Object.keys(res.rows[0]) : []);
      updateActiveTab({
        result: {
          columns,
          rows: res.rows || [],
          rowCount: res.rowCount || res.rows?.length || 0,
          executionTime: res.executionTime || 0,
          messages: res.messages || [],
        }
      });
  updateActiveTab({ status: 'idle' });
    } catch (err: any) {
      updateActiveTab({ result: { columns: [], rows: [], rowCount: 0, executionTime: 0, error: err?.message || String(err) } });
  updateActiveTab({ status: 'error', activeResultTab: 'messages' });
    }
  };

  const explainQuery = async () => {
    if (!activeTab || !activeTab.connectionId) return;
    const prefix = (() => {
      switch (activeTab.connectionType) {
        case 'postgresql':
          return 'EXPLAIN ';
        case 'sqlserver':
          return 'SET SHOWPLAN_ALL ON; ';
        default:
          return 'EXPLAIN ';
      }
    })();
    let query = activeTab.sql;
    try {
  updateActiveTab({ status: 'running', startedAt: Date.now() });
      const res = await window.electronAPI.database.executeQuery(activeTab.connectionId!, prefix + query);
      const columns = res.columns?.map(c => c.name) || (res.rows[0] ? Object.keys(res.rows[0]) : []);
      updateActiveTab({
        result: {
          columns,
          rows: res.rows || [],
          rowCount: res.rowCount || res.rows?.length || 0,
          executionTime: res.executionTime || 0,
          messages: res.messages || [],
        }
      });
  updateActiveTab({ status: 'idle' });
    } catch (err: any) {
      updateActiveTab({ result: { columns: [], rows: [], rowCount: 0, executionTime: 0, error: err?.message || String(err) } });
  updateActiveTab({ status: 'error', activeResultTab: 'messages' });
    } finally {
      if (activeTab.connectionType === 'sqlserver') {
        try { await window.electronAPI.database.executeQuery(activeTab.connectionId!, 'SET SHOWPLAN_ALL OFF;'); } catch {}
      }
    }
  };

  const formatSql = () => {
    if (!activeTab) return;
    try {
      const dialect = activeTab.connectionType === 'postgresql' ? 'postgresql' : activeTab.connectionType === 'sqlserver' ? 'transactsql' : 'sql';
      const formatted = sqlFormat(activeTab.sql, { language: dialect as any });
      updateActiveTab({ sql: formatted });
    } catch {}
  };

  const updateActiveTab = (patch: Partial<Tab>) => {
    setTabs(prev => prev.map(t => (t.id === activeTabId ? { ...t, ...patch } : t)));
  };

  // Execute a query using a provided SQL string
  const execQueryWithSql = async (sqlString: string) => {
    if (!activeTab || !activeTab.connectionId || !window.electronAPI) return;
    try {
      updateActiveTab({ status: 'running', startedAt: Date.now() });
      const res = await window.electronAPI.database.executeQuery(activeTab.connectionId, sqlString);
      const columns = res.columns?.map((c: any) => c.name) || (res.rows[0] ? Object.keys(res.rows[0]) : []);
      updateActiveTab({
        sql: sqlString,
        result: {
          columns,
          rows: res.rows || [],
          rowCount: res.rowCount || res.rows?.length || 0,
          executionTime: res.executionTime || 0,
          messages: res.messages || [],
        },
        status: 'idle'
      });
    } catch (err: any) {
      updateActiveTab({ result: { columns: [], rows: [], rowCount: 0, executionTime: 0, error: err?.message || String(err) }, status: 'error', activeResultTab: 'messages' });
    }
  };

  const applyOrderBy = async (column: string, dir: 'ASC' | 'DESC') => {
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
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-10000px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  };

  const stringifyCSV = (rows: Array<Record<string, unknown>>, columns: string[]) => {
    const esc = (v: any) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    const header = columns.map(esc).join(',');
    const body = rows.map(r => columns.map(c => esc((r as any)[c])).join(',')).join('\n');
    return header + (body ? '\n' + body : '');
  };

  const copyCSV = async () => {
    const res = activeTab?.result;
    if (!res || !res.columns?.length) return;
    const csv = stringifyCSV(res.rows || [], res.columns);
    await writeClipboard(csv);
  };

  const copyJSON = async () => {
    const res = activeTab?.result;
    if (!res) return;
    const json = JSON.stringify(res.rows || [], null, 2);
    await writeClipboard(json);
  };

  const downloadText = (filename: string, content: string, mime: string) => {
    try {
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {}
  };

  const exportCSV = async () => {
    const res = activeTab?.result;
    if (!res || !res.columns?.length) return;
    const csv = stringifyCSV(res.rows || [], res.columns);
    const base = activeTab?.title || 'results';
    if (window.electronAPI?.export?.save) {
      await window.electronAPI.export.save({
        defaultPath: `${base}.csv`,
        filters: [{ name: 'CSV', extensions: ['csv'] }],
        content: csv,
      });
    } else {
      downloadText(`${base}.csv`, csv, 'text/csv;charset=utf-8;');
    }
  };

  const exportJSON = async () => {
    const res = activeTab?.result;
    if (!res) return;
    const json = JSON.stringify(res.rows || [], null, 2);
    const base = activeTab?.title || 'results';
    if (window.electronAPI?.export?.save) {
      await window.electronAPI.export.save({
        defaultPath: `${base}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }],
        content: json,
      });
    } else {
      downloadText(`${base}.json`, json, 'application/json;charset=utf-8;');
    }
  };

  // Listen for app menu actions coming from main
  useEffect(() => {
    const handler = async (action: string) => {
      switch (action) {
        case 'records-copy-csv':
          copyCSV();
          break;
        case 'records-copy-json':
          copyJSON();
          break;
        case 'records-export-csv':
          exportCSV();
          break;
        case 'records-export-json':
          exportJSON();
          break;
        case 'file-open': {
          const res = await window.electronAPI?.files?.open();
          if (!res || res.canceled || !res.filePath) break;
          // Create or update a script tab with the opened file
          const title = res.filePath.split(/[\\/]/).pop() || 'Untitled';
          const id = `file:${res.filePath}`;
          const existing = tabs.find(t => t.id === id);
          if (existing) {
            setTabs(prev => prev.map(t => (t.id === id ? { ...t, sql: res.content || '' } : t)));
            setActiveTabId(id);
          } else {
            const newTab: Tab = { id, title, sql: res.content || '', filePath: res.filePath, activeResultTab: 'results' } as Tab;
            setTabs(prev => [...prev, newTab]);
            setActiveTabId(id);
          }
          setShowResults(false);
          break;
        }
        case 'file-save': {
          if (!activeTab) break;
          if (activeTab.filePath) {
            await window.electronAPI?.files?.write(activeTab.filePath, activeTab.sql);
          } else {
            const suggested = (activeTab.title?.replace(/\s+/g, '_') || 'query') + '.sql';
            const res = await window.electronAPI?.files?.saveDialog({ defaultPath: suggested });
            if (!res || res.canceled || !res.filePath) break;
            await window.electronAPI?.files?.write(res.filePath, activeTab.sql);
            setTabs(prev => prev.map(t => (t.id === activeTab.id ? { ...t, filePath: res.filePath, title: (res.filePath!.split(/[\\/]/).pop() || t.title) } : t)));
          }
          break;
        }
        case 'file-save-as': {
          if (!activeTab) break;
          const suggested = (activeTab.title?.replace(/\s+/g, '_') || 'query') + '.sql';
          const res = await window.electronAPI?.files?.saveDialog({ defaultPath: activeTab.filePath || suggested });
          if (!res || res.canceled || !res.filePath) break;
          await window.electronAPI?.files?.write(res.filePath, activeTab.sql);
          setTabs(prev => prev.map(t => (t.id === activeTab.id ? { ...t, filePath: res.filePath, title: (res.filePath!.split(/[\\/]/).pop() || t.title) } : t)));
          break;
        }
      }
    };
    window.electronAPI?.onMenuAction(handler);
    return () => window.electronAPI?.removeAllListeners?.('menu-action');
  }, [activeTab]);

  // Close menus on global click
  useEffect(() => {
    const closer = () => {
      setResultMenu(prev => (prev.show ? { ...prev, show: false } : prev));
      setColumnMenu(prev => (prev.show ? { ...prev, show: false } : prev));
    };
    window.addEventListener('click', closer);
    return () => window.removeEventListener('click', closer);
  }, []);

  // Column resize
  const startResize = (colKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    const th = headerRefs[colKey];
    if (!th) return;
    resizingCol.key = colKey;
    resizingCol.startX = e.clientX;
    resizingCol.startWidth = th.getBoundingClientRect().width;
    window.addEventListener('mousemove', onResizeMove);
    window.addEventListener('mouseup', onResizeUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const onResizeMove = (e: MouseEvent) => {
    if (!activeTab || !resizingCol.key) return;
    const delta = e.clientX - resizingCol.startX;
    const width = Math.max(60, Math.min(1200, resizingCol.startWidth + delta));
    const next = { ...(activeTab.columnWidths || {}), [resizingCol.key]: width };
    updateActiveTab({ columnWidths: next });
  };

  const onResizeUp = () => {
    resizingCol.key = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    window.removeEventListener('mousemove', onResizeMove);
    window.removeEventListener('mouseup', onResizeUp);
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
        const s = v === null || v === undefined ? '' : String(v);
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
  <div className="h-full flex flex-col bg-white dark:bg-gray-900 min-w-0">
      {/* Tabs Header */}
      <div className="flex items-center overflow-x-auto border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 min-w-0">
        {tabs.length === 0 ? (
          <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">Double-click a table to open it</div>
        ) : (
          tabs.map(tab => (
            <div key={tab.id} className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer border-r border-gray-200 dark:border-gray-700 flex-shrink-0 ${activeTabId === tab.id ? 'bg-white dark:bg-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`} onClick={() => setActiveTabId(tab.id)}>
              <span className="truncate max-w-[180px]" title={`${tab.connectionName || ''} • ${tab.title}`}>{tab.title}</span>
              <button className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200" onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}>✕</button>
            </div>
          ))
        )}
      </div>

      {/* Toolbar (only when a tab is active) */}
      {activeTab && (
        <div className="border-b border-gray-200 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-800 flex-shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={runQuery} disabled={!activeTab?.connectionId} className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50">
              Run
            </button>
            <button onClick={explainQuery} disabled={!activeTab?.connectionId} className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50">
              Explain
            </button>
            <button onClick={formatSql} className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-600">
              Format
            </button>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-300">
            {activeTab?.connectionName ? `${activeTab.connectionName} • ${activeTab.database}` : 'No database selected'}
          </div>
        </div>
      )}

      {/* Editor + Results */}
      {activeTab ? (
        <div className="flex-1 flex flex-col min-h-0">
          {(() => {
            const resultsVisible = showResults && !!activeTab.result;
            return (
              <div className={resultsVisible ? "flex-shrink-0 p-2" : "flex-1 p-2 min-w-0"} style={resultsVisible ? { height: sqlHeight } : undefined}>
                <div className="h-full border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 overflow-hidden min-w-0">
                  <Editor
                    height="100%"
                    defaultLanguage="sql"
                    value={activeTab.sql}
                    onChange={(v) => updateActiveTab({ sql: v || '' })}
                    options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: 'on' }}
                    theme={theme === 'dark' ? 'vs-dark' : 'light'}
                    onMount={(editor, monaco) => {
                      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runQuery());
                      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => explainQuery());
                      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => formatSql());

                      const updatePos = () => {
                        const pos = editor.getPosition();
                        if (pos) updateActiveTab({ editorPos: { line: pos.lineNumber, column: pos.column } });
                      };
                      updatePos();
                      editor.onDidChangeCursorPosition(() => updatePos());
                      editor.onDidFocusEditorText(() => updateActiveTab({ editorFocused: true }));
                      editor.onDidBlurEditorText(() => updateActiveTab({ editorFocused: false }));
                    }}
                  />
                </div>
              </div>
            );
          })()}

          {showResults && !!activeTab.result && (
            <Resizer direction="vertical" onResize={(delta) => setSqlHeight(prev => Math.max(200, Math.min(800, prev + delta)))} className="border-t border-gray-200 dark:border-gray-700" />
          )}

          {showResults && !!activeTab.result && (
            <div className="flex-1 min-h-0 bg-gray-50 dark:bg-gray-800 p-2 overflow-hidden">
              <div className="h-full border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 flex flex-col min-w-0">
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-2 py-1 text-xs">
                  <div className="flex items-center gap-2">
                    <button className={`${(activeTab.activeResultTab ?? 'results') === 'results' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'} px-2 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800`} onClick={() => updateActiveTab({ activeResultTab: 'results' })}>Results</button>
                    <button className={`${(activeTab.activeResultTab ?? 'results') === 'messages' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'} px-2 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800`} onClick={() => updateActiveTab({ activeResultTab: 'messages' })}>Messages</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded hover:bg-gray-300 dark:hover:bg-gray-600" onClick={autoFitColumns} disabled={!activeTab?.result?.columns?.length}>Auto-fit</button>
                    <button className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded hover:bg-gray-300 dark:hover:bg-gray-600" onClick={resetColumnWidths} disabled={!activeTab?.result?.columns?.length}>Reset widths</button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto">
                  {activeTab.result?.error ? (
                    <div className="p-3 text-sm text-red-600">{activeTab.result.error}</div>
                  ) : (activeTab.activeResultTab ?? 'results') === 'messages' ? (
                    <div className="p-3 text-xs space-y-1">
                      {(activeTab.result?.messages && activeTab.result.messages.length > 0) ? activeTab.result.messages.map((m, i) => (
                        <div key={i} className="text-gray-700 dark:text-gray-300">{m}</div>
                      )) : (
                        <div className="text-gray-500 dark:text-gray-400">No messages</div>
                      )}
                    </div>
                  ) : activeTab.result && (activeTab.result.rows?.length || 0) > 0 ? (
                    <div className="w-full h-full overflow-auto" onContextMenu={(e) => {
                      e.preventDefault();
                      if (!activeTab?.result) return;
                      setResultMenu({ x: e.clientX, y: e.clientY, show: true });
                    }}>
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800">
                          <tr>
                            {activeTab.result.columns.map((c, i) => (
                              <th
                                key={i}
                                ref={(el) => { (headerRefs as any)[c] = el; }}
                                className="text-left px-2 py-1 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap relative"
                                style={activeTab.columnWidths?.[c] ? { width: activeTab.columnWidths[c] } : { minWidth: '100px' }}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  if (!activeTab?.connectionId) return;
                                  setColumnMenu({ x: e.clientX, y: e.clientY, show: true, column: c });
                                }}
                              >
                                {c}
                                <span
                                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500/40"
                                  onMouseDown={(e) => startResize(c, e)}
                                />
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {activeTab.result.rows.map((r, i) => (
                            <tr key={i} className="odd:bg-gray-50/50 dark:odd:bg-gray-800/50">
                              {activeTab.result!.columns.map((c, j) => (
                                <td
                                  key={j}
                                  className="px-2 py-1 align-top border-b border-gray-100 dark:border-gray-800"
                                  style={activeTab.columnWidths?.[c] ? { width: activeTab.columnWidths[c] } : undefined}
                                >
                                  <pre className="whitespace-pre-wrap break-words text-[11px]">{formatCell(r[c])}</pre>
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
                {/* Status Bar */}
                <StatusBar tab={activeTab} />
                {/* Context Menus */}
                {resultMenu.show && (
                  <div
                    className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg text-xs"
                    style={{ left: resultMenu.x, top: resultMenu.y }}
                    onMouseLeave={() => setResultMenu(prev => ({ ...prev, show: false }))}
                    onClick={() => setResultMenu(prev => ({ ...prev, show: false }))}
                  >
                    <MenuItem label="Copy CSV" onClick={copyCSV} disabled={!activeTab?.result?.columns?.length} />
                    <MenuItem label="Copy JSON" onClick={copyJSON} disabled={!activeTab?.result} />
                    <div className="h-px bg-gray-200 dark:bg-gray-700 mx-1" />
                    <MenuItem label="Export CSV…" onClick={exportCSV} disabled={!activeTab?.result?.columns?.length} />
                    <MenuItem label="Export JSON…" onClick={exportJSON} disabled={!activeTab?.result} />
                  </div>
                )}
                {columnMenu.show && (
                  <div
                    className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg text-xs"
                    style={{ left: columnMenu.x, top: columnMenu.y }}
                    onMouseLeave={() => setColumnMenu(prev => ({ ...prev, show: false }))}
                  >
                    <MenuItem label={`Order by ${columnMenu.column} ASC`} onClick={() => { setColumnMenu(prev => ({ ...prev, show: false })); applyOrderBy(columnMenu.column!, 'ASC'); }} />
                    <MenuItem label={`Order by ${columnMenu.column} DESC`} onClick={() => { setColumnMenu(prev => ({ ...prev, show: false })); applyOrderBy(columnMenu.column!, 'DESC'); }} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center min-h-0">
          <div className="text-sm text-gray-500 dark:text-gray-400">Open a table to start</div>
        </div>
      )}
    </div>
  );
}

function formatCell(value: any) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function injectOrderBy(sql: string, column: string, dir: 'ASC' | 'DESC') {
  // Very basic ORDER BY toggler: if ORDER BY exists, replace; else, add.
  const hasOrder = /order\s+by/gi.test(sql);
  if (hasOrder) {
    return sql.replace(/order\s+by[\s\S]*?($|;)/i, `ORDER BY ${wrapIdent(column)} ${dir}$1`);
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
    if (tab.status === 'running') {
      const id = setInterval(() => setNow(Date.now()), 250);
      return () => clearInterval(id);
    }
  }, [tab.status]);
  const bg = tab.status === 'running' ? 'bg-yellow-100 dark:bg-yellow-900/30' : tab.status === 'error' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-800';
  const elapsed = tab.status === 'running' && tab.startedAt ? now - tab.startedAt : tab.result?.executionTime ?? 0;
  const pos = tab.editorFocused && tab.editorPos ? `Ln ${tab.editorPos.line}, Col ${tab.editorPos.column}` : '';
  const dbName = tab.connectionName ? (tab.database ? `${tab.connectionName} • ${tab.database}` : tab.connectionName) : (tab.database || '');
  return (
    <div className={`flex items-center justify-between px-3 py-[3px] text-[11px] leading-tight border-t border-gray-200 dark:border-gray-800 ${bg}`}>
      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
        {pos && <span>{pos}</span>}
        {pos && dbName && <span className="opacity-60">|</span>}
        {dbName && <span>{dbName}</span>}
      </div>
      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
        <span>Status: {tab.status || 'idle'}</span>
        <span className="opacity-60">|</span>
        <span>{tab.result?.rowCount ?? 0} rows</span>
        <span className="opacity-60">|</span>
        <span>{elapsed} ms</span>
      </div>
    </div>
  );
}

function MenuItem({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      className={`block w-56 text-left px-3 py-1 ${disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
      onClick={(e) => { e.stopPropagation(); if (!disabled) onClick(); }}
      disabled={!!disabled}
    >
      {label}
    </button>
  );
}