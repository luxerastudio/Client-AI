import { config } from '../../config';

export interface Version {
  id: string;
  entityType: string;
  entityId: string;
  version: number;
  data: any;
  metadata: Record<string, any>;
  createdAt: Date;
  createdBy?: string;
  tags?: string[];
  parentVersionId?: string;
  isLatest: boolean;
}

export interface VersionDiff {
  added: any[];
  removed: any[];
  modified: Array<{ path: string; oldValue: any; newValue: any }>;
  summary: string;
}

export interface VersionOptions {
  autoIncrement?: boolean;
  maxVersions?: number;
  compressionEnabled?: boolean;
  tags?: string[];
  metadata?: Record<string, any>;
}

export class VersionManager {
  private versions: Map<string, Version[]> = new Map(); // entityType:entityId -> versions
  private config: any;
  private compressionEnabled: boolean;

  constructor(versioningConfig?: any) {
    this.config = versioningConfig || config.versioning;
    this.compressionEnabled = this.config.compressionEnabled;
  }

  async initialize(): Promise<void> {
    console.log('Initializing Version Manager...');
    
    // Set up cleanup interval
    if (this.config.enabled) {
      setInterval(() => {
        this.cleanupOldVersions();
      }, 24 * 60 * 60 * 1000); // Daily cleanup
    }

    console.log('Version Manager initialized');
  }

  async createVersion(
    entityType: string,
    entityId: string,
    data: any,
    options: VersionOptions = {}
  ): Promise<Version> {
    if (!this.config.enabled) {
      throw new Error('Versioning is disabled');
    }

    const key = this.getVersionKey(entityType, entityId);
    const existingVersions = this.versions.get(key) || [];

    // Determine version number
    let versionNumber = 1;
    if (options.autoIncrement !== false && existingVersions.length > 0) {
      const latestVersion = existingVersions[existingVersions.length - 1];
      versionNumber = latestVersion.version + 1;
    }

    // Prepare version data
    const versionData = this.compressionEnabled ? this.compressData(data) : data;

    const version: Version = {
      id: this.generateVersionId(),
      entityType,
      entityId,
      version: versionNumber,
      data: versionData,
      metadata: options.metadata || {},
      createdAt: new Date(),
      createdBy: options.metadata?.createdBy,
      tags: options.tags || [],
      parentVersionId: existingVersions.length > 0 ? existingVersions[existingVersions.length - 1].id : undefined,
      isLatest: true
    };

    // Update previous versions to not be latest
    existingVersions.forEach(v => {
      v.isLatest = false;
    });

    // Add new version
    existingVersions.push(version);
    this.versions.set(key, existingVersions);

    // Enforce max versions limit
    if (this.config.maxVersions && existingVersions.length > this.config.maxVersions) {
      const toRemove = existingVersions.splice(0, existingVersions.length - this.config.maxVersions);
      console.log(`Removed ${toRemove.length} old versions for ${entityType}:${entityId}`);
    }

    console.log(`Created version ${versionNumber} for ${entityType}:${entityId}`);
    return version;
  }

  async getVersion(entityType: string, entityId: string, versionNumber?: number): Promise<Version | null> {
    const key = this.getVersionKey(entityType, entityId);
    const versions = this.versions.get(key);

    if (!versions || versions.length === 0) {
      return null;
    }

    if (versionNumber) {
      const version = versions.find(v => v.version === versionNumber);
      return version || null;
    }

    // Return latest version
    const latest = versions.find(v => v.isLatest);
    return latest || versions[versions.length - 1];
  }

  async getVersions(entityType: string, entityId: string): Promise<Version[]> {
    const key = this.getVersionKey(entityType, entityId);
    const versions = this.versions.get(key) || [];
    
    // Return sorted by version number (ascending)
    return [...versions].sort((a, b) => a.version - b.version);
  }

  async getLatestVersion(entityType: string, entityId: string): Promise<Version | null> {
    return this.getVersion(entityType, entityId);
  }

