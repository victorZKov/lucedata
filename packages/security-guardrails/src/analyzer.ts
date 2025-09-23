import { createHash } from 'crypto';
import { 
  SecurityPolicy, 
  SecurityAnalysis, 
  SecurityIssue, 
  RiskLevel,
  DEFAULT_SECURITY_POLICY 
} from './types.js';
import type { DatabaseType } from '@sqlhelper/database-core';

export class SQLSecurityAnalyzer {
  private policy: SecurityPolicy;

  constructor(policy?: Partial<SecurityPolicy>) {
    this.policy = { ...DEFAULT_SECURITY_POLICY, ...policy };
  }

  updatePolicy(updates: Partial<SecurityPolicy>): void {
    this.policy = { ...this.policy, ...updates };
  }

  getPolicy(): SecurityPolicy {
    return { ...this.policy };
  }

  async analyzeQuery(query: string, databaseType: DatabaseType): Promise<SecurityAnalysis> {
    const normalizedQuery = this.normalizeQuery(query);
    const issues: SecurityIssue[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check for blocked keywords
    const keywordIssues = this.checkBlockedKeywords(normalizedQuery);
    issues.push(...keywordIssues);

    // Check for schema changes
    const schemaIssues = this.checkSchemaChanges(normalizedQuery);
    issues.push(...schemaIssues);

    // Check for data modifications
    const modificationIssues = this.checkDataModifications(normalizedQuery);
    issues.push(...modificationIssues);

    // Check for system access
    const systemIssues = this.checkSystemAccess(normalizedQuery, databaseType);
    issues.push(...systemIssues);

    // Check for performance risks
    const performanceIssues = this.checkPerformanceRisks(normalizedQuery);
    issues.push(...performanceIssues);

    // Check for suspicious patterns
    const suspiciousIssues = this.checkSuspiciousPatterns(normalizedQuery);
    issues.push(...suspiciousIssues);

    // Determine risk level
    const riskLevel = this.calculateRiskLevel(issues);

    // Generate warnings and recommendations
    this.generateWarnings(normalizedQuery, warnings);
    this.generateRecommendations(normalizedQuery, recommendations);

    // Estimate impact
    const estimatedImpact = this.estimateImpact(normalizedQuery);

    // Determine if execution is allowed
    const allowedToExecute = this.isExecutionAllowed(issues, riskLevel);
    const requiresReview = this.requiresReview(riskLevel, issues);

    return {
      riskLevel,
      issues,
      warnings,
      recommendations,
      allowedToExecute,
      requiresReview,
      estimatedImpact
    };
  }

  private normalizeQuery(query: string): string {
    return query
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/--.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
  }

  private checkBlockedKeywords(query: string): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    const upperQuery = query.toUpperCase();

    for (const keyword of this.policy.blockedKeywords) {
      const regex = new RegExp(`\\b${keyword.toUpperCase()}\\b`, 'gi');
      const matches = [...upperQuery.matchAll(regex)];
      
      for (const match of matches) {
        issues.push({
          type: 'BLOCKED_KEYWORD',
          severity: this.getKeywordSeverity(keyword),
          message: `Blocked keyword detected: ${keyword}`,
          suggestion: `Remove or replace the '${keyword}' keyword`,
          position: {
            start: match.index!,
            end: match.index! + keyword.length
          }
        });
      }
    }

    return issues;
  }

  private checkSchemaChanges(query: string): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    const schemaKeywords = ['CREATE', 'ALTER', 'DROP', 'RENAME'];
    const upperQuery = query.toUpperCase();

    for (const keyword of schemaKeywords) {
      if (upperQuery.includes(keyword)) {
        if (!this.policy.allowSchemaChanges) {
          issues.push({
            type: 'SCHEMA_CHANGE',
            severity: RiskLevel.CRITICAL,
            message: `Schema modification detected: ${keyword}`,
            suggestion: 'Schema changes are not allowed by current policy'
          });
        }
      }
    }

