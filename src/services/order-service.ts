import { db } from '../utils/database';
import { OrderStatus } from '@prisma/client';
import { Client } from 'discord.js';

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
    // Check if order ID already exists in this guild (excluding archived)
    const existing = await db.order.findFirst({
      where: {
        orderId: data.orderId,
        guildId: data.guildId,
        archived: false,
      },
    });

    if (existing) {
      throw new Error(`Order ID "${data.orderId}" already exists in this server!`);
    }

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
   * Update order status
   */
  async updateOrderStatus(
    orderId: string,
    guildId: string,
    newStatus: OrderStatus,
    updatedBy: string,
    client?: Client
  ) {
    const order = await db.order.findUnique({
      where: {
        orderId_guildId: {
          orderId,
          guildId,
        },
      },
    });

    if (!order) {
      throw new Error(`Order "${orderId}" not found!`);
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
      where: {
        orderId_guildId: {
          orderId,
          guildId,
        },
      },
      data: updateData,
    });

    // Update leaderboard if client is provided
    if (client) {
      // Import dynamically to avoid circular dependency
      const { LeaderboardService } = await import('./leaderboard-service');
      await LeaderboardService.updateLeaderboard(client, guildId);
    }

    return updatedOrder;
  },

  /**
   * Toggle payment received status
   */
  async togglePaymentReceived(
    orderId: string,
    guildId: string,
    updatedBy: string
  ) {
    const order = await db.order.findUnique({
      where: {
        orderId_guildId: {
          orderId,
          guildId,
        },
      },
    });

    if (!order) {
      throw new Error(`Order "${orderId}" not found!`);
    }

    return await db.order.update({
      where: {
        orderId_guildId: {
          orderId,
          guildId,
        },
      },
      data: {
        paymentReceived: !order.paymentReceived,
      },
    });
  },

  /**
   * Get order by ID (only non-archived)
   */
  async getOrder(orderId: string, guildId: string) {
    return await db.order.findFirst({
      where: {
        orderId,
        guildId,
        archived: false,
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