  async deleteVersion(entityType: string, entityId: string, versionNumber: number): Promise<boolean> {
    const key = this.getVersionKey(entityType, entityId);
    const versions = this.versions.get(key);

    if (!versions) {
      return false;
    }

    const versionIndex = versions.findIndex(v => v.version === versionNumber);
    if (versionIndex === -1) {
      return false;
    }

    const deletedVersion = versions[versionIndex];
    versions.splice(versionIndex, 1);

    // If we deleted the latest version, mark the previous one as latest
    if (deletedVersion.isLatest && versions.length > 0) {
      versions[versions.length - 1].isLatest = true;
    }

    if (versions.length === 0) {
      this.versions.delete(key);
    }

    console.log(`Deleted version ${versionNumber} for ${entityType}:${entityId}`);
    return true;
  }

  async compareVersions(
    entityType: string,
    entityId: string,
    fromVersion: number,
    toVersion: number
  ): Promise<VersionDiff> {
    const fromVer = await this.getVersion(entityType, entityId, fromVersion);
    const toVer = await this.getVersion(entityType, entityId, toVersion);

    if (!fromVer || !toVer) {
      throw new Error('One or both versions not found');
    }

    const fromData = this.compressionEnabled ? this.decompressData(fromVer.data) : fromVer.data;
    const toData = this.compressionEnabled ? this.decompressData(toVer.data) : toVer.data;

    return this.calculateDiff(fromData, toData);
  }

  async restoreVersion(
    entityType: string,
    entityId: string,
    versionNumber: number
  ): Promise<any> {
    const version = await this.getVersion(entityType, entityId, versionNumber);
    
    if (!version) {
      throw new Error(`Version ${versionNumber} not found for ${entityType}:${entityId}`);
    }

    const data = this.compressionEnabled ? this.decompressData(version.data) : version.data;
    
    console.log(`Restored version ${versionNumber} for ${entityType}:${entityId}`);
    return data;
  }

  async tagVersion(
    entityType: string,
    entityId: string,
    versionNumber: number,
    tags: string[]
  ): Promise<boolean> {
    const version = await this.getVersion(entityType, entityId, versionNumber);
    
    if (!version) {
      return false;
    }

    version.tags = Array.from(new Set([...(version.tags || []), ...tags]));
    
    console.log(`Tagged version ${versionNumber} for ${entityType}:${entityId} with tags: ${tags.join(', ')}`);
    return true;
  }

  async getVersionsByTag(entityType: string, entityId: string, tag: string): Promise<Version[]> {
    const versions = await this.getVersions(entityType, entityId);
    
    return versions.filter(version => 
      version.tags && version.tags.includes(tag)
    );
  }

  async getVersionHistory(entityType: string, entityId: string): Promise<{
    versions: Version[];
    summary: {
      totalVersions: number;
      oldestVersion: number;
      newestVersion: number;
      tags: string[];
      contributors: string[];
    };
  }> {
    const versions = await this.getVersions(entityType, entityId);
    
    const tags = new Set<string>();
    const contributors = new Set<string>();
    
    versions.forEach(version => {
      if (version.tags) {
        version.tags.forEach(tag => tags.add(tag));
      }
      if (version.createdBy) {
        contributors.add(version.createdBy);
      }
    });

    return {
      versions,
      summary: {
        totalVersions: versions.length,
        oldestVersion: versions.length > 0 ? versions[0].version : 0,
        newestVersion: versions.length > 0 ? versions[versions.length - 1].version : 0,
        tags: Array.from(tags),
        contributors: Array.from(contributors)
      }
    };
  }

  async rollbackToVersion(
    entityType: string,
    entityId: string,
    versionNumber: number,
    options: { createBackup?: boolean; metadata?: Record<string, any> } = {}
  ): Promise<Version> {
    const targetVersion = await this.getVersion(entityType, entityId, versionNumber);
    
    if (!targetVersion) {
      throw new Error(`Version ${versionNumber} not found`);
    }

    const data = this.compressionEnabled ? this.decompressData(targetVersion.data) : targetVersion.data;

    // Create backup of current state if requested
    if (options.createBackup) {
      const currentVersion = await this.getLatestVersion(entityType, entityId);
      if (currentVersion) {
        const currentData = this.compressionEnabled ? 
          this.decompressData(currentVersion.data) : currentVersion.data;
        
        await this.createVersion(entityType, entityId, currentData, {
          tags: ['rollback-backup'],
          metadata: {
            ...options.metadata,
            rollbackFrom: currentVersion.version,
            rollbackTo: versionNumber
          }
        });
      }
    }

    // Create new version with restored data
    const newVersion = await this.createVersion(entityType, entityId, data, {
      tags: ['rollback'],
      metadata: {
        ...options.metadata,
        rollbackFrom: targetVersion.version,
        originalCreatedAt: targetVersion.createdAt
      }
    });

    console.log(`Rolled back ${entityType}:${entityId} to version ${versionNumber}`);
    return newVersion;
  }

