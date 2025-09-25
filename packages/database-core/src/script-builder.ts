import {
  DbEngine,
  TableRef,
  KeyInfo,
  ConstraintInfo,
  TriggerInfo,
  IndexInfo,
  ColumnInfo,
} from "./types.js";

/**
 * Engine-aware script builder for generating DDL statements
 */
export class ScriptBuilder {
  private engine: DbEngine;

  constructor(engine: DbEngine) {
    this.engine = engine;
  }

  /**
   * Escape identifier for the current engine
   */
  escapeIdentifier(identifier: string): string {
    switch (this.engine) {
      case "sqlserver":
        return `[${identifier.replace(/\]/g, "]]")}]`;
      case "postgres":
      case "sqlite":
        return `"${identifier.replace(/"/g, '""')}"`;
      default:
        return `"${identifier}"`;
    }
  }

  /**
   * Format qualified object name
   */
  formatQualifiedName(tableRef: TableRef): string {
    const parts: string[] = [];

    if (tableRef.database && this.engine === "sqlserver") {
      parts.push(this.escapeIdentifier(tableRef.database));
    }

    if (tableRef.schema) {
      parts.push(this.escapeIdentifier(tableRef.schema));
    }

    parts.push(this.escapeIdentifier(tableRef.name));

    return parts.join(".");
  }

  /**
   * Generate CREATE script for a trigger
   */
  generateTriggerCreate(trigger: TriggerInfo, tableRef: TableRef): string {
    const _qualifiedTable = this.formatQualifiedName(tableRef);
    const triggerName = this.escapeIdentifier(trigger.name);

    if (!trigger.definition) {
      return `-- No definition available for trigger ${triggerName}`;
    }

    switch (this.engine) {
      case "sqlserver":
        return trigger.definition;

      case "postgres":
        return trigger.definition;

      case "sqlite":
        return trigger.definition;

      default:
        return `-- CREATE trigger not supported for ${this.engine}`;
    }
  }

  /**
   * Generate ALTER script for a trigger
   */
  generateTriggerAlter(trigger: TriggerInfo, tableRef: TableRef): string {
    const qualifiedTable = this.formatQualifiedName(tableRef);
    const triggerName = this.escapeIdentifier(trigger.name);

    switch (this.engine) {
      case "sqlserver":
        if (trigger.definition) {
          // Replace CREATE with ALTER in the definition
          return trigger.definition.replace(
            /CREATE\s+TRIGGER/i,
            "ALTER TRIGGER"
          );
        }
        return `-- ALTER TRIGGER ${triggerName} ON ${qualifiedTable}\n-- (Definition not available)`;

      case "postgres":
        return `-- ALTER TRIGGER not directly supported in PostgreSQL\n-- Use DROP and CREATE instead`;

      case "sqlite":
        return `-- ALTER TRIGGER not supported in SQLite\n-- Use DROP and CREATE instead`;

      default:
        return `-- ALTER trigger not supported for ${this.engine}`;
    }
  }

  /**
   * Generate DROP script for a trigger
   */
  generateTriggerDrop(trigger: TriggerInfo, tableRef: TableRef): string {
    const qualifiedTable = this.formatQualifiedName(tableRef);
    const triggerName = this.escapeIdentifier(trigger.name);

    switch (this.engine) {
      case "sqlserver":
        return `DROP TRIGGER ${triggerName};`;

      case "postgres":
        return `DROP TRIGGER ${triggerName} ON ${qualifiedTable};`;

      case "sqlite":
        return `DROP TRIGGER ${triggerName};`;

      default:
        return `-- DROP trigger not supported for ${this.engine}`;
    }
  }

