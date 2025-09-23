import { randomUUID } from 'crypto';
import { 
  AuditLogEntry, 
  QueryReview, 
  SecurityAnalysis, 
  AuditLogEntrySchema 
} from './types.js';
import type { DatabaseType } from '@sqlhelper/database-core';

export interface IAuditLogger {
  logQuery(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void>;
  getAuditLogs(filters?: AuditLogFilters): Promise<AuditLogEntry[]>;
  getAuditLog(id: string): Promise<AuditLogEntry | null>;
  updateExecutionResult(id: string, result: AuditLogEntry['executionResult']): Promise<void>;
  updateReviewStatus(id: string, status: AuditLogEntry['reviewStatus'], reviewedBy?: string, notes?: string): Promise<void>;
  cleanupOldLogs(retentionDays: number): Promise<number>;
}

export interface AuditLogFilters {
  userId?: string;
  sessionId?: string;
  queryHash?: string;
  databaseType?: DatabaseType;
  server?: string;
  database?: string;
  riskLevel?: string;
  dateFrom?: Date;
  dateTo?: Date;
  hasExecutionResult?: boolean;
  reviewStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  limit?: number;
  offset?: number;
}

// In-memory implementation for development/testing
export class MemoryAuditLogger implements IAuditLogger {
  private logs = new Map<string, AuditLogEntry>();

  async logQuery(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const auditEntry: AuditLogEntry = {
      ...entry,
      id: randomUUID(),
      timestamp: new Date()
    };

    // Validate entry
    AuditLogEntrySchema.parse(auditEntry);
    
    this.logs.set(auditEntry.id, auditEntry);
  }

