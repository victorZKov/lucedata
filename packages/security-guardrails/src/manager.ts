import { SQLSecurityAnalyzer } from './analyzer.js';
import { MemoryAuditLogger, QueryReviewManager, SecurityMetrics } from './audit.js';
import { 
  SecurityPolicy, 
  SecurityAnalysis, 
  AuditLogEntry,
  QueryReview,
  DEFAULT_SECURITY_POLICY,
  RiskLevel 
} from './types.js';
import type { DatabaseType } from '@sqlhelper/database-core';

export interface SecurityGuardRailsConfig {
  policy?: Partial<SecurityPolicy>;
  auditLogger?: any; // Allow custom audit logger implementation
  enableReviewWorkflow?: boolean;
  enableMetrics?: boolean;
}

export class SecurityGuardRails {
  private analyzer: SQLSecurityAnalyzer;
  private auditLogger: MemoryAuditLogger;
  private reviewManager?: QueryReviewManager;
  private metrics?: SecurityMetrics;
  private sessionId: string;

  constructor(config: SecurityGuardRailsConfig = {}) {
    this.analyzer = new SQLSecurityAnalyzer(config.policy);
    this.auditLogger = config.auditLogger || new MemoryAuditLogger();
    this.sessionId = this.generateSessionId();

    if (config.enableReviewWorkflow !== false) {
      this.reviewManager = new QueryReviewManager();
    }

    if (config.enableMetrics !== false) {
      this.metrics = new SecurityMetrics(this.auditLogger);
    }
  }

  // Main security check method
  async checkQuery(
    query: string,
    databaseType: DatabaseType,
    connectionInfo: { server: string; database: string },
    userId?: string
  ): Promise<{
    analysis: SecurityAnalysis;
    auditId: string;
    requiresReview: boolean;
    reviewId?: string;
  }> {
    // Analyze the query
    const analysis = await this.analyzer.analyzeQuery(query, databaseType);
    
    // Generate query hash for deduplication
    const queryHash = this.analyzer.generateQueryHash(query);

    // Log to audit trail
    const auditEntry: Omit<AuditLogEntry, 'id' | 'timestamp'> = {
      userId,
      sessionId: this.sessionId,
      query,
      queryHash,
      databaseType,
      connectionInfo,
      securityAnalysis: analysis
    };

    await this.auditLogger.logQuery(auditEntry);
    
    // Get the audit ID (this is a bit hacky for the memory implementation)
    const recentLogs = await this.auditLogger.getAuditLogs({ 
      queryHash, 
      sessionId: this.sessionId, 
      limit: 1 
    });
    const auditId = recentLogs[0]?.id || 'unknown';

    let reviewId: string | undefined;

    // Submit for review if required
    if (analysis.requiresReview && this.reviewManager && userId) {
      const review = await this.reviewManager.submitForReview(query, analysis, userId);
      reviewId = review.id;
    }

    return {
      analysis,
      auditId,
      requiresReview: analysis.requiresReview,
      reviewId
    };
  }

  // Log execution results
  async logExecutionResult(
    auditId: string,
    result: {
      success: boolean;
      error?: string;
      rowsAffected?: number;
      executionTime: number;
    }
  ): Promise<void> {
    await this.auditLogger.updateExecutionResult(auditId, result);
  }

  // Update security policy
  updatePolicy(updates: Partial<SecurityPolicy>): void {
    this.analyzer.updatePolicy(updates);
  }

  // Get current policy
  getPolicy(): SecurityPolicy {
    return this.analyzer.getPolicy();
  }

  // Review workflow methods
  async submitForReview(
    query: string,
    analysis: SecurityAnalysis,
    submittedBy: string
  ): Promise<QueryReview | null> {
    if (!this.reviewManager) {
      return null;
    }
    return this.reviewManager.submitForReview(query, analysis, submittedBy);
  }

  async getReview(reviewId: string): Promise<QueryReview | null> {
    if (!this.reviewManager) {
      return null;
    }
    return this.reviewManager.getReview(reviewId);
  }

  async getPendingReviews(): Promise<QueryReview[]> {
    if (!this.reviewManager) {
      return [];
    }
    return this.reviewManager.getPendingReviews();
  }

  async getReviewsForUser(userId: string): Promise<QueryReview[]> {
    if (!this.reviewManager) {
      return [];
    }
    return this.reviewManager.getReviewsForUser(userId);
  }

