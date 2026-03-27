import { z } from 'zod';
import type { DatabaseType } from '@sqlhelper/database-core';

// Risk levels for SQL operations
export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Security policy configuration
export interface SecurityPolicy {
  // Execution controls
  allowDataModification: boolean;
  allowSchemaChanges: boolean;
  allowSystemQueries: boolean;
  allowCrossTableJoins: boolean;
  requireReviewForRisk: RiskLevel;
  
  // Query limits
  maxExecutionTime: number; // seconds
  maxRowsReturned: number;
  maxTablesJoined: number;
  
  // Blocked patterns
  blockedKeywords: string[];
  blockedTablePatterns: string[];
  blockedFunctionPatterns: string[];
  
  // Audit requirements
  auditAllQueries: boolean;
  auditDataChanges: boolean;
  retentionDays: number;
}

// Analysis result for a SQL query
export interface SecurityAnalysis {
  riskLevel: RiskLevel;
  issues: SecurityIssue[];
  warnings: string[];
  recommendations: string[];
  allowedToExecute: boolean;
  requiresReview: boolean;
  estimatedImpact: {
    affectedTables: string[];
    estimatedRows: number;
    isDataModification: boolean;
    isSchemaChange: boolean;
  };
}

// Security issue detected in query
export interface SecurityIssue {
  type: 'BLOCKED_KEYWORD' | 'SCHEMA_CHANGE' | 'DATA_MODIFICATION' | 'SYSTEM_ACCESS' | 'PERFORMANCE_RISK' | 'SUSPICIOUS_PATTERN';
  severity: RiskLevel;
  message: string;
  suggestion?: string;
  position?: {
    start: number;
    end: number;
  };
}

// Audit log entry
export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId?: string;
  sessionId: string;
  query: string;
  queryHash: string;
  databaseType: DatabaseType;
  connectionInfo: {
    server: string;
    database: string;
  };
  securityAnalysis: SecurityAnalysis;
  executionResult?: {
    success: boolean;
    error?: string;
    rowsAffected?: number;
    executionTime: number;
  };
  reviewStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
}

// Query review workflow
export interface QueryReview {
  id: string;
  query: string;
  securityAnalysis: SecurityAnalysis;
  submittedBy: string;
  submittedAt: Date;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: string;
  reviewedAt?: Date;
  notes?: string;
  expiresAt: Date;
}

// Default security policy
export const DEFAULT_SECURITY_POLICY: SecurityPolicy = {
  allowDataModification: false,
  allowSchemaChanges: false,
  allowSystemQueries: false,
  allowCrossTableJoins: true,
  requireReviewForRisk: RiskLevel.HIGH,
  maxExecutionTime: 30,
  maxRowsReturned: 10000,
  maxTablesJoined: 5,
  blockedKeywords: [
    'DROP', 'DELETE', 'TRUNCATE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE',
    'EXEC', 'EXECUTE', 'xp_', 'sp_', 'OPENROWSET', 'OPENDATASOURCE',
    'SHUTDOWN', 'KILL', 'BACKUP', 'RESTORE'
  ],
  blockedTablePatterns: [
    'sys.*', 'information_schema.*', 'pg_*', 'master.*', 'msdb.*'
  ],
  blockedFunctionPatterns: [
    'xp_*', 'sp_*', 'fn_*'
  ],
  auditAllQueries: true,
  auditDataChanges: true,
  retentionDays: 90
};

// Schema validation
export const SecurityPolicySchema = z.object({
  allowDataModification: z.boolean(),
  allowSchemaChanges: z.boolean(),
  allowSystemQueries: z.boolean(),
  allowCrossTableJoins: z.boolean(),
  requireReviewForRisk: z.nativeEnum(RiskLevel),
  maxExecutionTime: z.number().positive(),
  maxRowsReturned: z.number().positive(),
  maxTablesJoined: z.number().positive(),
  blockedKeywords: z.array(z.string()),
  blockedTablePatterns: z.array(z.string()),
  blockedFunctionPatterns: z.array(z.string()),
  auditAllQueries: z.boolean(),
  auditDataChanges: z.boolean(),
  retentionDays: z.number().positive()
});

export const AuditLogEntrySchema = z.object({
  id: z.string(),
  timestamp: z.date(),
  userId: z.string().optional(),
  sessionId: z.string(),
  query: z.string(),
  queryHash: z.string(),
  databaseType: z.string(),
  connectionInfo: z.object({
    server: z.string(),
    database: z.string()
  }),
  securityAnalysis: z.object({
    riskLevel: z.nativeEnum(RiskLevel),
    issues: z.array(z.any()),
    warnings: z.array(z.string()),
    recommendations: z.array(z.string()),
    allowedToExecute: z.boolean(),
    requiresReview: z.boolean(),
    estimatedImpact: z.object({
      affectedTables: z.array(z.string()),
      estimatedRows: z.number(),
      isDataModification: z.boolean(),
      isSchemaChange: z.boolean()
    })
  }),
  executionResult: z.object({
    success: z.boolean(),
    error: z.string().optional(),
    rowsAffected: z.number().optional(),
    executionTime: z.number()
  }).optional(),
  reviewStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  reviewedBy: z.string().optional(),
  reviewedAt: z.date().optional(),
  reviewNotes: z.string().optional()
});