  private calculateDiff(fromData: any, toData: any): VersionDiff {
    const added: any[] = [];
    const removed: any[] = [];
    const modified: Array<{ path: string; oldValue: any; newValue: any }> = [];

    // Simple diff implementation - in production, use a more sophisticated diff library
    const fromKeys = new Set(Object.keys(fromData));
    const toKeys = new Set(Object.keys(toData));

    // Find added keys
    toKeys.forEach(key => {
      if (!fromKeys.has(key)) {
        added.push({ [key]: toData[key] });
      }
    });

    // Find removed keys
    fromKeys.forEach(key => {
      if (!toKeys.has(key)) {
        removed.push({ [key]: fromData[key] });
      }
    });

    // Find modified keys
    fromKeys.forEach(key => {
      if (toKeys.has(key) && JSON.stringify(fromData[key]) !== JSON.stringify(toData[key])) {
        modified.push({
          path: key,
          oldValue: fromData[key],
          newValue: toData[key]
        });
      }
    });

    const summary = this.generateDiffSummary(added, removed, modified);

    return { added, removed, modified, summary };
  }

  private generateDiffSummary(added: any[], removed: any[], modified: any[]): string {
    const parts: string[] = [];
    
    if (added.length > 0) {
      parts.push(`${added.length} added`);
    }
    
    if (removed.length > 0) {
      parts.push(`${removed.length} removed`);
    }
    
    if (modified.length > 0) {
      parts.push(`${modified.length} modified`);
    }
    
    return parts.length > 0 ? parts.join(', ') : 'No changes';
  }

  private compressData(data: any): any {
    // Simple compression simulation - in production, use actual compression
    return JSON.stringify(data);
  }

  private decompressData(compressedData: any): any {
    // Simple decompression simulation - in production, use actual decompression
    if (typeof compressedData === 'string') {
      return JSON.parse(compressedData);
    }
    return compressedData;
  }

  private getVersionKey(entityType: string, entityId: string): string {
    return `${entityType}:${entityId}`;
  }

  private generateVersionId(): string {
    return `ver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private cleanupOldVersions(): void {
    const maxAge = 90 * 24 * 60 * 60 * 1000; // 90 days
    const cutoff = new Date(Date.now() - maxAge);

    for (const [key, versions] of Array.from(this.versions.entries())) {
      const initialLength = versions.length;
      
      // Remove old versions, but always keep the latest version
      const filtered = versions.filter((version, index) => 
        version.isLatest || version.createdAt > cutoff
      );
      
      if (filtered.length !== versions.length) {
        this.versions.set(key, filtered);
        console.log(`Cleaned up ${initialLength - filtered.length} old versions for ${key}`);
      }
    }
  }

  // Health check
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      const totalEntities = this.versions.size;
      const totalVersions = Array.from(this.versions.values())
        .reduce((sum, versions) => sum + versions.length, 0);

      return {
        healthy: true,
        details: {
          enabled: this.config.enabled,
          totalEntities,
          totalVersions,
          compressionEnabled: this.compressionEnabled,
          maxVersions: this.config.maxVersions
        }
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  getStats(): any {
    const totalEntities = this.versions.size;
    const totalVersions = Array.from(this.versions.values())
      .reduce((sum, versions) => sum + versions.length, 0);

    const tagCounts = new Map<string, number>();
    const entityTypes = new Map<string, number>();

    for (const versions of Array.from(this.versions.values())) {
      versions.forEach(version => {
        if (version.tags) {
          version.tags.forEach(tag => {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
          });
        }
        
        entityTypes.set(version.entityType, (entityTypes.get(version.entityType) || 0) + 1);
      });
    }

    return {
      enabled: this.config.enabled,
      totalEntities,
      totalVersions,
      compressionEnabled: this.compressionEnabled,
      maxVersions: this.config.maxVersions,
      tagCounts: Object.fromEntries(tagCounts),
      entityTypes: Object.fromEntries(entityTypes)
    };
  }

  async cleanup(): Promise<void> {
    console.log('Cleaning up Version Manager...');
    this.versions.clear();
    console.log('Version Manager cleaned up');
  }
}
