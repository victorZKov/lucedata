// Main exports
export { SecurityGuardRails } from './manager.js';
export { SQLSecurityAnalyzer } from './analyzer.js';
export { 
  MemoryAuditLogger, 
  QueryReviewManager, 
  SecurityMetrics,
  type IAuditLogger,
  type AuditLogFilters 
} from './audit.js';

// Type exports
export {
  RiskLevel,
  type SecurityPolicy,
  type SecurityAnalysis,
  type SecurityIssue,
  type AuditLogEntry,
  type QueryReview,
  DEFAULT_SECURITY_POLICY,
  SecurityPolicySchema,
  AuditLogEntrySchema
} from './types.js';

// Re-export database types for convenience
export type { DatabaseType } from '@sqlhelper/database-core';