  /**
   * Generate CREATE script for an index
   */
  generateIndexCreate(index: IndexInfo, tableRef: TableRef): string {
    const qualifiedTable = this.formatQualifiedName(tableRef);
    const indexName = this.escapeIdentifier(index.name);
    const columns = index.columns
      .map(col => this.escapeIdentifier(col))
      .join(", ");

    if (index.isPrimary) {
      return `-- Primary key index cannot be created separately`;
    }

    switch (this.engine) {
      case "sqlserver": {
        let script = `CREATE ${index.unique ? "UNIQUE " : ""}INDEX ${indexName} ON ${qualifiedTable} (${columns})`;
        if (index.include && index.include.length > 0) {
          const includeColumns = index.include
            .map(col => this.escapeIdentifier(col))
            .join(", ");
          script += ` INCLUDE (${includeColumns})`;
        }
        if (index.where) {
          script += ` WHERE ${index.where}`;
        }
        return script + ";";
      }

      case "postgres": {
        let pgScript = `CREATE ${index.unique ? "UNIQUE " : ""}INDEX ${indexName} ON ${qualifiedTable}`;
        if (index.method) {
          pgScript += ` USING ${index.method}`;
        }
        pgScript += ` (${columns})`;
        if (index.where) {
          pgScript += ` WHERE ${index.where}`;
        }
        return pgScript + ";";
      }

      case "sqlite":
        return `CREATE ${index.unique ? "UNIQUE " : ""}INDEX ${indexName} ON ${qualifiedTable} (${columns});`;

      default:
        return `-- CREATE index not supported for ${this.engine}`;
    }
  }

  /**
   * Generate DROP script for an index
   */
  generateIndexDrop(index: IndexInfo, tableRef: TableRef): string {
    const qualifiedTable = this.formatQualifiedName(tableRef);
    const indexName = this.escapeIdentifier(index.name);

    if (index.isPrimary) {
      return `-- Cannot drop primary key index directly`;
    }

    switch (this.engine) {
      case "sqlserver":
        return `DROP INDEX ${indexName} ON ${qualifiedTable};`;

      case "postgres":
      case "sqlite":
        return `DROP INDEX ${indexName};`;

      default:
        return `-- DROP index not supported for ${this.engine}`;
    }
  }

  /**
   * Generate CREATE script for a constraint
   */
  generateConstraintCreate(
    constraint: ConstraintInfo,
    tableRef: TableRef
  ): string {
    const qualifiedTable = this.formatQualifiedName(tableRef);
    const constraintName = this.escapeIdentifier(constraint.name);

    switch (this.engine) {
      case "sqlserver":
      case "postgres":
        if (constraint.definition) {
          return `ALTER TABLE ${qualifiedTable} ADD CONSTRAINT ${constraintName} ${constraint.definition};`;
        }
        return `-- Definition not available for constraint ${constraintName}`;

      case "sqlite":
        return `-- SQLite does not support adding constraints to existing tables`;

      default:
        return `-- CREATE constraint not supported for ${this.engine}`;
    }
  }

  /**
   * Generate DROP script for a constraint
   */
  generateConstraintDrop(
    constraint: ConstraintInfo,
    tableRef: TableRef
  ): string {
    const qualifiedTable = this.formatQualifiedName(tableRef);
    const constraintName = this.escapeIdentifier(constraint.name);

    switch (this.engine) {
      case "sqlserver":
      case "postgres":
        return `ALTER TABLE ${qualifiedTable} DROP CONSTRAINT ${constraintName};`;

      case "sqlite":
        return `-- SQLite does not support dropping constraints`;

      default:
        return `-- DROP constraint not supported for ${this.engine}`;
    }
  }