  async approveReview(reviewId: string, reviewedBy: string, notes?: string): Promise<boolean> {
    if (!this.reviewManager) {
      return false;
    }
    const success = await this.reviewManager.approveReview(reviewId, reviewedBy, notes);
    
    if (success) {
      // Update audit log if we can find the corresponding entry
      const review = await this.reviewManager.getReview(reviewId);
      if (review) {
        const logs = await this.auditLogger.getAuditLogs({
          queryHash: this.analyzer.generateQueryHash(review.query),
          limit: 1
        });
        if (logs.length > 0) {
          await this.auditLogger.updateReviewStatus(logs[0].id, 'APPROVED', reviewedBy, notes);
        }
      }
    }
    
    return success;
  }

  async rejectReview(reviewId: string, reviewedBy: string, notes?: string): Promise<boolean> {
    if (!this.reviewManager) {
      return false;
    }
    const success = await this.reviewManager.rejectReview(reviewId, reviewedBy, notes);
    
    if (success) {
      // Update audit log if we can find the corresponding entry
      const review = await this.reviewManager.getReview(reviewId);
      if (review) {
        const logs = await this.auditLogger.getAuditLogs({
          queryHash: this.analyzer.generateQueryHash(review.query),
          limit: 1
        });
        if (logs.length > 0) {
          await this.auditLogger.updateReviewStatus(logs[0].id, 'REJECTED', reviewedBy, notes);
        }
      }
    }
    
    return success;
  }

  // Audit and metrics methods
  async getAuditLogs(filters: any = {}): Promise<AuditLogEntry[]> {
    return this.auditLogger.getAuditLogs(filters);
  }

  async getAuditLog(id: string): Promise<AuditLogEntry | null> {
    return this.auditLogger.getAuditLog(id);
  }

  async getRiskDistribution(timeRange: { from: Date; to: Date }): Promise<Record<string, number> | null> {
    if (!this.metrics) {
      return null;
    }
    return this.metrics.getRiskDistribution(timeRange);
  }

  async getTopBlockedKeywords(timeRange: { from: Date; to: Date }): Promise<Array<{ keyword: string; count: number }> | null> {
    if (!this.metrics) {
      return null;
    }
    return this.metrics.getTopBlockedKeywords(timeRange);
  }

  async getUserActivity(timeRange: { from: Date; to: Date }): Promise<Array<{ userId: string; queryCount: number; riskScore: number }> | null> {
    if (!this.metrics) {
      return null;
    }
    return this.metrics.getUserActivity(timeRange);
  }

  async getDatabaseActivity(timeRange: { from: Date; to: Date }): Promise<Array<{ database: string; queryCount: number; avgRisk: string }> | null> {
    if (!this.metrics) {
      return null;
    }
    return this.metrics.getDatabaseActivity(timeRange);
  }

  // Utility methods
  async cleanupExpiredReviews(): Promise<number> {
    if (!this.reviewManager) {
      return 0;
    }
    return this.reviewManager.cleanupExpiredReviews();
  }

  async cleanupOldAuditLogs(retentionDays?: number): Promise<number> {
    const policy = this.analyzer.getPolicy();
    const days = retentionDays || policy.retentionDays;
    return this.auditLogger.cleanupOldLogs(days);
  }

  // Static methods for creating pre-configured instances
  static createRestrictive(): SecurityGuardRails {
    return new SecurityGuardRails({
      policy: {
        allowDataModification: false,
        allowSchemaChanges: false,
        allowSystemQueries: false,
        requireReviewForRisk: RiskLevel.MEDIUM,
        maxRowsReturned: 1000,
        maxTablesJoined: 3
      }
    });
  }

  static createPermissive(): SecurityGuardRails {
    return new SecurityGuardRails({
      policy: {
        allowDataModification: true,
        allowSchemaChanges: false,
        allowSystemQueries: false,
        requireReviewForRisk: RiskLevel.CRITICAL,
        maxRowsReturned: 50000,
        maxTablesJoined: 10,
        blockedKeywords: ['SHUTDOWN', 'KILL', 'xp_cmdshell']
      }
    });
  }

  static createDevelopment(): SecurityGuardRails {
    return new SecurityGuardRails({
      policy: {
        allowDataModification: true,
        allowSchemaChanges: true,
        allowSystemQueries: false,
        requireReviewForRisk: RiskLevel.CRITICAL,
        maxRowsReturned: 10000,
        maxTablesJoined: 8,
        auditAllQueries: false
      }
    });
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export everything
export * from './types.js';
export * from './analyzer.js';
export * from './audit.js';