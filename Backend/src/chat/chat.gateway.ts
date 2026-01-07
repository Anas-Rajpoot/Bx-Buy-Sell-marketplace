import {
  SubscribeMessage,
  WebSocketGateway,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  WebSocketServer,
  WsException,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { MessageQueueService } from 'src/message-queue/message-queue.service';
import { RedisAdapterService } from 'src/redis-adapter/redis-adapter.service';
import { ChatService } from './chat.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { z } from 'zod';
import parsePhoneNumberFromString from 'libphonenumber-js';

@WebSocketGateway({ 
  cors: { 
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Authorization', 'Content-Type']
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  io: Server;

  // Track active connections and their rooms
  private activeConnections = new Map<string, Set<string>>();

  constructor(
    private readonly redisAdapterService: RedisAdapterService,
    private readonly messageQueueService: MessageQueueService,
    private readonly chatService: ChatService,
    private readonly db: PrismaService,
  ) {}

  async afterInit(server: Server) {
    this.io = server;
    console.log('🚀 WebSocket Gateway initialized');
    try {
      await this.redisAdapterService.connectToRedis();
      console.log('✅ Redis adapter connected');
    } catch (error) {
      console.error('❌ Failed to connect Redis adapter:', error);
    }
  }

  async handleConnection(client: Socket) {
    // Extract token from handshake auth
    const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
    
    console.log('👤 Client connecting:', {
      clientId: client.id,
      hasToken: !!token,
      auth: client.handshake.auth,
      headers: Object.keys(client.handshake.headers)
    });
    
    let userId: string | null = null;
    
    // Check if user is ADMIN/MONITER and join monitor room
    if (token) {
      try {
        // Decode JWT to check role (simple decode, no verification needed here)
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        const userRole = payload.role;
        userId = payload.id;
        
        // Store userId on socket for later use
        (client as any).userId = userId;
        
        if (userRole === 'ADMIN' || userRole === 'MONITER' || userRole === 'STAFF') {
          client.join('monitor-room');
          console.log('✅ Monitor user joined monitor-room:', {
            clientId: client.id,
            role: userRole,
            userId: userId
          });
        }
        
        // CRITICAL: Update user online status when they connect
        if (userId) {
          try {
            await this.db.user.update({
              where: { id: userId },
              data: { is_online: true },
            });
            console.log('✅ User marked as online:', userId);
            
            // Emit user online status to all clients
            this.io.emit('user:status-changed', {
              userId: userId,
              isOnline: true,
            });
          } catch (error) {
            console.error('❌ Error updating user online status:', error);
          }
        }
      } catch (error) {
        // If token decode fails, continue without monitor room
        console.warn('⚠️ Could not decode token for monitor room check:', error);
      }
    }
    
    // Note: Authentication can be added here if needed
    // For now, we allow connection but validate on message send
    
    this.activeConnections.set(client.id, new Set());
    console.log('✅ Client connected:', client.id, userId ? `(User: ${userId})` : '');
  }

  handleDisconnect(client: Socket) {
    const userId = (client as any).userId;
    console.log('👋 Client disconnected:', client.id, userId ? `(User: ${userId})` : '');
    
    // CRITICAL: Update user online status when they disconnect
    if (userId) {
      // Check if user has other active connections
      const userRoom = `user:${userId}`;
      const userRoomClients = this.io.sockets.adapter.rooms.get(userRoom);
      const hasOtherConnections = userRoomClients && userRoomClients.size > 0;
      
      // Only mark offline if no other connections exist
      if (!hasOtherConnections) {
        this.db.user.update({
          where: { id: userId },
          data: { is_online: false },
        }).then(() => {
          console.log('✅ User marked as offline:', userId);
          
          // Emit user offline status to all clients
          this.io.emit('user:status-changed', {
            userId: userId,
            isOnline: false,
          });
        }).catch((error) => {
          console.error('❌ Error updating user offline status:', error);
        });
      } else {
        console.log('ℹ️ User still has other connections, keeping online status');
      }
    }
    
    this.activeConnections.delete(client.id);
  }

  // Join Room - CRITICAL: Only allow joining ONE room at a time
  @SubscribeMessage('join:room')
  handleJoinRoom(
    @MessageBody() { chatId }: { chatId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      if (!chatId) {
        throw new WsException('chatId is required');
      }

      // CRITICAL: Leave all other rooms first to ensure isolation
      const currentRooms = this.activeConnections.get(client.id) || new Set();
      currentRooms.forEach(room => {
        if (room !== client.id) { // Don't leave the default socket.io room
          client.leave(room);
          console.log('📤 Client', client.id, 'left room:', room);
        }
      });

      // Join the new room
      client.join(chatId);
      this.activeConnections.set(client.id, new Set([chatId]));
      
      // Verify room membership immediately
      const roomClients = this.io.sockets.adapter.rooms.get(chatId);
      const clientCount = roomClients?.size || 0;
      
      console.log('✅ Client', client.id, 'joined room:', chatId);
      console.log('📊 Room', chatId, 'now has', clientCount, 'client(s)');
      
      // Send confirmation to client
      client.emit('room:joined', { 
        chatId, 
        success: true,
        clientCount 
      });
      
      return { success: true, chatId, clientCount };
    } catch (error) {
      console.error('❌ Error joining room:', error);
      client.emit('error', { 
        message: error instanceof Error ? error.message : 'Failed to join room' 
      });
      throw new WsException('Failed to join room');
    }
  }

  // Leave Room
  @SubscribeMessage('leave:room')
  handleLeaveRoom(
    @MessageBody() { chatId }: { chatId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      if (chatId === 'all') {
        // Leave all rooms except the default socket.io room
        const rooms = this.activeConnections.get(client.id) || new Set();
        rooms.forEach(room => {
          if (room !== client.id) {
            client.leave(room);
            console.log('📤 Client', client.id, 'left room:', room);
          }
        });
        this.activeConnections.set(client.id, new Set());
        console.log('📤 Client', client.id, 'left all chat rooms');
      } else if (chatId) {
        client.leave(chatId);
        const rooms = this.activeConnections.get(client.id) || new Set();
        rooms.delete(chatId);
        this.activeConnections.set(client.id, rooms);
        console.log('📤 Client', client.id, 'left room:', chatId);
      }
    } catch (error) {
      console.error('❌ Error leaving room:', error);
      throw new WsException('Failed to leave room');
    }
  }

  @SubscribeMessage('edit:message')
  async handleEditMessage(
    @MessageBody() data: { messageId: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = (client as any).userId;
      if (!userId) {
        throw new WsException('User not authenticated');
      }

      const updatedMessage = await this.chatService.updateMessage(
        data.messageId,
        userId,
        data.content,
      );

      // Get the chat room ID
      const message = await this.db.message.findUnique({
        where: { id: data.messageId },
        select: { chatId: true },
      });

      if (!message) {
        throw new WsException('Message not found');
      }

      // Emit edit event to all clients in the room
      const messageString = JSON.stringify({
        id: updatedMessage.id,
        chatId: message.chatId,
        content: updatedMessage.content,
        senderId: updatedMessage.senderId,
        type: 'message_edited',
        createdAt: updatedMessage.createdAt,
        updatedAt: (updatedMessage as any).updatedAt || updatedMessage.createdAt,
      });

      console.log('📝 EMIT message_edited:', updatedMessage.id, 'to room:', message.chatId);
      this.io.to(message.chatId).emit('message:edited', messageString);

      return { success: true, message: updatedMessage };
    } catch (error) {
      console.error('❌ Error in handleEditMessage:', error);
      throw new WsException(error instanceof Error ? error.message : 'Failed to edit message');
    }
  }

  @SubscribeMessage('delete:message')
  async handleDeleteMessage(
    @MessageBody() data: { messageId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = (client as any).userId;
      if (!userId) {
        throw new WsException('User not authenticated');
      }

      // Get message info before deletion
      const message = await this.db.message.findUnique({
        where: { id: data.messageId },
        select: { chatId: true, senderId: true },
      });

      if (!message) {
        throw new WsException('Message not found');
      }

      const result = await this.chatService.deleteMessage(data.messageId, userId);

      // Emit delete event to all clients in the room
      const deleteEvent = JSON.stringify({
        messageId: data.messageId,
        chatId: result.chatId,
        type: 'message_deleted',
      });

      console.log('🗑️ EMIT message_deleted:', data.messageId, 'to room:', result.chatId);
      this.io.to(result.chatId).emit('message:deleted', deleteEvent);

      return { success: true };
    } catch (error) {
      console.error('❌ Error in handleDeleteMessage:', error);
      throw new WsException(error instanceof Error ? error.message : 'Failed to delete message');
    }
  }

  // Send Message - CRITICAL: Only broadcast to the specific room
  @SubscribeMessage('send:message')
  async handleSendMessage(
    @MessageBody() message: any,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // Validate message
      if (!message.chatId || !message.senderId || !message.content) {
        console.error('❌ Invalid message format:', message);
        throw new WsException('Invalid message format: chatId, senderId, and content are required');
      }

      console.log('📨 send_message called with:', {
        chatId: message.chatId,
        senderId: message.senderId,
        content: message.content?.substring(0, 50),
        clientId: client.id,
        messageId: message.id || 'no-id-yet'
      });

      // Validate content (prevent emails/phone numbers)
      const schema = z.string().email();
      const isValid = (message.content as string).split(' ').findIndex((el) => {
        if (
          schema.safeParse(el).success ||
          parsePhoneNumberFromString(el)?.isValid()
        ) {
          return true;
        }
      });

      if (isValid !== -1) {
        message.type = 'ERROR';
        message.content = "Don't use email or phone number";
        // SINGLE EMIT: Error message broadcast to room only (no client.emit or this.io.emit)
        console.log('📤 EMIT error message (SINGLE):', message.chatId);
        this.io.to(message.chatId).emit('message', JSON.stringify(message));
        return;
      }

      // CRITICAL: Ensure chat room exists before saving message
      // Check if chat room exists, create if missing
      let chatRoom;
      try {
        // Try to find existing chat room
        const existingChat = await this.db.chat.findUnique({
          where: { id: message.chatId },
          include: {
            user: { select: { id: true } },
            seller: { select: { id: true } },
          },
        });

        if (!existingChat) {
          // Chat room doesn't exist - need userId and sellerId from message payload
          // Frontend should send userId and sellerId when sending first message
          if (!message.userId || !message.sellerId) {
            console.error('❌ Cannot create chat room: userId and sellerId required in message payload', {
              chatId: message.chatId,
              senderId: message.senderId,
              hasUserId: !!message.userId,
              hasSellerId: !!message.sellerId,
            });
            
            // Try to derive from existing messages in this chatId
            const existingMessages = await this.db.message.findMany({
              where: { chatId: message.chatId },
              select: { senderId: true },
              distinct: ['senderId'],
            });

            const participantIds = [...new Set(existingMessages.map(m => m.senderId))];
            
            if (participantIds.length >= 2) {
              // We have at least 2 participants, use them
              const userId = participantIds[0];
              const sellerId = participantIds[1];
              
              console.log('🆕 Creating chat room from existing messages:', {
                chatId: message.chatId,
                userId,
                sellerId,
                participants: participantIds,
              });

              chatRoom = await this.chatService.createChatRoom(userId, sellerId, message.listingId);
              console.log('✅ Chat room created from messages:', chatRoom.id);
            } else {
              throw new WsException('Cannot create chat room: userId and sellerId required. Please provide them in the message payload.');
            }
          } else {
            // Create chat room with provided userId and sellerId
            console.log('🆕 Creating chat room from message payload:', {
              chatId: message.chatId,
              userId: message.userId,
              sellerId: message.sellerId,
              senderId: message.senderId,
            });

            chatRoom = await this.chatService.createChatRoom(message.userId, message.sellerId, message.listingId);
            console.log('✅ Chat room created:', chatRoom.id);
          }
        } else {
          chatRoom = existingChat;
        }
      } catch (chatError) {
        console.error('❌ Error ensuring chat room exists:', chatError);
        throw new WsException(`Failed to ensure chat room exists: ${chatError instanceof Error ? chatError.message : 'Unknown error'}`);
      }

      // Save message to database (idempotent - will return existing if duplicate)
      let savedMessage;
      try {
        savedMessage = await this.chatService.createMessage({
          chatId: message.chatId,
          senderId: message.senderId,
          content: message.content,
          type: message.type || 'TEXT',
          fileUrl: message.fileUrl || null,
        });
        
        message.id = savedMessage.id;
        message.createdAt = savedMessage.createdAt.toISOString();
        message.read = savedMessage.read;
        message.fileUrl = savedMessage.fileUrl || message.fileUrl;
        
        console.log('✅ Message saved to database, id:', savedMessage.id, {
          messageId: savedMessage.id,
          chatId: message.chatId,
          senderId: message.senderId
        });

        // Update chat room's updatedAt timestamp
        const chatUpdate = await this.db.chat.update({
          where: { id: message.chatId },
          data: { updatedAt: new Date() },
        }).catch(err => {
          console.error('❌ Failed to update chat updatedAt:', err);
          return null;
        });
        
        // Check if this is a new chat (first message) and emit monitor:chat_created
        if (chatUpdate) {
          const chat = await this.db.chat.findUnique({
            where: { id: message.chatId },
            include: {
              messages: {
                select: { id: true },
                take: 1,
              },
            },
          });
          
          // If this is the first message in the chat, emit chat_created
          if (chat && chat.messages.length === 1) {
            console.log('🆕 [MONITOR] New chat room created:', message.chatId);
            this.io.to('monitor-room').emit('monitor:chat_created', {
              chatRoomId: message.chatId,
            });
          }
        }

        // Create notification for the recipient (not the sender)
        try {
          const chat = await this.db.chat.findUnique({
            where: { id: message.chatId },
            include: {
              user: { select: { id: true, first_name: true, last_name: true } },
              seller: { select: { id: true, first_name: true, last_name: true } },
            },
          });

          if (chat) {
            const recipientId = chat.userId === message.senderId ? chat.sellerId : chat.userId;
            const senderName = chat.userId === message.senderId 
              ? `${chat.user.first_name || ''} ${chat.user.last_name || ''}`.trim() || 'User'
              : `${chat.seller.first_name || ''} ${chat.seller.last_name || ''}`.trim() || 'User';
            
            await this.db.notification.create({
              data: {
                userId: recipientId,
                title: 'New Message',
                message: `${senderName}: ${message.content.substring(0, 100)}${message.content.length > 100 ? '...' : ''}`,
                type: 'message',
                read: false,
                link: `/chat?chatId=${message.chatId}&userId=${chat.userId}&sellerId=${chat.sellerId}`,
                chatId: message.chatId,
              },
            });
            console.log('✅ Notification created for user:', recipientId);
          }
        } catch (notifError) {
          // Don't fail message creation if notification fails
          console.error('❌ Failed to create notification:', notifError);
        }
      } catch (dbError) {
        console.error('❌ Error saving message to database:', dbError);
        throw new WsException('Failed to save message to database');
      }

      // CRITICAL: Get clients in the SPECIFIC room only
      const roomClients = await this.io.in(message.chatId).fetchSockets();
      
      console.log('📤 Broadcasting to room:', {
        chatId: message.chatId,
        clientsCount: roomClients.length,
        messageId: message.id,
        clientIds: roomClients.map(c => c.id)
      });
      
      if (roomClients.length === 0) {
        console.warn('⚠️ WARNING: No clients in room! Message saved but not delivered:', {
          chatId: message.chatId,
          messageId: message.id,
          message: 'The message was saved to the database but no clients are currently in this room. They will see it when they join or refresh.'
        });
      } else {
        // Verify sender is in the room
        const senderInRoom = roomClients.some(c => c.id === client.id);
        if (!senderInRoom) {
          console.warn('⚠️ WARNING: Sender not in room!', {
            chatId: message.chatId,
            senderSocketId: client.id,
            roomClients: roomClients.map(c => c.id)
          });
        }
      }

      // CRITICAL: Broadcast ONLY to the specific room - SINGLE EMIT ONLY
      // DO NOT use client.emit() or this.io.emit() - only use this.io.to(chatId).emit()
      // This ensures the sender receives the message exactly once via room broadcast
      const messageString = JSON.stringify(message);
      
      // SINGLE EMIT: Broadcast to all clients in the room (including sender)
      // The sender is already in the room, so they receive it via this single room broadcast
      // NO additional emits - this is the ONLY emit for this message
      console.log('📤 EMIT message (SINGLE):', message.id, 'to room:', message.chatId, 'clients:', roomClients.length);
      this.io.to(message.chatId).emit('message', messageString);
      
      // Emit to monitor room for admin/monitor dashboard updates
      this.io.to('monitor-room').emit('monitor:chat_updated', {
        chatRoomId: message.chatId,
        updatedAt: savedMessage.createdAt.toISOString(),
        lastMessage: {
          id: savedMessage.id,
          content: savedMessage.content,
          createdAt: savedMessage.createdAt.toISOString(),
          senderId: savedMessage.senderId,
        },
      });
      
      // Emit notification event to recipient for real-time notification updates
      // Notification was created above after message save
      this.io.emit('new_notification', {
        type: 'message',
        chatId: message.chatId,
        messageId: message.id,
      });
      console.log('🔔 Notification event emitted for new message:', message.id);
      
      // NOTE: Removed queueMessage call to prevent duplicate message saves
      // Message is already saved directly via createMessage() above
      // Queue system was causing duplicate messages in database
      // If queue functionality is needed later, ensure it checks for existing messages first
      // this.messageQueueService.queueMessage(message);
      
      console.log('✅ Message broadcasted successfully to', roomClients.length, 'client(s)');
    } catch (error) {
      console.error('❌ Error in handleSendMessage:', error);
      throw new WsException(error instanceof Error ? error.message : 'Failed to send message');
    }
  }

  // Admin-specific handlers
  @SubscribeMessage('join:room:admin')
  handleJoinRoomAsAdmin(
    @MessageBody() { chatId }: { chatId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      client.join(chatId);
      this.io.to(chatId).emit('join:admin', JSON.stringify({
        adminJoined: true,
        message: 'An Admin Has Joined the Chat..',
      }));
      console.log('👮 Admin joined room:', chatId);
    } catch (error) {
      throw new WsException('Failed to join as admin');
    }
  }

  @SubscribeMessage('message:send:admin')
  async handleSendAdminMessage(
    @MessageBody() message: any,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // Validate message
      if (!message.chatId || !message.senderId || !message.content) {
        console.error('❌ Invalid admin message format:', message);
        throw new WsException('Invalid message format: chatId, senderId, and content are required');
      }

      console.log('📨 Admin message received:', {
        chatId: message.chatId,
        senderId: message.senderId,
        content: message.content?.substring(0, 50),
        clientId: client.id,
      });

      // CRITICAL: Ensure chat room exists
      let chatRoom;
      try {
        const existingChat = await this.db.chat.findUnique({
          where: { id: message.chatId },
          include: {
            user: { select: { id: true } },
            seller: { select: { id: true } },
          },
        });

        if (!existingChat) {
          console.error('❌ Chat room not found for admin message:', message.chatId);
          throw new WsException('Chat room not found');
        }
        chatRoom = existingChat;
      } catch (chatError) {
        console.error('❌ Error ensuring chat room exists:', chatError);
        throw new WsException(`Failed to ensure chat room exists: ${chatError instanceof Error ? chatError.message : 'Unknown error'}`);
      }

      // Fetch admin user information
      let adminUser;
      try {
        adminUser = await this.db.user.findUnique({
          where: { id: message.senderId },
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            profile_pic: true,
            role: true,
          },
        });

        if (!adminUser) {
          console.error('❌ Admin user not found:', message.senderId);
          throw new WsException('Admin user not found');
        }
      } catch (userError) {
        console.error('❌ Error fetching admin user:', userError);
        throw new WsException('Failed to fetch admin user information');
      }

      // Save message to database
      let savedMessage;
      try {
        savedMessage = await this.chatService.createMessage({
          chatId: message.chatId,
          senderId: message.senderId,
          content: message.content,
          type: 'ADMIN',
          fileUrl: message.fileUrl || null,
        });
        
        console.log('✅ Admin message saved to database, id:', savedMessage.id, {
          messageId: savedMessage.id,
          chatId: message.chatId,
          senderId: message.senderId
        });

        // Update chat room's updatedAt timestamp
        await this.db.chat.update({
          where: { id: message.chatId },
          data: { updatedAt: new Date() },
        }).catch(err => {
          console.error('❌ Failed to update chat updatedAt:', err);
        });
      } catch (dbError) {
        console.error('❌ Error saving admin message to database:', dbError);
        throw new WsException('Failed to save admin message to database');
      }

      // Prepare message payload with sender information
      const messagePayload = {
        id: savedMessage.id,
        chatId: message.chatId,
        senderId: message.senderId,
        content: savedMessage.content,
        type: 'ADMIN',
        createdAt: savedMessage.createdAt.toISOString(),
        read: savedMessage.read,
        fileUrl: savedMessage.fileUrl || null,
        sender: {
          id: adminUser.id,
          first_name: adminUser.first_name || '',
          last_name: adminUser.last_name || '',
          email: adminUser.email || '',
          profile_pic: adminUser.profile_pic || null,
          role: adminUser.role || 'ADMIN',
        },
      };

      // CRITICAL: Get clients in the room before broadcasting
      const roomClients = await this.io.in(message.chatId).fetchSockets();
      
      console.log('📤 Broadcasting admin message to room:', {
        chatId: message.chatId,
        clientsCount: roomClients.length,
        messageId: savedMessage.id,
        clientIds: roomClients.map(c => c.id),
        senderId: message.senderId,
        senderSocketId: client.id
      });
      
      if (roomClients.length === 0) {
        console.warn('⚠️ WARNING: No clients in room for admin message!', {
          chatId: message.chatId,
          messageId: savedMessage.id
        });
        
        // Log all active rooms for debugging
        const allRooms = Array.from(this.io.sockets.adapter.rooms.keys());
        console.log('📊 All active rooms:', allRooms.filter(r => r !== client.id && !r.startsWith('user:')));
      } else {
        // Log who will receive the message
        console.log('📨 Admin message will be delivered to:', roomClients.length, 'client(s):', 
          roomClients.map(c => `${c.id}${(c as any).userId ? ` (user: ${(c as any).userId})` : ''}`));
      }

      // CRITICAL: Broadcast ONLY to the specific room - SINGLE EMIT ONLY
      const messageString = JSON.stringify(messagePayload);
      console.log('📤 EMIT admin message (SINGLE):', savedMessage.id, 'to room:', message.chatId, 'clients:', roomClients.length);
      this.io.to(message.chatId).emit('message', messageString);
      
      // Emit to monitor room for admin/monitor dashboard updates
      this.io.to('monitor-room').emit('monitor:chat_updated', {
        chatRoomId: message.chatId,
        updatedAt: savedMessage.createdAt.toISOString(),
        lastMessage: {
          id: savedMessage.id,
          content: savedMessage.content,
          createdAt: savedMessage.createdAt.toISOString(),
          senderId: savedMessage.senderId,
        },
      });

      // Create notification for recipients (not the admin)
      try {
        const recipientId = chatRoom.userId === message.senderId ? chatRoom.sellerId : chatRoom.userId;
        const adminName = `${adminUser.first_name || ''} ${adminUser.last_name || ''}`.trim() || 'Admin';
        
        await this.db.notification.create({
          data: {
            userId: recipientId,
            title: 'Admin Message',
            message: `${adminName}: ${message.content.substring(0, 100)}${message.content.length > 100 ? '...' : ''}`,
            type: 'message',
            read: false,
            link: `/chat?chatId=${message.chatId}&userId=${chatRoom.userId}&sellerId=${chatRoom.sellerId}`,
            chatId: message.chatId,
          },
        });
        console.log('✅ Notification created for user:', recipientId);
      } catch (notifError) {
        // Don't fail message creation if notification fails
        console.error('❌ Failed to create notification:', notifError);
      }

      console.log('✅ Admin message broadcasted successfully');
    } catch (error) {
      console.error('❌ Error in handleSendAdminMessage:', error);
      throw new WsException(error instanceof Error ? error.message : 'Failed to send admin message');
    }
  }

  // Offer handlers
  @SubscribeMessage('offer:user')
  async handleOfferUser(
    @MessageBody() message: any,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      message.type = 'OFFER';
      await this.chatService.updateOfferStatus(message.chatId, true);
      this.messageQueueService.queueMessage(message);
      // SINGLE EMIT: Offer message - only room broadcast, no client.emit or this.io.emit
      console.log('📤 EMIT offer message (SINGLE):', message.id || 'no-id', 'to room:', message.chatId);
      this.io.to(message.chatId).emit('message', JSON.stringify(message));
    } catch (error) {
      throw new WsException('Failed to process offer');
    }
  }

  @SubscribeMessage('offer:user:response')
  async handleOfferUserResponse(
    @MessageBody() message: any,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      message.type = 'OFFER';
      const response = message.response === 'true' ? true : false;
      await this.chatService.updateOfferStatus(message.chatId, response);
      this.messageQueueService.queueMessage(message);
      // SINGLE EMIT: Offer response message - only room broadcast, no client.emit or this.io.emit
      console.log('📤 EMIT offer response message (SINGLE):', message.id || 'no-id', 'to room:', message.chatId);
      this.io.to(message.chatId).emit('message', JSON.stringify(message));
    } catch (error) {
      throw new WsException('Failed to process offer response');
    }
  }

  // Video call handlers
  @SubscribeMessage('video:register')
  handleRegisterUserForVideoCall(
    @MessageBody() message: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Join a room for this user ID so we can send video call notifications
    const userRoom = `user:${message.userId}`;
    client.join(userRoom);
    
    // Verify the room membership
    const room = this.io.sockets.adapter.rooms.get(userRoom);
    const clientCount = room?.size || 0;
    
    console.log('📹 User registered for video call:', message.userId, 'joined room:', userRoom, 'clients in room:', clientCount);
    
    // Send confirmation to client
    client.emit('video:registered', { userId: message.userId, room: userRoom, success: true });
  }

  @SubscribeMessage('video:call-user')
  async handleCallUserForVideoCall(
    @MessageBody() message: { from: string; to: string; channelName: string; chatId: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Get the target user's room
    const targetUserRoom = `user:${message.to}`;
    
    console.log('📞 Video call request received:', {
      from: message.from,
      to: message.to,
      targetRoom: targetUserRoom,
      chatId: message.chatId,
    });
    
    // Check if target user is online (has joined their room)
    const room = this.io.sockets.adapter.rooms.get(targetUserRoom);
    
    // Also check if user is in the chat room as fallback
    const chatRoom = message.chatId ? this.io.sockets.adapter.rooms.get(message.chatId) : null;
    
    console.log('🔍 Room check:', {
      targetRoom: targetUserRoom,
      roomExists: !!room,
      clientCount: room?.size || 0,
      chatRoomExists: !!chatRoom,
      chatRoomClientCount: chatRoom?.size || 0,
      allUserRooms: Array.from(this.io.sockets.adapter.rooms.keys()).filter(r => r.startsWith('user:')),
    });
    
    if (room && room.size > 0) {
      console.log('📞 Sending video call request to user:', message.to, 'in room:', targetUserRoom, 'to', room.size, 'socket(s)');
      // Emit to all sockets in the target user's room
      this.io.to(targetUserRoom).emit('video:incoming-call', {
        from: message.from,
        to: message.to,
        channelName: message.channelName,
        chatId: message.chatId,
      });
      console.log('✅ Video call request sent to', room.size, 'socket(s) in user room');
      
      // Also emit to chat room as backup (in case user is listening there)
      if (message.chatId && chatRoom && chatRoom.size > 0) {
        this.io.to(message.chatId).emit('video:incoming-call', {
          from: message.from,
          to: message.to,
          channelName: message.channelName,
          chatId: message.chatId,
        });
        console.log('✅ Video call request also sent to', chatRoom.size, 'socket(s) in chat room');
      }
    } else {
      console.log('⚠️ Target user is offline or not registered:', message.to, 'room:', targetUserRoom);
      
      // Create missed call message immediately if user is offline
      if (message.chatId) {
        try {
          const missedCallMessage = await this.chatService.createMessage({
            chatId: message.chatId,
            senderId: message.to, // The offline user
            content: JSON.stringify({
              type: 'missed_video_call',
              callerId: message.from,
              receiverId: message.to,
              timestamp: new Date().toISOString(),
              reason: 'user_offline',
            }),
            type: 'TEXT',
          });
          
          // Broadcast missed call message to chat room
          this.io.to(message.chatId).emit('message', JSON.stringify({
            id: missedCallMessage.id,
            chatId: message.chatId,
            content: missedCallMessage.content,
            senderId: missedCallMessage.senderId,
            type: missedCallMessage.type,
            createdAt: missedCallMessage.createdAt,
          }));
          
          console.log('✅ Missed call message created (user offline):', missedCallMessage.id);
        } catch (error) {
          console.error('❌ Error creating missed call message:', error);
        }
      }
      
      // Notify caller that user is offline
      client.emit('video:user-offline', { userId: message.to });
    }
  }

  @SubscribeMessage('video:accept-call')
  async handleAcceptCallForVideoCall(
    @MessageBody() message: { from: string; to: string; channelName: string },
    @ConnectedSocket() client: Socket,
  ) {
    const callerRoom = `user:${message.from}`;
    console.log('✅ Video call accepted, notifying caller:', message.from, 'in room:', callerRoom);
    
    // Notify the caller that the call was accepted
    this.io.to(callerRoom).emit('video:call-accepted', {
      from: message.to,
      to: message.from,
      channelName: message.channelName,
    });
  }

  @SubscribeMessage('video:reject-call')
  async handleRejectCallForVideoCall(
    @MessageBody() message: { from: string; to: string; chatId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const callerRoom = `user:${message.from}`;
    console.log('❌ Video call rejected, notifying caller:', message.from);
    
    // Create missed call message in chat
    if (message.chatId) {
      try {
        const missedCallMessage = await this.chatService.createMessage({
          chatId: message.chatId,
          senderId: message.to, // The person who rejected (receiver)
          content: JSON.stringify({
            type: 'missed_video_call',
            callerId: message.from,
            receiverId: message.to,
            timestamp: new Date().toISOString(),
          }),
          type: 'TEXT',
        });
        
        // Broadcast missed call message to chat room
        this.io.to(message.chatId).emit('message', JSON.stringify({
          id: missedCallMessage.id,
          chatId: message.chatId,
          content: missedCallMessage.content,
          senderId: missedCallMessage.senderId,
          type: missedCallMessage.type,
          createdAt: missedCallMessage.createdAt,
        }));
        
        console.log('✅ Missed call message created:', missedCallMessage.id);
      } catch (error) {
        console.error('❌ Error creating missed call message:', error);
      }
    }
    
    // Notify the caller that the call was rejected
    this.io.to(callerRoom).emit('video:call-rejected', {
      from: message.to,
      to: message.from,
    });
  }

  @SubscribeMessage('video:end-call')
  async handleEndCallForVideoCall(
    @MessageBody() message: { from: string; to: string; chatId?: string; duration?: number },
    @ConnectedSocket() client: Socket,
  ) {
    const targetRoom = `user:${message.to}`;
    console.log('📴 Video call ended, notifying:', message.to, 'duration:', message.duration, 'chatId:', message.chatId);
    
    // Notify the other party that the call ended
    this.io.to(targetRoom).emit('video:call-ended', { 
      from: message.from,
      to: message.to,
      duration: message.duration,
    });
    
    // If call was connected and had duration, create a call completed message
    if (message.chatId && message.duration && message.duration > 0) {
      try {
        const callCompletedMessage = await this.chatService.createMessage({
          chatId: message.chatId,
          senderId: message.from, // The person who ended the call
          content: JSON.stringify({
            type: 'video_call_completed',
            callerId: message.from,
            receiverId: message.to,
            duration: message.duration,
            timestamp: new Date().toISOString(),
          }),
          type: 'TEXT',
        });
        
        // Broadcast call completed message to chat room
        this.io.to(message.chatId).emit('message', JSON.stringify({
          id: callCompletedMessage.id,
          chatId: message.chatId,
          content: callCompletedMessage.content,
          senderId: callCompletedMessage.senderId,
          type: callCompletedMessage.type,
          createdAt: callCompletedMessage.createdAt,
        }));
        
        console.log('✅ Call completed message created:', callCompletedMessage.id, 'duration:', message.duration);
      } catch (error) {
        console.error('❌ Error creating call completed message:', error);
      }
    }
    
    // If call was connected and had duration, we could log it (optional)
    if (message.duration && message.duration > 0) {
      console.log('📞 Call completed with duration:', message.duration, 'seconds');
    }
  }

  @SubscribeMessage('video:media-status')
  async handleMediaStatusForVideoCall(
    @MessageBody() message: { to: string; from: string; mic?: boolean; camera?: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const targetRoom = `user:${message.to}`;
    console.log('🎤 Video call media status update:', message);
    
    // Notify the other party about media status changes
    this.io.to(targetRoom).emit('video:media-status', {
      from: message.from,
      mic: message.mic,
      camera: message.camera,
    });
  }

  @SubscribeMessage('video:disconnect')
  async handleDisconnectForVideoCall(
    @MessageBody() message: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userRoom = `user:${message.userId}`;
    client.leave(userRoom);
    console.log('📹 User disconnected from video call room:', message.userId);
  }

  // WebRTC Signaling Handlers
  @SubscribeMessage('video:offer')
  async handleVideoOffer(
    @MessageBody() message: { from: string; to: string; offer: any },
    @ConnectedSocket() client: Socket,
  ) {
    const targetRoom = `user:${message.to}`;
    console.log('📤 WebRTC offer from:', message.from, 'to:', message.to);
    
    // Forward the offer to the target user
    this.io.to(targetRoom).emit('video:offer', {
      from: message.from,
      to: message.to,
      offer: message.offer,
    });
  }

  @SubscribeMessage('video:answer')
  async handleVideoAnswer(
    @MessageBody() message: { from: string; to: string; answer: any },
    @ConnectedSocket() client: Socket,
  ) {
    const targetRoom = `user:${message.to}`;
    console.log('📥 WebRTC answer from:', message.from, 'to:', message.to);
    
    // Forward the answer to the caller
    this.io.to(targetRoom).emit('video:answer', {
      from: message.from,
      to: message.to,
      answer: message.answer,
    });
  }

  @SubscribeMessage('video:ice-candidate')
  async handleIceCandidate(
    @MessageBody() message: { from: string; to: string; candidate: any },
    @ConnectedSocket() client: Socket,
  ) {
    const targetRoom = `user:${message.to}`;
    console.log('🧊 ICE candidate from:', message.from, 'to:', message.to);
    
    // Forward the ICE candidate to the other peer
    this.io.to(targetRoom).emit('video:ice-candidate', {
      from: message.from,
      to: message.to,
      candidate: message.candidate,
    });
  }
}