  /**
   * Generate CREATE script for a key
   */
  generateKeyCreate(key: KeyInfo, tableRef: TableRef): string {
    const qualifiedTable = this.formatQualifiedName(tableRef);
    const keyName = this.escapeIdentifier(key.name);
    const columns = key.columns
      .map(col => this.escapeIdentifier(col))
      .join(", ");

    switch (this.engine) {
      case "sqlserver":
      case "postgres":
        if (key.type === "PRIMARY") {
          return `ALTER TABLE ${qualifiedTable} ADD CONSTRAINT ${keyName} PRIMARY KEY (${columns});`;
        } else if (key.type === "FOREIGN") {
          if (key.references) {
            const refTable = key.references.schema
              ? `${this.escapeIdentifier(key.references.schema)}.${this.escapeIdentifier(key.references.table)}`
              : this.escapeIdentifier(key.references.table);
            const refColumns = key.references.columns
              .map(col => this.escapeIdentifier(col))
              .join(", ");
            return `ALTER TABLE ${qualifiedTable} ADD CONSTRAINT ${keyName} FOREIGN KEY (${columns}) REFERENCES ${refTable} (${refColumns});`;
          }
          return `-- Foreign key reference information not available`;
        } else if (key.type === "UNIQUE") {
          return `ALTER TABLE ${qualifiedTable} ADD CONSTRAINT ${keyName} UNIQUE (${columns});`;
        }
        return `-- Unknown key type: ${key.type}`;

      case "sqlite":
        return `-- SQLite does not support adding keys to existing tables`;

      default:
        return `-- CREATE key not supported for ${this.engine}`;
    }
  }

  /**
   * Generate DROP script for a key
   */
  generateKeyDrop(key: KeyInfo, tableRef: TableRef): string {
    const qualifiedTable = this.formatQualifiedName(tableRef);
    const keyName = this.escapeIdentifier(key.name);

    switch (this.engine) {
      case "sqlserver":
      case "postgres":
        return `ALTER TABLE ${qualifiedTable} DROP CONSTRAINT ${keyName};`;

      case "sqlite":
        return `-- SQLite does not support dropping constraints`;

      default:
        return `-- DROP key not supported for ${this.engine}`;
    }
  }

  /**
   * Generate CREATE TABLE script
   */
  generateTableCreate(columns: ColumnInfo[], tableRef: TableRef): string {
    const qualifiedTable = this.formatQualifiedName(tableRef);

    const columnDefs = columns.map(col => {
      const name = this.escapeIdentifier(col.name);
      let typeSpec = this.formatDataType(col);
      const nullable = col.nullable ? "NULL" : "NOT NULL";
      const defaultValue = col.defaultValue
        ? ` DEFAULT ${col.defaultValue}`
        : "";

      return `  ${name} ${typeSpec} ${nullable}${defaultValue}`.trimEnd();
    });

    return `CREATE TABLE ${qualifiedTable} (\n${columnDefs.join(",\n")}\n);`;
  }

  /**
   * Generate DROP TABLE script
   */
  generateTableDrop(tableRef: TableRef): string {
    const qualifiedTable = this.formatQualifiedName(tableRef);
    return `DROP TABLE ${qualifiedTable};`;
  }

  /**
   * Format data type specification based on engine
   */
  private formatDataType(column: ColumnInfo): string {
    const baseType = column.dataType.toLowerCase();

    switch (this.engine) {
      case "sqlserver":
        if (
          [
            "varchar",
            "nvarchar",
            "char",
            "nchar",
            "binary",
            "varbinary",
          ].includes(baseType)
        ) {
          const length = column.maxLength;
          const lengthStr =
            length === -1 || length === null ? "MAX" : length?.toString() || "";
          return lengthStr
            ? `${column.dataType}(${lengthStr})`
            : column.dataType;
        } else if (["decimal", "numeric"].includes(baseType)) {
          const precision = column.precision ?? 18;
          const scale = column.scale ?? 0;
          return `${column.dataType}(${precision},${scale})`;
        }
        return column.dataType;

      case "postgres":
        if (["varchar", "char"].includes(baseType)) {
          return column.maxLength
            ? `${column.dataType}(${column.maxLength})`
            : column.dataType;
        } else if (["decimal", "numeric"].includes(baseType)) {
          const precision = column.precision;
          const scale = column.scale;
          if (precision && scale !== undefined) {
            return `${column.dataType}(${precision},${scale})`;
          } else if (precision) {
            return `${column.dataType}(${precision})`;
          }
        }
        return column.dataType;

      case "sqlite":
        // SQLite is more flexible with types
        return column.dataType;

      default:
        return column.dataType;
    }
  }
}
