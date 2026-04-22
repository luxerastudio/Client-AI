import { FastifyInstance } from 'fastify';
import { DependencyContainer } from '../../infrastructure/di/DependencyContainer';
import { VersionManager } from '../../infrastructure/versioning/VersionManager';

export async function versionRoutes(fastify: FastifyInstance, container: DependencyContainer) {
  const versionManager = container.get('versionManager') as VersionManager;

  // Create new version
  fastify.post('/create', {
    schema: {
      body: {
        type: 'object',
        required: ['entityType', 'entityId', 'data'],
        properties: {
          entityType: { type: 'string' },
          entityId: { type: 'string' },
          data: { type: 'object' },
          autoIncrement: { type: 'boolean' },
          maxVersions: { type: 'number' },
          tags: { type: 'array', items: { type: 'string' } },
          metadata: { type: 'object' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const versionData = request.body as any;
      const version = await versionManager.createVersion(
        versionData.entityType,
        versionData.entityId,
        versionData.data,
        versionData
      );
      
      return reply.send({
        success: true,
        data: version
      });
    } catch (error) {
      console.error('Version creation failed:', (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Version creation failed',
          code: 'VERSION_CREATION_ERROR'
        }
      });
    }
  });

  // Get version
  fastify.get('/:entityType/:entityId', {
    schema: {
      params: {
        entityType: { type: 'string' },
        entityId: { type: 'string' }
      },
      querystring: {
        version: { type: 'number' }
      }
    }
  }, async (request, reply) => {
    try {
      const { entityType, entityId } = request.params as { entityType: string; entityId: string };
      const { version } = request.query as { version?: number };
      
      const versionData = await versionManager.getVersion(entityType, entityId, version);
      
      if (!versionData) {
        return reply.status(404).send({
          success: false,
          error: {
            message: 'Version not found',
            code: 'VERSION_NOT_FOUND'
          }
        });
      }
      
      return reply.send({
        success: true,
        data: versionData
      });
    } catch (error) {
      console.error('Failed to get version:', (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to get version',
          code: 'VERSION_GET_ERROR'
        }
      });
    }
  });

  // Get all versions for entity
  fastify.get('/:entityType/:entityId/all', {
    schema: {
      params: {
        entityType: { type: 'string' },
        entityId: { type: 'string' }
      }
    }
  }, async (request, reply) => {
    try {
      const { entityType, entityId } = request.params as { entityType: string; entityId: string };
      const versions = await versionManager.getVersions(entityType, entityId);
      
      return reply.send({
        success: true,
        data: versions
      });
    } catch (error) {
      console.error('Failed to get versions:', (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to get versions',
          code: 'VERSIONS_GET_ERROR'
        }
      });
    }
  });

  // Get latest version
  fastify.get('/:entityType/:entityId/latest', {
    schema: {
      params: {
        entityType: { type: 'string' },
        entityId: { type: 'string' }
      }
    }
  }, async (request, reply) => {
    try {
      const { entityType, entityId } = request.params as { entityType: string; entityId: string };
      const version = await versionManager.getLatestVersion(entityType, entityId);
      
      if (!version) {
        return reply.status(404).send({
          success: false,
          error: {
            message: 'No versions found',
            code: 'NO_VERSIONS_FOUND'
          }
        });
      }
      
      return reply.send({
        success: true,
        data: version
      });
    } catch (error) {
      console.error('Failed to get latest version:', (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to get latest version',
          code: 'LATEST_VERSION_GET_ERROR'
        }
      });
    }
  });

  // Delete version
  fastify.delete('/:entityType/:entityId/:versionNumber', {
    schema: {
      params: {
        entityType: { type: 'string' },
        entityId: { type: 'string' },
        versionNumber: { type: 'number' }
      }
    }
  }, async (request, reply) => {
    try {
      const { entityType, entityId, versionNumber } = request.params as { 
        entityType: string; 
        entityId: string; 
        versionNumber: number 
      };
      
      const deleted = await versionManager.deleteVersion(entityType, entityId, versionNumber);
      
      if (!deleted) {
        return reply.status(404).send({
          success: false,
          error: {
            message: 'Version not found',
            code: 'VERSION_NOT_FOUND'
          }
        });
      }
      
      return reply.send({
        success: true,
        message: 'Version deleted successfully'
      });
    } catch (error) {
      console.error('Version deletion failed:', (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Version deletion failed',
          code: 'VERSION_DELETION_ERROR'
        }
      });
    }
  });

  // Compare versions
  fastify.get('/:entityType/:entityId/compare', {
    schema: {
      params: {
        entityType: { type: 'string' },
        entityId: { type: 'string' }
      },
      querystring: {
        from: { type: 'number' },
        to: { type: 'number' }
      }
    }
  }, async (request, reply) => {
    try {
      const { entityType, entityId } = request.params as { entityType: string; entityId: string };
      const { from, to } = request.query as { from?: number; to?: number };
      
      if (from === undefined || to === undefined) {
        return reply.status(400).send({
          success: false,
          error: {
            message: 'Both from and to version numbers are required',
            code: 'MISSING_VERSION_PARAMS'
          }
        });
      }
      
      const diff = await versionManager.compareVersions(entityType, entityId, from, to);
      
      return reply.send({
        success: true,
        data: diff
      });
    } catch (error) {
      console.error('Version comparison failed:', (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Version comparison failed',
          code: 'VERSION_COMPARISON_ERROR'
        }
      });
    }
  });

  // Restore version
  fastify.post('/:entityType/:entityId/:versionNumber/restore', {
    schema: {
      params: {
        entityType: { type: 'string' },
        entityId: { type: 'string' },
        versionNumber: { type: 'number' }
      },
      body: {
        type: 'object',
        properties: {
          createBackup: { type: 'boolean' },
          metadata: { type: 'object' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { entityType, entityId, versionNumber } = request.params as { 
        entityType: string; 
        entityId: string; 
        versionNumber: number 
      };
      const options = request.body as any;
      
      const data = await versionManager.restoreVersion(entityType, entityId, versionNumber);
      
      return reply.send({
        success: true,
        data
      });
    } catch (error) {
      console.error('Version restoration failed:', (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Version restoration failed',
          code: 'VERSION_RESTORATION_ERROR'
        }
      });
    }
  });

  // Tag version
  fastify.post('/:entityType/:entityId/:versionNumber/tag', {
    schema: {
      params: {
        entityType: { type: 'string' },
        entityId: { type: 'string' },
        versionNumber: { type: 'number' }
      },
      body: {
        type: 'object',
        required: ['tags'],
        properties: {
          tags: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { entityType, entityId, versionNumber } = request.params as { 
        entityType: string; 
        entityId: string; 
        versionNumber: number 
      };
      const { tags } = request.body as { tags: string[] };
      
      const tagged = await versionManager.tagVersion(entityType, entityId, versionNumber, tags);
      
      if (!tagged) {
        return reply.status(404).send({
          success: false,
          error: {
            message: 'Version not found',
            code: 'VERSION_NOT_FOUND'
          }
        });
      }
      
      return reply.send({
        success: true,
        message: 'Version tagged successfully'
      });
    } catch (error) {
      console.error('Version tagging failed:', (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Version tagging failed',
          code: 'VERSION_TAGGING_ERROR'
        }
      });
    }
  });

  // Get versions by tag
  fastify.get('/:entityType/:entityId/tag/:tag', {
    schema: {
      params: {
        entityType: { type: 'string' },
        entityId: { type: 'string' },
        tag: { type: 'string' }
      }
    }
  }, async (request, reply) => {
    try {
      const { entityType, entityId, tag } = request.params as { 
        entityType: string; 
        entityId: string; 
        tag: string 
      };
      
      const versions = await versionManager.getVersionsByTag(entityType, entityId, tag);
      
      return reply.send({
        success: true,
        data: versions
      });
    } catch (error) {
      console.error('Failed to get versions by tag:', (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to get versions by tag',
          code: 'VERSIONS_BY_TAG_ERROR'
        }
      });
    }
  });

  // Get version history
  fastify.get('/:entityType/:entityId/history', {
    schema: {
      params: {
        entityType: { type: 'string' },
        entityId: { type: 'string' }
      }
    }
  }, async (request, reply) => {
    try {
      const { entityType, entityId } = request.params as { entityType: string; entityId: string };
      const history = await versionManager.getVersionHistory(entityType, entityId);
      
      return reply.send({
        success: true,
        data: history
      });
    } catch (error) {
      console.error('Failed to get version history:', (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to get version history',
          code: 'VERSION_HISTORY_ERROR'
        }
      });
    }
  });

  // Get version manager stats
  fastify.get('/stats', async (request, reply) => {
    try {
      const stats = versionManager.getStats();
      
      return reply.send({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Failed to get version stats:', (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to get version stats',
          code: 'VERSION_STATS_ERROR'
        }
      });
    }
  });

  // Health check
  fastify.get('/health', async (request, reply) => {
    try {
      const health = await versionManager.healthCheck();
      
      return reply.send({
        success: true,
        data: health
      });
    } catch (error) {
      console.error('Version health check failed:', (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Version health check failed',
          code: 'VERSION_HEALTH_CHECK_ERROR'
        }
      });
    }
  });
}
