import { Injectable, HttpException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private db: PrismaService) {}

  async getNotifications(userId: string) {
    return await this.db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to 50 most recent
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.db.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new HttpException('Notification not found', 404);
    }

    if (notification.userId !== userId) {
      throw new HttpException('Unauthorized', 403);
    }

    return await this.db.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string) {
    return await this.db.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  async deleteNotification(notificationId: string, userId: string) {
    const notification = await this.db.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new HttpException('Notification not found', 404);
    }

    if (notification.userId !== userId) {
      throw new HttpException('Unauthorized', 403);
    }

    await this.db.notification.delete({
      where: { id: notificationId },
    });

    return { success: true, message: 'Notification deleted successfully' };
  }

  async getUnreadCount(userId: string) {
    return await this.db.notification.count({
      where: { userId, read: false },
    });
  }
}

