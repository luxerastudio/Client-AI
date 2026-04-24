import { FastifyInstance, FastifyRequest } from 'fastify';
import { DependencyContainer } from '../../infrastructure/di/DependencyContainer';
import { ICreditService } from '../../domain/credit/entities/Credit';

// Extend FastifyRequest to include user context
interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    role?: string;
    roles?: string[];
  };
  securityContext?: {
    user?: {
      id: string;
      role?: string;
      roles?: string[];
    };
  };
}

export async function creditRoutes(fastify: FastifyInstance, container: DependencyContainer) {
  const creditService = container.get('creditService') as ICreditService;

  // Get credit account and balance
  fastify.get('/account', {
    schema: {
      description: 'Get user credit account information',
      tags: ['credits'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                account: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    userId: { type: 'string' },
                    balance: { type: 'number' },
                    totalEarned: { type: 'number' },
                    totalSpent: { type: 'number' },
                    isActive: { type: 'boolean' },
                    createdAt: { type: 'string' },
                    updatedAt: { type: 'string' },
                    monthlyLimit: { type: 'number' },
                    dailyLimit: { type: 'number' }
                  }
                },
                balance: { type: 'number' },
                stats: {
                  type: 'object',
                  properties: {
                    transactionCount: { type: 'number' },
                    usageCount: { type: 'number' },
                    totalUsageCredits: { type: 'number' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const userId = (request as AuthenticatedRequest).user?.id || (request as AuthenticatedRequest).securityContext?.user?.id;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            message: 'Authentication required',
            code: 'AUTH_REQUIRED'
          }
        });
      }

      const account = await creditService.getAccount(userId);
      const balance = await creditService.getBalance(userId);
      
      let stats = null;
      if (account) {
        stats = await creditService.getUsageStats(userId, 'month');
      }

      return reply.send({
        success: true,
        data: {
          account,
          balance,
          stats
        }
      });
    } catch (error) {
      fastify.log.error({ error: error as Error }, 'Failed to get credit account');
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to get credit account',
          code: 'ACCOUNT_ERROR'
        }
      });
    }
  });

  // Get transaction history
  fastify.get('/transactions', {
    schema: {
      description: 'Get user credit transaction history',
      tags: ['credits'],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', minimum: 1, maximum: 100, default: 50 },
          offset: { type: 'number', minimum: 0, default: 0 },
          type: { type: 'string', enum: ['earn', 'spend', 'refund', 'bonus', 'penalty'] }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                transactions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      userId: { type: 'string' },
                      type: { type: 'string' },
                      amount: { type: 'number' },
                      balanceBefore: { type: 'number' },
                      balanceAfter: { type: 'number' },
                      description: { type: 'string' },
                      metadata: { type: 'object' },
                      referenceId: { type: 'string' },
                      referenceType: { type: 'string' },
                      createdAt: { type: 'string' }
                    }
                  }
                },
                pagination: {
                  type: 'object',
                  properties: {
                    limit: { type: 'number' },
                    offset: { type: 'number' },
                    hasMore: { type: 'boolean' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const userId = (request as AuthenticatedRequest).user?.id || (request as AuthenticatedRequest).securityContext?.user?.id;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            message: 'Authentication required',
            code: 'AUTH_REQUIRED'
          }
        });
      }

      const { limit = 50, offset = 0, type } = request.query as any;
      
      let transactions;
      if (type) {
        transactions = await creditService.getTransactionsByType(userId, type);
      } else {
        transactions = await creditService.getTransactionHistory(userId, limit, offset);
      }

      return reply.send({
        success: true,
        data: {
          transactions,
          pagination: {
            limit,
            offset,
            hasMore: transactions.length === limit
          }
        }
      });
    } catch (error) {
      fastify.log.error({ error: error as Error }, 'Failed to get transactions');
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to get transactions',
          code: 'TRANSACTION_ERROR'
        }
      });
    }
  });

  // Get usage history
  fastify.get('/usage', {
    schema: {
      description: 'Get user credit usage history',
      tags: ['credits'],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', minimum: 1, maximum: 100, default: 50 },
          offset: { type: 'number', minimum: 0, default: 0 },
          period: { type: 'string', enum: ['day', 'week', 'month', 'year'], default: 'month' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                usage: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      userId: { type: 'string' },
                      apiEndpoint: { type: 'string' },
                      operation: { type: 'string' },
                      creditsSpent: { type: 'number' },
                      tokensUsed: { type: 'number' },
                      processingTime: { type: 'number' },
                      model: { type: 'string' },
                      metadata: { type: 'object' },
                      ipAddress: { type: 'string' },
                      userAgent: { type: 'string' },
                      requestId: { type: 'string' },
                      status: { type: 'string' },
                      createdAt: { type: 'string' }
                    }
                  }
                },
                stats: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      period: { type: 'string' },
                      totalCredits: { type: 'number' },
                      totalRequests: { type: 'number' },
                      avgTokens: { type: 'number' },
                      avgProcessingTime: { type: 'number' }
                    }
                  }
                },
                pagination: {
                  type: 'object',
                  properties: {
                    limit: { type: 'number' },
                    offset: { type: 'number' },
                    hasMore: { type: 'boolean' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const userId = (request as AuthenticatedRequest).user?.id || (request as AuthenticatedRequest).securityContext?.user?.id;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            message: 'Authentication required',
            code: 'AUTH_REQUIRED'
          }
        });
      }

      const { limit = 50, offset = 0, period = 'month' } = request.query as any;
      
      const [usage, stats] = await Promise.all([
        creditService.getUsageHistory(userId, limit, offset),
        creditService.getUsageStats(userId, period)
      ]);

      return reply.send({
        success: true,
        data: {
          usage,
          stats,
          pagination: {
            limit,
            offset,
            hasMore: usage.length === limit
          }
        }
      });
    } catch (error) {
      fastify.log.error({ error: error as Error }, 'Failed to get usage history');
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to get usage history',
          code: 'USAGE_ERROR'
        }
      });
    }
  });

  // Get available credit packages
  fastify.get('/packages', {
    schema: {
      description: 'Get available credit packages for purchase',
      tags: ['credits'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                packages: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      description: { type: 'string' },
                      credits: { type: 'number' },
                      price: { type: 'number' },
                      currency: { type: 'string' },
                      isActive: { type: 'boolean' },
                      features: { type: 'array', items: { type: 'string' } },
                      createdAt: { type: 'string' },
                      updatedAt: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const packages = await creditService.getAvailablePackages();

      return reply.send({
        success: true,
        data: { packages }
      });
    } catch (error) {
      fastify.log.error({ error: error as Error }, 'Failed to get packages');
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to get packages',
          code: 'PACKAGE_ERROR'
        }
      });
    }
  });

  // Purchase credit package
  fastify.post('/purchase', {
    schema: {
      description: 'Purchase a credit package',
      tags: ['credits'],
      body: {
        type: 'object',
        required: ['packageId'],
        properties: {
          packageId: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                transaction: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    userId: { type: 'string' },
                    type: { type: 'string' },
                    amount: { type: 'number' },
                    balanceBefore: { type: 'number' },
                    balanceAfter: { type: 'number' },
                    description: { type: 'string' },
                    createdAt: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const userId = (request as AuthenticatedRequest).user?.id || (request as AuthenticatedRequest).securityContext?.user?.id;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            message: 'Authentication required',
            code: 'AUTH_REQUIRED'
          }
        });
      }

      const { packageId } = request.body as any;
      
      const result = await creditService.purchasePackage(userId, packageId);
      
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: {
            message: result.error,
            code: 'PURCHASE_FAILED'
          }
        });
      }

      return reply.send({
        success: true,
        data: { transaction: result.transaction }
      });
    } catch (error) {
      fastify.log.error({ error: error as Error }, 'Failed to purchase package');
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to purchase package',
          code: 'PURCHASE_ERROR'
        }
      });
    }
  });

  // Add credits (admin only)
  fastify.post('/admin/add-credits', {
    schema: {
      description: 'Add credits to a user account (admin only)',
      tags: ['credits', 'admin'],
      body: {
        type: 'object',
        required: ['userId', 'amount', 'description'],
        properties: {
          userId: { type: 'string' },
          amount: { type: 'number', minimum: 1 },
          description: { type: 'string' },
          metadata: { type: 'object' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      // Check if user is admin
      const user = (request as AuthenticatedRequest).user || (request as AuthenticatedRequest).securityContext?.user;
      if (!user || (user.role !== 'admin' && !(user as any).roles?.includes('admin'))) {
        return reply.status(403).send({
          success: false,
          error: {
            message: 'Admin access required',
            code: 'ADMIN_REQUIRED'
          }
        });
      }

      const { userId, amount, description, metadata } = request.body as any;
      
      const transaction = await creditService.addCredits(userId, amount, description, metadata);

      return reply.send({
        success: true,
        data: { transaction }
      });
    } catch (error) {
      fastify.log.error({ error: error as Error }, 'Failed to add credits');
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to add credits',
          code: 'ADD_CREDITS_ERROR'
        }
      });
    }
  });

  // Get system stats (admin only)
  fastify.get('/admin/stats', {
    schema: {
      description: 'Get system credit statistics (admin only)',
      tags: ['credits', 'admin']
    }
  }, async (request, reply) => {
    try {
      // Check if user is admin
      const user = (request as AuthenticatedRequest).user || (request as AuthenticatedRequest).securityContext?.user;
      if (!user || (user.role !== 'admin' && !(user as any).roles?.includes('admin'))) {
        return reply.status(403).send({
          success: false,
          error: {
            message: 'Admin access required',
            code: 'ADMIN_REQUIRED'
          }
        });
      }

      // This would need to be implemented in CreditService
      // For now, return a placeholder
      const stats = {
        totalAccounts: 0,
        totalBalance: 0,
        totalEarned: 0,
        totalSpent: 0,
        activeAccounts: 0
      };

      return reply.send({
        success: true,
        data: { stats }
      });
    } catch (error) {
      fastify.log.error({ error: error as Error }, 'Failed to get system stats');
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to get system stats',
          code: 'STATS_ERROR'
        }
      });
    }
  });
}