  async getAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogEntry[]> {
    let logs = Array.from(this.logs.values());

    // Apply filters
    if (filters.userId) {
      logs = logs.filter(log => log.userId === filters.userId);
    }
    if (filters.sessionId) {
      logs = logs.filter(log => log.sessionId === filters.sessionId);
    }
    if (filters.queryHash) {
      logs = logs.filter(log => log.queryHash === filters.queryHash);
    }
    if (filters.databaseType) {
      logs = logs.filter(log => log.databaseType === filters.databaseType);
    }
    if (filters.server) {
      logs = logs.filter(log => log.connectionInfo.server === filters.server);
    }
    if (filters.database) {
      logs = logs.filter(log => log.connectionInfo.database === filters.database);
    }
    if (filters.riskLevel) {
      logs = logs.filter(log => log.securityAnalysis.riskLevel === filters.riskLevel);
    }
    if (filters.dateFrom) {
      logs = logs.filter(log => log.timestamp >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      logs = logs.filter(log => log.timestamp <= filters.dateTo!);
    }
    if (filters.hasExecutionResult !== undefined) {
      logs = logs.filter(log => !!log.executionResult === filters.hasExecutionResult);
    }
    if (filters.reviewStatus) {
      logs = logs.filter(log => log.reviewStatus === filters.reviewStatus);
    }

    // Sort by timestamp (newest first)
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    if (filters.offset) {
      logs = logs.slice(filters.offset);
    }
    if (filters.limit) {
      logs = logs.slice(0, filters.limit);
    }

    return logs;
  }

  async getAuditLog(id: string): Promise<AuditLogEntry | null> {
    return this.logs.get(id) || null;
  }

  async updateExecutionResult(id: string, result: AuditLogEntry['executionResult']): Promise<void> {
    const log = this.logs.get(id);
    if (log) {
      log.executionResult = result;
      this.logs.set(id, log);
    }
  }

  async updateReviewStatus(
    id: string, 
    status: AuditLogEntry['reviewStatus'], 
    reviewedBy?: string, 
    notes?: string
  ): Promise<void> {
    const log = this.logs.get(id);
    if (log) {
      log.reviewStatus = status;
      log.reviewedBy = reviewedBy;
      log.reviewedAt = new Date();
      log.reviewNotes = notes;
      this.logs.set(id, log);
    }
  }

  async cleanupOldLogs(retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    let cleanedCount = 0;
    for (const [id, log] of this.logs.entries()) {
      if (log.timestamp < cutoffDate) {
        this.logs.delete(id);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }
}

// Review workflow manager
export class QueryReviewManager {
  private reviews = new Map<string, QueryReview>();

  async submitForReview(
    query: string, 
    analysis: SecurityAnalysis, 
    submittedBy: string
  ): Promise<QueryReview> {
    const review: QueryReview = {
      id: randomUUID(),
      query,
      securityAnalysis: analysis,
      submittedBy,
      submittedAt: new Date(),
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };

    this.reviews.set(review.id, review);
    return review;
  }

  async getReview(id: string): Promise<QueryReview | null> {
    return this.reviews.get(id) || null;
  }

  async getPendingReviews(): Promise<QueryReview[]> {
    return Array.from(this.reviews.values())
      .filter(review => review.status === 'PENDING' && review.expiresAt > new Date())
      .sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime());
  }

  async getReviewsForUser(userId: string): Promise<QueryReview[]> {
    return Array.from(this.reviews.values())
      .filter(review => review.submittedBy === userId)
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  }

  async approveReview(id: string, reviewedBy: string, notes?: string): Promise<boolean> {
    const review = this.reviews.get(id);
    if (!review || review.status !== 'PENDING') {
      return false;
    }

    review.status = 'APPROVED';
    review.reviewedBy = reviewedBy;
    review.reviewedAt = new Date();
    review.notes = notes;

    this.reviews.set(id, review);
    return true;
  }

  async rejectReview(id: string, reviewedBy: string, notes?: string): Promise<boolean> {
    const review = this.reviews.get(id);
    if (!review || review.status !== 'PENDING') {
      return false;
    }

    review.status = 'REJECTED';
    review.reviewedBy = reviewedBy;
    review.reviewedAt = new Date();
    review.notes = notes;

    this.reviews.set(id, review);
    return true;
  }

  async cleanupExpiredReviews(): Promise<number> {
    const now = new Date();
    let cleanedCount = 0;

    for (const [id, review] of this.reviews.entries()) {
      if (review.expiresAt <= now && review.status === 'PENDING') {
        this.reviews.delete(id);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }
}

// Security metrics and reporting
export class SecurityMetrics {
  constructor(private auditLogger: IAuditLogger) {}

  async getRiskDistribution(timeRange: { from: Date; to: Date }): Promise<Record<string, number>> {
    const logs = await this.auditLogger.getAuditLogs({
      dateFrom: timeRange.from,
      dateTo: timeRange.to
    });

    const distribution: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    logs.forEach(log => {
      distribution[log.securityAnalysis.riskLevel]++;
    });

    return distribution;
  }

  async getTopBlockedKeywords(timeRange: { from: Date; to: Date }): Promise<Array<{ keyword: string; count: number }>> {
    const logs = await this.auditLogger.getAuditLogs({
      dateFrom: timeRange.from,
      dateTo: timeRange.to
    });

    const keywordCounts = new Map<string, number>();

    logs.forEach(log => {
      log.securityAnalysis.issues
        .filter(issue => issue.type === 'BLOCKED_KEYWORD')
        .forEach(issue => {
          const match = issue.message.match(/keyword detected: (\w+)/i);
          if (match) {
            const keyword = match[1].toLowerCase();
            keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1);
          }
        });
    });

    return Array.from(keywordCounts.entries())
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  async getUserActivity(timeRange: { from: Date; to: Date }): Promise<Array<{ userId: string; queryCount: number; riskScore: number }>> {
    const logs = await this.auditLogger.getAuditLogs({
      dateFrom: timeRange.from,
      dateTo: timeRange.to
    });

    const userActivity = new Map<string, { queryCount: number; totalRisk: number }>();

    logs.forEach(log => {
      if (log.userId) {
        const activity = userActivity.get(log.userId) || { queryCount: 0, totalRisk: 0 };
        activity.queryCount++;
        
        // Simple risk scoring: critical=4, high=3, medium=2, low=1
        const riskScore = {
          critical: 4,
          high: 3,
          medium: 2,
          low: 1
        }[log.securityAnalysis.riskLevel] || 0;
        
        activity.totalRisk += riskScore;
        userActivity.set(log.userId, activity);
      }
    });

    return Array.from(userActivity.entries())
      .map(([userId, activity]) => ({
        userId,
        queryCount: activity.queryCount,
        riskScore: activity.totalRisk / activity.queryCount
      }))
      .sort((a, b) => b.riskScore - a.riskScore);
  }

  async getDatabaseActivity(timeRange: { from: Date; to: Date }): Promise<Array<{ database: string; queryCount: number; avgRisk: string }>> {
    const logs = await this.auditLogger.getAuditLogs({
      dateFrom: timeRange.from,
      dateTo: timeRange.to
    });

    const dbActivity = new Map<string, { queryCount: number; riskLevels: string[] }>();

    logs.forEach(log => {
      const dbKey = `${log.connectionInfo.server}/${log.connectionInfo.database}`;
      const activity = dbActivity.get(dbKey) || { queryCount: 0, riskLevels: [] };
      activity.queryCount++;
      activity.riskLevels.push(log.securityAnalysis.riskLevel);
      dbActivity.set(dbKey, activity);
    });

    return Array.from(dbActivity.entries())
      .map(([database, activity]) => {
        const riskCounts = {
          critical: activity.riskLevels.filter(r => r === 'critical').length,
          high: activity.riskLevels.filter(r => r === 'high').length,
          medium: activity.riskLevels.filter(r => r === 'medium').length,
          low: activity.riskLevels.filter(r => r === 'low').length
        };

        const totalRisk = riskCounts.critical * 4 + riskCounts.high * 3 + riskCounts.medium * 2 + riskCounts.low * 1;
        const avgRiskScore = totalRisk / activity.queryCount;

        let avgRisk = 'low';
        if (avgRiskScore >= 3.5) avgRisk = 'critical';
        else if (avgRiskScore >= 2.5) avgRisk = 'high';
        else if (avgRiskScore >= 1.5) avgRisk = 'medium';

        return {
          database,
          queryCount: activity.queryCount,
          avgRisk
        };
      })
      .sort((a, b) => b.queryCount - a.queryCount);
  }
}