    return issues;
  }

  private checkDataModifications(query: string): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    const modificationKeywords = ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'];
    const upperQuery = query.toUpperCase();

    for (const keyword of modificationKeywords) {
      if (upperQuery.includes(keyword)) {
        if (!this.policy.allowDataModification) {
          issues.push({
            type: 'DATA_MODIFICATION',
            severity: RiskLevel.HIGH,
            message: `Data modification detected: ${keyword}`,
            suggestion: 'Data modifications are not allowed by current policy'
          });
        }
      }
    }

    return issues;
  }

  private checkSystemAccess(query: string, databaseType: DatabaseType): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    const upperQuery = query.toUpperCase();

    // Check blocked table patterns
    for (const pattern of this.policy.blockedTablePatterns) {
      const regex = new RegExp(pattern.replace('*', '\\w+'), 'i');
      if (regex.test(query)) {
        issues.push({
          type: 'SYSTEM_ACCESS',
          severity: RiskLevel.CRITICAL,
          message: `Access to system table/schema detected: ${pattern}`,
          suggestion: 'Avoid querying system tables and schemas'
        });
      }
    }

    // Check blocked function patterns
    for (const pattern of this.policy.blockedFunctionPatterns) {
      const regex = new RegExp(pattern.replace('*', '\\w+'), 'i');
      if (regex.test(query)) {
        issues.push({
          type: 'SYSTEM_ACCESS',
          severity: RiskLevel.HIGH,
          message: `System function detected: ${pattern}`,
          suggestion: 'Avoid using system functions'
        });
      }
    }

    // Database-specific system checks
    if (databaseType === 'sqlserver') {
      const systemPatterns = ['xp_cmdshell', 'sp_configure', 'OPENROWSET', 'OPENDATASOURCE'];
      for (const pattern of systemPatterns) {
        if (upperQuery.includes(pattern.toUpperCase())) {
          issues.push({
            type: 'SYSTEM_ACCESS',
            severity: RiskLevel.CRITICAL,
            message: `SQL Server system feature detected: ${pattern}`,
            suggestion: 'System features are not allowed'
          });
        }
      }
    }

    return issues;
  }

  private checkPerformanceRisks(query: string): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    const upperQuery = query.toUpperCase();

    // Check for missing WHERE clauses in UPDATE/DELETE
    if (upperQuery.includes('UPDATE') || upperQuery.includes('DELETE')) {
      if (!upperQuery.includes('WHERE')) {
        issues.push({
          type: 'PERFORMANCE_RISK',
          severity: RiskLevel.HIGH,
          message: 'UPDATE/DELETE without WHERE clause detected',
          suggestion: 'Add a WHERE clause to limit affected rows'
        });
      }
    }

    // Check for potential Cartesian products
    const joinCount = (upperQuery.match(/\bJOIN\b/g) || []).length;
    if (joinCount > this.policy.maxTablesJoined) {
      issues.push({
        type: 'PERFORMANCE_RISK',
        severity: RiskLevel.MEDIUM,
        message: `Too many joins detected: ${joinCount}`,
        suggestion: `Limit joins to ${this.policy.maxTablesJoined} or fewer`
      });
    }

    return issues;
  }

  private checkSuspiciousPatterns(query: string): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    const upperQuery = query.toUpperCase();

    // Check for SQL injection patterns
    const injectionPatterns = [
      /'.*OR.*'.*='.*'/,
      /'.*UNION.*SELECT/,
      /';.*--/,
      /\*.*\*/
    ];

    for (const pattern of injectionPatterns) {
      if (pattern.test(upperQuery)) {
        issues.push({
          type: 'SUSPICIOUS_PATTERN',
          severity: RiskLevel.CRITICAL,
          message: 'Potential SQL injection pattern detected',
          suggestion: 'Review query for malicious patterns'
        });
      }
    }

    return issues;
  }

  private calculateRiskLevel(issues: SecurityIssue[]): RiskLevel {
    if (issues.some(issue => issue.severity === RiskLevel.CRITICAL)) {
      return RiskLevel.CRITICAL;
    }
    if (issues.some(issue => issue.severity === RiskLevel.HIGH)) {
      return RiskLevel.HIGH;
    }
    if (issues.some(issue => issue.severity === RiskLevel.MEDIUM)) {
      return RiskLevel.MEDIUM;
    }
    return RiskLevel.LOW;
  }

  private getKeywordSeverity(keyword: string): RiskLevel {
    const critical = ['DROP', 'TRUNCATE', 'SHUTDOWN', 'KILL'];
    const high = ['DELETE', 'UPDATE', 'ALTER', 'EXEC', 'EXECUTE'];
    
    if (critical.includes(keyword.toUpperCase())) return RiskLevel.CRITICAL;
    if (high.includes(keyword.toUpperCase())) return RiskLevel.HIGH;
    return RiskLevel.MEDIUM;
  }

  private generateWarnings(query: string, warnings: string[]): void {
    const upperQuery = query.toUpperCase();

    if (upperQuery.includes('SELECT *')) {
      warnings.push('SELECT * may return unnecessary data and impact performance');
    }

    if (!upperQuery.includes('LIMIT') && !upperQuery.includes('TOP')) {
      warnings.push('Query may return large result set without LIMIT/TOP clause');
    }

    if (upperQuery.includes('ORDER BY') && !upperQuery.includes('LIMIT')) {
      warnings.push('ORDER BY without LIMIT may sort large result sets unnecessarily');
    }
  }

  private generateRecommendations(query: string, recommendations: string[]): void {
    const upperQuery = query.toUpperCase();

    if (upperQuery.includes('SELECT *')) {
      recommendations.push('Specify exact column names instead of using SELECT *');
    }

    if (!upperQuery.includes('WHERE') && upperQuery.includes('SELECT')) {
      recommendations.push('Consider adding WHERE clause to filter results');
    }

    recommendations.push('Test query with LIMIT clause first to verify results');
    recommendations.push('Review execution plan for performance optimization');
  }

  private estimateImpact(query: string) {
    const upperQuery = query.toUpperCase();
    const tableMatches = query.match(/FROM\s+(\w+)|JOIN\s+(\w+)|UPDATE\s+(\w+)|INSERT\s+INTO\s+(\w+)|DELETE\s+FROM\s+(\w+)/gi);
    const affectedTables = tableMatches ? 
      [...new Set(tableMatches.map(match => match.split(/\s+/).pop()!.toLowerCase()))] : [];

    return {
      affectedTables,
      estimatedRows: upperQuery.includes('WHERE') ? 100 : 10000,
      isDataModification: /INSERT|UPDATE|DELETE|TRUNCATE/.test(upperQuery),
      isSchemaChange: /CREATE|ALTER|DROP/.test(upperQuery)
    };
  }

  private isExecutionAllowed(issues: SecurityIssue[], riskLevel: RiskLevel): boolean {
    // Block critical and high risk by default
    if (riskLevel === RiskLevel.CRITICAL) return false;
    
    // Check for specific blocking issues
    const blockingIssues = issues.filter(issue => 
      issue.type === 'BLOCKED_KEYWORD' || 
      issue.type === 'SCHEMA_CHANGE' ||
      issue.type === 'SYSTEM_ACCESS'
    );

    return blockingIssues.length === 0;
  }

  private requiresReview(riskLevel: RiskLevel, issues: SecurityIssue[]): boolean {
    const riskLevels = [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL];
    const policyLevel = riskLevels.indexOf(this.policy.requireReviewForRisk);
    const queryLevel = riskLevels.indexOf(riskLevel);

    return queryLevel >= policyLevel;
  }

  generateQueryHash(query: string): string {
    return createHash('sha256').update(query.trim()).digest('hex');
  }
}