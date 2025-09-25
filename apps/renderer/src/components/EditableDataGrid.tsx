import { useState, useEffect, useRef } from "react";
import { Trash2, Plus, Save, RotateCcw } from "lucide-react";

interface Column {
  name: string;
  dataType: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  defaultValue?: string;
  maxLength?: number;
  precision?: number;
  scale?: number;
}

interface Row {
  [key: string]: any;
  _isNew?: boolean;
  _isModified?: boolean;
  _isDeleted?: boolean;
  _originalRow?: Record<string, any>;
}

interface EditableDataGridProps {
  connectionId: string;
  connectionType?: string;
  schema: string;
  table: string;
  onStatusChange?: (
    status: "idle" | "loading" | "saving" | "error",
    message?: string
  ) => void;
}

export default function EditableDataGrid({
  connectionId,
  connectionType,
  schema,
  table,
  onStatusChange,
}: EditableDataGridProps) {
  const [columns, setColumns] = useState<Column[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [originalRows, setOriginalRows] = useState<Row[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{
    rowIndex: number;
    columnName: string;
  } | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const editInputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    loadTableData();
  }, [connectionId, schema, table]);

  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingCell]);

  const loadTableData = async () => {
    try {
      setIsLoading(true);
      onStatusChange?.("loading", "Loading table data...");
      setError(null);

      if (!window.electronAPI?.database) {
        throw new Error("Database API not available");
      }

      // Load table metadata (columns)
      const columnsData = await window.electronAPI.database.getTableData(
        connectionId,
        table,
        schema
      );

      if (!columnsData.columns || columnsData.columns.length === 0) {
        throw new Error("Unable to load table structure");
      }

      setColumns(columnsData.columns);

      // Load table data with a reasonable limit
      const ident = (n: string) =>
        connectionType === "sqlserver" ? `[${n}]` : `"${n}"`;
      const qualified = `${ident(schema)}.${ident(table)}`;
      const query =
        connectionType === "sqlserver"
          ? `SELECT TOP 200 * FROM ${qualified} ORDER BY 1`
          : `SELECT * FROM ${qualified} LIMIT 200`;

      const result = await window.electronAPI.database.executeQuery(
        connectionId,
        query
      );

      const processedRows = result.rows.map((row: any) => ({
        ...row,
        _isNew: false,
        _isModified: false,
        _isDeleted: false,
        _originalRow: { ...row },
      }));

      setRows(processedRows);
      setOriginalRows(JSON.parse(JSON.stringify(processedRows)));
      onStatusChange?.("idle", `Loaded ${result.rows.length} rows`);
    } catch (err: any) {
      console.error("Failed to load table data:", err);
      setError(err.message || "Failed to load table data");
      onStatusChange?.("error", err.message || "Failed to load table data");
    } finally {
      setIsLoading(false);
    }
  };

  const addNewRow = () => {
    const newRow: Row = {
      _isNew: true,
      _isModified: false,
      _isDeleted: false,
    };

    // Initialize with default values
    columns.forEach(col => {
      if (col.defaultValue !== undefined) {
        newRow[col.name] = col.defaultValue;
      } else if (!col.nullable && !col.isPrimaryKey) {
        // Set some reasonable defaults for non-nullable columns
        switch (col.dataType ? col.dataType.toLowerCase() : "text") {
          case "varchar":
          case "nvarchar":
          case "char":
          case "nchar":
          case "text":
          case "ntext":
            newRow[col.name] = "";
            break;
          case "int":
          case "bigint":
          case "smallint":
          case "tinyint":
          case "decimal":
          case "numeric":
          case "float":
          case "real":
            newRow[col.name] = 0;
            break;
          case "bit":
          case "boolean":
            newRow[col.name] = false;
            break;
          case "datetime":
          case "datetime2":
          case "date":
          case "timestamp":
            newRow[col.name] = new Date().toISOString().slice(0, 19);
            break;
          default:
            newRow[col.name] = null;
        }
      } else {
        newRow[col.name] = null;
      }
    });

    setRows(prev => [...prev, newRow]);
  };

  const deleteSelectedRows = () => {
    if (selectedRows.size === 0) return;

    setRows(
      prev =>
        prev
          .map((row, index) => {
            if (selectedRows.has(index)) {
              if (row._isNew) {
                // Remove new rows completely
                return null;
              } else {
                // Mark existing rows for deletion
                return {
                  ...row,
                  _isDeleted: true,
                  _isModified: true,
                };
              }
            }
            return row;
          })
          .filter(row => row !== null) as Row[]
    );

    setSelectedRows(new Set());
  };

  const updateCell = (rowIndex: number, columnName: string, value: unknown) => {
    console.log(
      `🔧 updateCell: rowIndex=${rowIndex}, column=${columnName}, newValue=`,
      value
    );

    setRows(prev =>
      prev.map((row, index) => {
        if (index === rowIndex) {
          const originalValue = row._originalRow?.[columnName];

          // Better value comparison handling null/undefined and type coercion
          let isChanged = false;
          if (originalValue === null || originalValue === undefined) {
            isChanged = value !== null && value !== undefined && value !== "";
          } else if (value === null || value === undefined || value === "") {
            isChanged = originalValue !== null && originalValue !== undefined;
          } else {
            // Convert both to strings for comparison to handle type differences
            isChanged = String(originalValue) !== String(value);
          }

          console.log(
            `🔧 updateCell: originalValue=`,
            originalValue,
            `isChanged=${isChanged}, _isNew=${row._isNew}`
          );

          const updatedRow = {
            ...row,
            [columnName]: value,
            _isModified: row._isNew || isChanged || row._isModified,
          };

          console.log(
            `🔧 updateCell: updatedRow._isModified=${updatedRow._isModified}`
          );
          return updatedRow;
        }
        return row;
      })
    );
  };

  const saveChanges = async () => {
    try {
      console.log("🔧 saveChanges: Starting save process");
      onStatusChange?.("saving", "Saving changes...");

      const changes = rows.filter(row => row._isModified || row._isDeleted);
      console.log(
        `🔧 saveChanges: Found ${changes.length} changes to save:`,
        changes
      );

      if (changes.length === 0) {
        onStatusChange?.("idle", "No changes to save");
        return;
      }

      // Generate SQL statements for changes
      const statements: string[] = [];
      const ident = (n: string) =>
        connectionType === "sqlserver" ? `[${n}]` : `"${n}"`;
      const qualified = `${ident(schema)}.${ident(table)}`;

      console.log(`🔧 saveChanges: Table qualified name: ${qualified}`);

      for (const row of changes) {
        if (row._isDeleted && !row._isNew) {
          // DELETE statement
          console.log(`🔧 saveChanges: Processing DELETE for row:`, row);

          const primaryKeyColumns = columns.filter(col => col.isPrimaryKey);
          let whereClause = primaryKeyColumns
            .map(
              col =>
                `${ident(col.name)} = ${formatValue(row._originalRow?.[col.name], col)}`
            )
            .join(" AND ");

          // If no primary keys, fall back to using all original column values for WHERE clause
          if (!whereClause && row._originalRow) {
            console.log(
              `🔧 saveChanges: No primary keys for DELETE, using all columns for WHERE clause`
            );
            whereClause = columns
              .map(col => {
                const originalValue = formatValue(
                  row._originalRow?.[col.name],
                  col
                );
                return `${ident(col.name)} = ${originalValue}`;
              })
              .join(" AND ");
            console.log(
              `🔧 saveChanges: DELETE fallback WHERE clause: ${whereClause}`
            );
          }

          if (whereClause) {
            const deleteStatement = `DELETE FROM ${qualified} WHERE ${whereClause}`;
            console.log(
              `🔧 saveChanges: Generated DELETE statement: ${deleteStatement}`
            );
            statements.push(deleteStatement);
          } else {
            console.warn(
              `🔧 saveChanges: Skipped DELETE - no WHERE clause could be generated`
            );
          }
        } else if (row._isNew && !row._isDeleted) {
          // INSERT statement
          const nonPkColumns = columns.filter(
            col => !col.isPrimaryKey || row[col.name] !== null
          );
          const columnNames = nonPkColumns
            .map(col => ident(col.name))
            .join(", ");
          const values = nonPkColumns
            .map(col => formatValue(row[col.name], col))
            .join(", ");

          statements.push(
            `INSERT INTO ${qualified} (${columnNames}) VALUES (${values})`
          );
        } else if (!row._isNew && !row._isDeleted) {
          // UPDATE statement
          console.log(`🔧 saveChanges: Processing UPDATE for row:`, row);

          const setClause = columns
            .filter(col => !col.isPrimaryKey)
            .map(col => {
              const value = formatValue(row[col.name], col);
              console.log(`🔧 saveChanges: SET ${col.name} = ${value}`);
              return `${ident(col.name)} = ${value}`;
            })
            .join(", ");

          const primaryKeyColumns = columns.filter(col => col.isPrimaryKey);
          console.log(
            `🔧 saveChanges: Primary key columns:`,
            primaryKeyColumns
          );
          console.log(
            `🔧 saveChanges: All columns:`,
            columns.map(c => ({ name: c.name, isPrimaryKey: c.isPrimaryKey }))
          );

          const whereClause = primaryKeyColumns
            .map(col => {
              const value = formatValue(row._originalRow?.[col.name], col);
              console.log(
                `🔧 saveChanges: WHERE ${col.name} = ${value} (isPK: ${col.isPrimaryKey})`
              );
              return `${ident(col.name)} = ${value}`;
            })
            .join(" AND ");

          console.log(`🔧 saveChanges: SET clause: ${setClause}`);
          console.log(`🔧 saveChanges: WHERE clause: ${whereClause}`);

          // If no primary keys, fall back to using all original column values for WHERE clause
          let finalWhereClause = whereClause;
          if (!finalWhereClause && row._originalRow) {
            console.log(
              `🔧 saveChanges: No primary keys found, using all columns for WHERE clause`
            );
            finalWhereClause = columns
              .map(col => {
                const originalValue = formatValue(
                  row._originalRow?.[col.name],
                  col
                );
                return `${ident(col.name)} = ${originalValue}`;
              })
              .join(" AND ");
            console.log(
              `🔧 saveChanges: Fallback WHERE clause: ${finalWhereClause}`
            );
          }

          if (setClause && finalWhereClause) {
            const updateStatement = `UPDATE ${qualified} SET ${setClause} WHERE ${finalWhereClause}`;
            console.log(
              `🔧 saveChanges: Generated UPDATE statement: ${updateStatement}`
            );
            statements.push(updateStatement);
          } else {
            console.warn(
              `🔧 saveChanges: Skipped UPDATE - missing clauses. SET: "${setClause}", WHERE: "${finalWhereClause}"`
            );
          }
        }
      }

      console.log(
        `🔧 saveChanges: Generated ${statements.length} SQL statements:`,
        statements
      );

      // Execute all statements
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        console.log(
          `🔧 saveChanges: Executing statement ${i + 1}/${statements.length}: ${statement}`
        );

        try {
          const result = await window.electronAPI.database.executeQuery(
            connectionId,
            statement
          );
          console.log(
            `🔧 saveChanges: Statement ${i + 1} executed successfully:`,
            result
          );
        } catch (statementError) {
          console.error(
            `🔧 saveChanges: Statement ${i + 1} failed:`,
            statementError
          );
          throw statementError;
        }
      }

      console.log("🔧 saveChanges: All statements executed, reloading data...");
      // Reload data to reflect changes
      await loadTableData();

      console.log("🔧 saveChanges: Data reloaded successfully");
      onStatusChange?.(
        "idle",
        `Saved ${statements.length} changes successfully`
      );
    } catch (err: unknown) {
      console.error("Failed to save changes:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save changes";
      onStatusChange?.("error", errorMessage);
    }
  };

  const revertChanges = () => {
    setRows(JSON.parse(JSON.stringify(originalRows)));
    setSelectedRows(new Set());
    onStatusChange?.("idle", "Changes reverted");
  };

  const formatValue = (value: unknown, column: Column): string => {
    if (value === null || value === undefined) {
      return "NULL";
    }

    // Safety check for column.dataType
    const dataType = column.dataType ? column.dataType.toLowerCase() : "text";

    if (
      dataType.includes("varchar") ||
      dataType.includes("char") ||
      dataType.includes("text") ||
      dataType.includes("date") ||
      dataType.includes("time")
    ) {
      return `'${String(value).replace(/'/g, "''")}'`;
    }

    if (dataType === "bit" || dataType === "boolean") {
      return value ? "1" : "0";
    }

    return String(value);
  };

  const formatDisplayValue = (value: unknown): string => {
    if (value === null || value === undefined) {
      return "";
    }
    try {
      return String(value);
    } catch (error) {
      console.error("🔧 formatDisplayValue error:", error, "value:", value);
      return "";
    }
  };

  const getColumnWidth = (columnName: string): number => {
    return columnWidths[columnName] || 150;
  };

  const startResize = (columnName: string, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = getColumnWidth(columnName);

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(
        60,
        Math.min(400, startWidth + (e.clientX - startX))
      );
      setColumnWidths(prev => ({ ...prev, [columnName]: newWidth }));
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const handleCellClick = (rowIndex: number, columnName: string) => {
    try {
      console.log(
        `🔧 handleCellClick: rowIndex=${rowIndex}, columnName=${columnName}`
      );

      if (rowIndex < 0 || rowIndex >= rows.length) {
        console.error(
          `🔧 handleCellClick: Invalid rowIndex ${rowIndex}, rows.length=${rows.length}`
        );
        return;
      }

      const row = rows[rowIndex];
      if (!row) {
        console.error(`🔧 handleCellClick: Row not found at index ${rowIndex}`);
        return;
      }

      if (row._isDeleted) return;

      const currentValue = formatDisplayValue(row[columnName]);
      console.log(`🔧 handleCellClick: currentValue="${currentValue}"`);

      setEditingValue(currentValue);
      setEditingCell({ rowIndex, columnName });
    } catch (error) {
      console.error("🔧 handleCellClick error:", error);
    }
  };

  const handleCellChange = (value: string) => {
    setEditingValue(value);
  };

  const commitCellChange = () => {
    console.log(
      `🔧 commitCellChange: editingCell=`,
      editingCell,
      `editingValue="${editingValue}"`
    );

    if (!editingCell) {
      console.log(`🔧 commitCellChange: No editing cell, returning`);
      return;
    }

    const column = columns.find(col => col.name === editingCell.columnName);
    if (!column) {
      console.log(
        `🔧 commitCellChange: Column not found for ${editingCell.columnName}`
      );
      return;
    }

    let processedValue: unknown = editingValue;

    // Process value based on column type - add safety checks
    const dataType = column.dataType ? column.dataType.toLowerCase() : "text";
    console.log(
      `🔧 commitCellChange: column type="${dataType}", nullable=${column.nullable}`
    );

    // Safety check for editingValue
    const safeEditingValue = editingValue || "";

    if (safeEditingValue.trim() === "" && column.nullable) {
      processedValue = null;
    } else if (
      dataType.includes("int") ||
      dataType.includes("numeric") ||
      dataType.includes("decimal")
    ) {
      const numValue = Number(safeEditingValue);
      processedValue = isNaN(numValue) ? safeEditingValue : numValue;
    } else if (dataType === "bit" || dataType === "boolean") {
      processedValue =
        safeEditingValue.toLowerCase() === "true" || safeEditingValue === "1";
    }

    console.log(`🔧 commitCellChange: processedValue=`, processedValue);
    updateCell(editingCell.rowIndex, editingCell.columnName, processedValue);
    setEditingCell(null);
    setEditingValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    try {
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        commitCellChange();
      } else if (e.key === "Escape") {
        setEditingCell(null);
        setEditingValue("");
      }
    } catch (error) {
      console.error("🔧 handleKeyDown error:", error);
    }
  };

  const toggleRowSelection = (rowIndex: number) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowIndex)) {
        newSet.delete(rowIndex);
      } else {
        newSet.add(rowIndex);
      }
      return newSet;
    });
  };

  const hasChanges = rows.some(row => row._isModified || row._isDeleted);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading table data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b border-border bg-secondary">
        <button
          onClick={addNewRow}
          className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
        >
          <Plus size={14} />
          Add Row
        </button>
        <button
          onClick={deleteSelectedRows}
          disabled={selectedRows.size === 0}
          className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 size={14} />
          Delete ({selectedRows.size})
        </button>
        <div className="h-4 w-px bg-border mx-1" />
        <button
          onClick={saveChanges}
          disabled={!hasChanges}
          className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={14} />
          Save Changes
        </button>
        <button
          onClick={revertChanges}
          disabled={!hasChanges}
          className="flex items-center gap-1 px-3 py-1 bg-muted text-foreground rounded text-sm hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCcw size={14} />
          Revert
        </button>
        <div className="flex-1" />
        <div className="text-xs text-muted-foreground">
          {rows.length} rows • {hasChanges ? "Unsaved changes" : "No changes"}
        </div>
      </div>

      {/* Data Grid */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-muted">
            <tr>
              <th className="w-8 px-2 py-1 border-b border-border">
                <input
                  type="checkbox"
                  checked={selectedRows.size === rows.length && rows.length > 0}
                  onChange={e => {
                    if (e.target.checked) {
                      setSelectedRows(new Set(rows.map((_, i) => i)));
                    } else {
                      setSelectedRows(new Set());
                    }
                  }}
                />
              </th>
              {columns.map(column => (
                <th
                  key={column.name}
                  className="text-left px-2 py-1 border-b border-border whitespace-nowrap relative bg-muted"
                  style={{ width: getColumnWidth(column.name) }}
                >
                  <div className="flex items-center gap-1">
                    <span>{column.name}</span>
                    {column.isPrimaryKey && (
                      <span className="text-yellow-500 text-[10px]">PK</span>
                    )}
                    {column.isForeignKey && (
                      <span className="text-blue-500 text-[10px]">FK</span>
                    )}
                    {!column.nullable && (
                      <span className="text-red-500 text-[10px]">*</span>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {column.dataType}
                  </div>
                  <span
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500/40"
                    onMouseDown={e => startResize(column.name, e)}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={`
                  ${row._isDeleted ? "opacity-50 bg-red-50 dark:bg-red-900/20" : ""}
                  ${row._isNew ? "bg-green-50 dark:bg-green-900/20" : ""}
                  ${row._isModified && !row._isNew && !row._isDeleted ? "bg-blue-50 dark:bg-blue-900/20" : ""}
                  ${selectedRows.has(rowIndex) ? "bg-accent" : ""}
                  odd:bg-muted/50 hover:bg-accent/50
                `}
              >
                <td className="px-2 py-1 border-b border-border/60">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(rowIndex)}
                    onChange={() => toggleRowSelection(rowIndex)}
                  />
                </td>
                {columns.map(column => (
                  <td
                    key={column.name}
                    className="px-2 py-1 align-top border-b border-border/60 cursor-pointer hover:bg-accent/30"
                    style={{ width: getColumnWidth(column.name) }}
                    onClick={() => handleCellClick(rowIndex, column.name)}
                  >
                    {editingCell?.rowIndex === rowIndex &&
                    editingCell.columnName === column.name ? (
                      <input
                        ref={editInputRef as React.RefObject<HTMLInputElement>}
                        type="text"
                        className="w-full bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-500 rounded px-1"
                        value={editingValue}
                        onChange={e => handleCellChange(e.target.value)}
                        onBlur={commitCellChange}
                        onKeyDown={handleKeyDown}
                      />
                    ) : (
                      <div className="whitespace-pre-wrap break-words min-h-[16px]">
                        {row._isDeleted ? (
                          <span className="line-through">
                            {formatDisplayValue(row[column.name])}
                          </span>
                        ) : (
                          formatDisplayValue(row[column.name])
                        )}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
