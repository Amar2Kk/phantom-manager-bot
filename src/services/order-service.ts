import { db } from '../utils/database.js';
import { OrderStatus } from '@prisma/client';
import { Client } from 'discord.js';
import { logger } from '../utils/logger.js';

export const OrderService = {
  /**
   * Create a new order
   */
  async createOrder(data: {
    orderId: string;
    guildId: string;
    game: string;
    price: number;
    assignedUserId: string;
    createdBy: string;
    notes?: string;
  }) {
    // Ensure user credit record exists
    await db.userCredit.upsert({
      where: {
        userId_guildId: {
          userId: data.assignedUserId,
          guildId: data.guildId,
        },
      },
      update: {},
      create: {
        userId: data.assignedUserId,
        guildId: data.guildId,
        credits: 0,
      },
    });

    return await db.order.create({
      data: {
        orderId: data.orderId,
        guildId: data.guildId,
        game: data.game,
        price: data.price,
        assignedUserId: data.assignedUserId,
        createdBy: data.createdBy,
        status: OrderStatus.PENDING,
        notes: data.notes,
      },
    });
  },

  /**
   * Update order status by internal ID
   */
  async updateOrderStatusById(
    id: string,
    newStatus: OrderStatus,
    updatedBy: string,
    client?: Client
  ) {
    const order = await db.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new Error(`Order not found!`);
    }

    const oldStatus = order.status;

    // Handle credit changes based on status transition
    if (newStatus === OrderStatus.DONE && oldStatus !== OrderStatus.DONE) {
      // Add credits when marking as done
      await db.userCredit.update({
        where: {
          userId_guildId: {
            userId: order.assignedUserId,
            guildId: order.guildId,
          },
        },
        data: {
          credits: {
            increment: order.price,
          },
        },
      });
    } else if (newStatus === OrderStatus.CANCELED && oldStatus === OrderStatus.DONE) {
      // Deduct credits if canceling a previously completed order
      await db.userCredit.update({
        where: {
          userId_guildId: {
            userId: order.assignedUserId,
            guildId: order.guildId,
          },
        },
        data: {
          credits: {
            decrement: order.price,
          },
        },
      });
    } else if (oldStatus === OrderStatus.DONE && newStatus === OrderStatus.PENDING) {
      // Deduct credits if moving from DONE back to PENDING
      await db.userCredit.update({
        where: {
          userId_guildId: {
            userId: order.assignedUserId,
            guildId: order.guildId,
          },
        },
        data: {
          credits: {
            decrement: order.price,
          },
        },
      });
    }

    // Update order
    const updateData: {
      status: OrderStatus;
      completedAt?: Date | null;
      canceledAt?: Date | null;
    } = {
      status: newStatus,
    };

    if (newStatus === OrderStatus.DONE) {
      updateData.completedAt = new Date();
    } else if (newStatus === OrderStatus.CANCELED) {
      updateData.canceledAt = new Date();
    }

    const updatedOrder = await db.order.update({
      where: { id },
      data: updateData,
    });

    // Update leaderboard if client is provided
    if (client) {
      // Import dynamically to avoid circular dependency
      const { LeaderboardService } = await import('./leaderboard-service.js');
      await LeaderboardService.updateLeaderboard(client, order.guildId);
    } else {
      logger.warn(`Client not provided to updateOrderStatusById, skipping leaderboard update for guild ${order.guildId}`);
    }

    return updatedOrder;
  },

  /**
   * Toggle payment received status by internal ID
   */
  async togglePaymentReceivedById(
    id: string,
    updatedBy: string
  ) {
    const order = await db.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new Error(`Order not found!`);
    }

    const newPaymentStatus = !order.paymentReceived;

    // Handle credit changes based on payment status
    // Only affect credits if the order is DONE
    if (order.status === OrderStatus.DONE) {
      if (newPaymentStatus) {
        // Payment received → Deduct credits (user got their money)
        await db.userCredit.update({
          where: {
            userId_guildId: {
              userId: order.assignedUserId,
              guildId: order.guildId,
            },
          },
          data: {
            credits: {
              decrement: order.price,
            },
          },
        });
      } else {
        // Payment unmarked → Add credits back (payment was reversed)
        await db.userCredit.update({
          where: {
            userId_guildId: {
              userId: order.assignedUserId,
              guildId: order.guildId,
            },
          },
          data: {
            credits: {
              increment: order.price,
            },
          },
        });
      }
    }

    return await db.order.update({
      where: { id },
      data: {
        paymentReceived: newPaymentStatus,
      },
    });
  },

  /**
   * Get order by internal database ID
   */
  async getOrderById(id: string) {
    return await db.order.findUnique({
      where: { id },
    });
  },

  /**
   * Get order by custom orderId (only non-archived)
   * Returns the most recent order if multiple exist
   */
  async getOrder(orderId: string, guildId: string) {
    return await db.order.findFirst({
      where: {
        orderId,
        guildId,
        archived: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  /**
   * List orders with filters (only non-archived)
   */
  async listOrders(guildId: string, filters?: {
    status?: OrderStatus;
    assignedUserId?: string;
    limit?: number;
  }) {
    return await db.order.findMany({
      where: {
        guildId,
        archived: false,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.assignedUserId && { assignedUserId: filters.assignedUserId }),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: filters?.limit || 10,
    });
  },

  /**
   * Get user credits
   */
  async getUserCredits(userId: string, guildId: string) {
    return await db.userCredit.findUnique({
      where: {
        userId_guildId: {
          userId,
          guildId,
        },
      },
    });
  },

  /**
   * Get credits leaderboard
   */
  async getCreditsLeaderboard(guildId: string, limit = 10) {
    return await db.userCredit.findMany({
      where: { guildId },
      orderBy: { credits: 'desc' },
      take: limit,
    });
  },

  /**
   * Get user order statistics (only non-archived)
   */
  async getUserOrderStats(userId: string, guildId: string) {
    const [total, completed, pending, paymentReceived, canceled] = await Promise.all([
      db.order.count({
        where: { assignedUserId: userId, guildId, archived: false },
      }),
      db.order.count({
        where: { assignedUserId: userId, guildId, archived: false, status: OrderStatus.DONE },
      }),
      db.order.count({
        where: { assignedUserId: userId, guildId, archived: false, status: OrderStatus.PENDING },
      }),
      db.order.count({
        where: { assignedUserId: userId, guildId, archived: false, paymentReceived: true },
      }),
      db.order.count({
        where: { assignedUserId: userId, guildId, archived: false, status: OrderStatus.CANCELED },
      }),
    ]);

    return {
      total,
      completed,
      pending,
      paymentReceived,
      canceled,
    };
  },
};

