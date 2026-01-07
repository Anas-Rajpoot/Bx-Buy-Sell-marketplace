import { HttpException, Injectable } from '@nestjs/common';
import { ChatLabelType, MessageType, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisAdapterService } from 'src/redis-adapter/redis-adapter.service';

@Injectable()
export class ChatService {
  constructor(
    private db: PrismaService,
    private redis: RedisAdapterService,
  ) {}

  async getChatRoom(userId: string, sellerId: string, listingId?: string) {
    // CRITICAL: Find ALL chat rooms between these users and merge their messages
    const whereConditions = [
      {
        AND: [
          { userId: userId },
          { sellerId: sellerId },
        ],
      },
      {
        AND: [
          { userId: sellerId },
          { sellerId: userId },
        ],
      }
    ];
    
    // Get ALL chat rooms between these users
    const allChatRooms = await this.db.chat.findMany({
      where: {
        OR: whereConditions,
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            profile_pic: true,
          },
        },
        seller: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            profile_pic: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
          include: {
            sender: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                profile_pic: true,
                role: true, // CRITICAL: Include role for admin messages
              },
            },
          },
        },
        listing: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    if (allChatRooms.length === 0) {
      return null;
    }

    // Get the most recent chat room as the primary one
    const primaryChatRoom = allChatRooms[0];
    
    // Merge ALL messages from ALL chat rooms
    const allMessages = allChatRooms.flatMap(room => 
      room.messages.map(msg => ({
        ...msg,
        chatId: room.id, // Keep original chatId for reference
      }))
    );

    // Sort all messages by creation date
    allMessages.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Return the primary chat room with ALL merged messages
    const mergedChatRoom = {
      ...primaryChatRoom,
      messages: allMessages,
      // Update updatedAt to the most recent message time
      updatedAt: allMessages.length > 0 
        ? new Date(allMessages[allMessages.length - 1].createdAt)
        : primaryChatRoom.updatedAt,
    };
    
    const chatRoom = mergedChatRoom;
    
    console.log('🔍 getChatRoom:', {
      userId,
      sellerId,
      listingId: listingId || 'none',
      found: !!chatRoom,
      chatRoomId: chatRoom?.id,
      chatRoomListingId: chatRoom?.listingId,
      messagesCount: chatRoom?.messages?.length || 0
    });
    
    return chatRoom;
  }

  async getChatRoomsBySellerId(sellerId: string) {
    return await this.db.chat.findMany({
      where: {
        sellerId: sellerId,
      },
    });
  }

  async getChatRoomsByUserId(userId: string) {
    return await this.db.chat.findMany({
      where: {
        userId: userId,
      },
    });
  }

  async createMessage(data: {
    chatId: string;
    senderId: string;
    content: string;
    type?: string;
    fileUrl?: string | null;
  }) {
    const { chatId, senderId, content } = data;

    console.log('💾 [ChatService.createMessage] called', {
      chatId,
      senderId,
      content,
      type: data.type,
      at: new Date().toISOString(),
    });

    // 1) Check if a very recent identical message already exists
    const now = new Date();
    const fewSecondsAgo = new Date(now.getTime() - 5000); // 5s window

    const existing = await this.db.message.findFirst({
      where: {
        chatId,
        senderId,
        content,
        createdAt: {
          gte: fewSecondsAgo,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (existing) {
      console.log('⚠️ [ChatService.createMessage] duplicate detected, returning existing message', {
        chatId,
        senderId,
        content,
        existingId: existing.id,
        existingCreatedAt: existing.createdAt,
      });
      return existing;
    }

    // 2) Create new message if not found
    const saved = await this.db.message.create({
      data: {
        chatId,
        senderId,
        content,
        type: (data.type as MessageType) ?? MessageType.TEXT,
        fileUrl: data.fileUrl ?? null,
        read: false,
      },
    });

    console.log('✅ [ChatService.createMessage] created new message', {
      id: saved.id,
      chatId,
      senderId,
      createdAt: saved.createdAt,
    });

    return saved;
  }

  async updateMessage(messageId: string, userId: string, content: string) {
    // First, verify the message exists and belongs to the user
    const message = await this.db.message.findUnique({
      where: { id: messageId },
      include: {
        chat: {
          select: { userId: true, sellerId: true },
        },
      },
    });

    if (!message) {
      throw new HttpException('Message not found', 404);
    }

    // Verify the user is the sender
    if (message.senderId !== userId) {
      throw new HttpException('You can only edit your own messages', 403);
    }

    // Update the message
    const updatedMessage = await this.db.message.update({
      where: { id: messageId },
      data: {
        content: content,
      },
      include: {
        sender: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            profile_pic: true,
          },
        },
      },
    });

    // Update chat room's updatedAt timestamp
    await this.db.chat.update({
      where: { id: message.chatId },
      data: { updatedAt: new Date() },
    });

    return updatedMessage;
  }

  async deleteMessage(messageId: string, userId: string) {
    // First, verify the message exists and belongs to the user
    const message = await this.db.message.findUnique({
      where: { id: messageId },
      include: {
        chat: {
          select: { userId: true, sellerId: true },
        },
      },
    });

    if (!message) {
      throw new HttpException('Message not found', 404);
    }

    // Verify the user is the sender
    if (message.senderId !== userId) {
      throw new HttpException('You can only delete your own messages', 403);
    }

    const chatId = message.chatId;

    // Delete the message
    await this.db.message.delete({
      where: { id: messageId },
    });

    // Update chat room's updatedAt timestamp
    await this.db.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    return { success: true, message: 'Message deleted successfully', chatId };
  }

  // Get all chats for admin
  async getAllChats() {
    try {
      console.log('📋 [getAllChats] Fetching all chats for admin dashboard...');
      
      // First, get total count
      const totalCount = await this.db.chat.count();
      console.log(`📊 Total chats in database: ${totalCount}`);
      
      // Fetch chats with all relations using include
      // Note: Using include instead of select for relations to ensure they're loaded
      const includeConfig = {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            profile_pic: true,
          },
        },
        seller: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            profile_pic: true,
          },
        },
        listing: {
          select: {
            id: true,
            status: true,
            portfolioLink: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: 'desc' as const,
          },
          select: {
            id: true,
            content: true,
            createdAt: true,
            senderId: true,
            read: true,
          },
        },
        chatLabels: {
          select: {
            label: true,
            userId: true,
          },
        },
        monitorViews: {
          select: {
            monitorId: true,
            viewedAt: true,
          },
        },
      } as const;

      type ChatWithIncludes = Prisma.ChatGetPayload<{
        include: typeof includeConfig;
      }>;

      const chats: ChatWithIncludes[] = await this.db.chat.findMany({
        include: includeConfig,
        orderBy: {
          updatedAt: 'desc',
        },
        // Don't filter here - we'll filter after to see what we get
      });

      console.log(`📥 Fetched ${chats.length} chats from database`);

      // Log details about each chat to debug
      if (chats.length > 0) {
        console.log('🔍 Chat details:');
        chats.forEach((chat, index) => {
          console.log(`  Chat ${index + 1}:`, {
            id: chat.id,
            userId: chat.userId,
            sellerId: chat.sellerId,
            hasUser: !!chat.user,
            hasSeller: !!chat.seller,
            userData: chat.user ? {
              id: chat.user.id,
              name: `${chat.user.first_name} ${chat.user.last_name}`,
            } : 'NULL',
            sellerData: chat.seller ? {
              id: chat.seller.id,
              name: `${chat.seller.first_name} ${chat.seller.last_name}`,
            } : 'NULL',
          });
        });
      }

      // Filter out chats with null user or seller
      // Type guard function to help TypeScript understand the filtered type
      type ChatWithValidRelations = ChatWithIncludes & {
        user: NonNullable<ChatWithIncludes['user']>;
        seller: NonNullable<ChatWithIncludes['seller']>;
      };

      const validChats = chats.filter((chat): chat is ChatWithValidRelations => {
        const isValid = chat.user !== null && chat.seller !== null;
        if (!isValid) {
          console.warn(`⚠️ Filtering out chat ${chat.id}:`, {
            userId: chat.userId,
            sellerId: chat.sellerId,
            userNull: chat.user === null,
            sellerNull: chat.seller === null,
          });
        }
        return isValid;
      });

      console.log(`✅ Found ${validChats.length} valid chats out of ${chats.length} total`);
      
      if (validChats.length < chats.length) {
        console.warn(`⚠️ Filtered out ${chats.length - validChats.length} chats with invalid user/seller references`);
        console.warn('💡 This might indicate:');
        console.warn('   1. User or seller accounts were deleted');
        console.warn('   2. Foreign key references are broken');
        console.warn('   3. Database integrity issues');
      }

      // Log sample chat structure for debugging
      if (validChats.length > 0) {
        console.log('📝 Sample chat structure:', {
          id: validChats[0].id,
          hasUser: !!validChats[0].user,
          hasSeller: !!validChats[0].seller,
          hasListing: !!validChats[0].listing,
          listingId: validChats[0].listing?.id,
          hasMessages: validChats[0].messages?.length > 0,
          messageCount: validChats[0].messages?.length || 0,
          hasMonitorViews: validChats[0].monitorViews?.length > 0,
        });
      }

      return validChats;
    } catch (error: any) {
      console.error('❌ Error fetching chats:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        meta: error?.meta,
        stack: error?.stack,
      });
      
      // Return empty array on error to prevent frontend crash
      return [];
    }
  }

  // Get all chats for monitor/admin dashboard (without filtering by current user)
  async getAllChatsForMonitor(recursiveCall = false) {
    try {
      if (!recursiveCall) {
        console.log('📋 [MONITOR] ========== START getAllChatsForMonitor ==========');
      }
      
      // 1) Get counts for logging
      const chatTableCount = await this.db.chat.count();
      const messageCount = await this.db.message.count();
      
      console.log(`📊 [MONITOR] Chat table count: ${chatTableCount}`);
      console.log(`📊 [MONITOR] Message count: ${messageCount}`);
      
      // 2) Fetch ALL chats from Chat table (primary source)
      // For MongoDB, fetch chats first without relations to avoid issues with missing foreign keys
      console.log('🔍 [MONITOR] Fetching chats from database...');
      
      // First, get all chats without relations (more reliable for MongoDB)
      const chatsRaw = await this.db.chat.findMany({
        orderBy: {
          updatedAt: 'desc', // Sort by latest activity
        },
      });

      console.log(`📥 [MONITOR] Fetched ${chatsRaw.length} raw chats from Chat table (without relations)`);

      // Now fetch related data for each chat separately
      const chats = await Promise.all(
        chatsRaw.map(async (chat) => {
          try {
            // Fetch user
            const user = await this.db.user.findUnique({
              where: { id: chat.userId },
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                profile_pic: true,
              },
            }).catch(() => null);

            // Fetch seller
            const seller = await this.db.user.findUnique({
              where: { id: chat.sellerId },
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                profile_pic: true,
              },
            }).catch(() => null);

            // Fetch listing if exists
            const listing = chat.listingId
              ? await this.db.listing.findUnique({
                  where: { id: chat.listingId },
                  select: {
                    id: true,
                    status: true,
                    portfolioLink: true,
                  },
                }).catch(() => null)
              : null;

            // Fetch latest message
            const messages = await this.db.message.findMany({
              where: { chatId: chat.id },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                id: true,
                content: true,
                createdAt: true,
                senderId: true,
                read: true,
                type: true,
              },
            }).catch(() => []);

            // Fetch chat label if exists (use findFirst since chatId alone is not unique)
            const chatLabel = await this.db.chatLabel.findFirst({
              where: { chatId: chat.id },
              select: {
                label: true,
                userId: true,
              },
            }).catch(() => null);

            // Fetch monitor views
            const monitorViews = await this.db.chatMonitor.findMany({
              where: { chatId: chat.id },
              select: {
                monitorId: true,
                viewedAt: true,
              },
            }).catch(() => []);

            return {
              ...chat,
              user,
              seller,
              listing,
              messages,
              chatLabel,
              monitorViews,
            };
          } catch (error) {
            console.error(`❌ [MONITOR] Error fetching relations for chat ${chat.id}:`, error);
            // Return chat with null relations rather than skipping it
            return {
              ...chat,
              user: null,
              seller: null,
              listing: null,
              messages: [],
              chatLabel: null,
              monitorViews: [],
            };
          }
        })
      );

      console.log(`✅ [MONITOR] Processed ${chats.length} chats with relations`);
      
      // Log each chat for debugging (limit to first 5 to avoid log spam)
      if (chats.length > 0) {
        console.log(`📋 [MONITOR] Sample chat details (showing first ${Math.min(5, chats.length)}):`);
        chats.slice(0, 5).forEach((chat, index) => {
          console.log(`  Chat ${index + 1}:`, {
            id: chat.id,
            userId: chat.userId,
            sellerId: chat.sellerId,
            hasUser: !!chat.user,
            hasSeller: !!chat.seller,
            userData: chat.user ? { id: chat.user.id, name: `${chat.user.first_name || ''} ${chat.user.last_name || ''}`.trim() || chat.user.email } : 'NULL',
            sellerData: chat.seller ? { id: chat.seller.id, name: `${chat.seller.first_name || ''} ${chat.seller.last_name || ''}`.trim() || chat.seller.email } : 'NULL',
            messageCount: chat.messages?.length || 0,
            updatedAt: chat.updatedAt,
          });
        });
        if (chats.length > 5) {
          console.log(`  ... and ${chats.length - 5} more chats`);
        }
      } else {
        console.log('⚠️ [MONITOR] NO CHATS FOUND IN DATABASE!');
        console.log('⚠️ [MONITOR] This could mean:');
        console.log('  1. No chats have been created yet');
        console.log('  2. Database connection issue');
        console.log('  3. All chats were deleted');
      }

      // 3) For admin view, include ALL chats regardless of null relations
      // We already fetched all relations above, so now we just filter out completely invalid chats
      const validChats = chats.filter(chat => {
        // Only filter out if both user AND seller data are missing (not even IDs exist)
        // This should never happen if chats are properly created, but just in case
        if (!chat.userId || !chat.sellerId) {
          console.warn(`⚠️ [MONITOR] Filtering out chat ${chat.id} - missing userId or sellerId`);
          return false;
        }
        
        // Log if we have null relations (but still include the chat)
        if (!chat.user || !chat.seller) {
          console.warn(`⚠️ [MONITOR] Chat ${chat.id} has null relation(s) but will be included:`, {
            userId: chat.userId,
            sellerId: chat.sellerId,
            userNull: chat.user === null,
            sellerNull: chat.seller === null,
          });
        }
        
        return true; // Include all chats that have IDs
      });

      console.log(`✅ [MONITOR] Found ${validChats.length} valid chats out of ${chats.length} total`);
      
      if (validChats.length < chats.length) {
        console.warn(`⚠️ [MONITOR] Filtered out ${chats.length - validChats.length} chats with invalid user/seller references`);
      }

      // 4) If no valid chats found, check if there are messages without chat rooms
      if (validChats.length === 0 && messageCount > 0) {
        console.log('⚠️ [MONITOR] No valid chats found, but messages exist. Checking for orphaned messages...');
        
        // Get unique chatIds from messages that don't have chat rooms (filter out nulls)
        const allMessagesForCheck = await this.db.message.findMany({
          select: { chatId: true },
        });
        const messagesWithChatIds = allMessagesForCheck.filter(m => m.chatId !== null);
        
        const uniqueChatIds = Array.from(
          new Set(messagesWithChatIds.map(m => m.chatId).filter(Boolean))
        ) as string[];
        
        console.log(`📊 [MONITOR] Found ${uniqueChatIds.length} unique chatIds in messages`);
        
        const existingChatIds = new Set(chats.map(c => c.id));
        const orphanedChatIds = uniqueChatIds.filter(id => !existingChatIds.has(id));
        
        if (orphanedChatIds.length > 0) {
          console.warn(`⚠️ [MONITOR] Found ${orphanedChatIds.length} chatIds in messages without chat rooms:`, orphanedChatIds.slice(0, 5));
          console.warn(`💡 [MONITOR] Attempting to create chat rooms from orphaned messages...`);
          
          // Try to create chat rooms from orphaned messages
          let createdCount = 0;
          for (const chatId of orphanedChatIds.slice(0, 10)) { // Limit to 10 to avoid performance issues
            try {
              // Get all messages for this chatId to find participants
              const chatMessages = await this.db.message.findMany({
                where: { chatId },
                include: {
                  sender: {
                    select: {
                      id: true,
                      role: true,
                    },
                  },
                },
                orderBy: { createdAt: 'asc' },
                take: 50,
              });
              
              if (chatMessages.length === 0) continue;
              
              // Get unique participants
              const participants = Array.from(
                new Map(chatMessages.map(m => [m.sender.id, m.sender])).values()
              );
              
              if (participants.length < 2) {
                console.warn(`⚠️ [MONITOR] Chat ${chatId} has less than 2 participants, skipping`);
                continue;
              }
              
              // Determine user and seller
              const user = participants.find(p => p.role === 'USER') || participants[0];
              const seller = participants.find(p => p.role === 'SELLER') || participants[1] || participants[0];
              
              // CRITICAL: Create chat room with the EXISTING chatId (not a new one)
              // For MongoDB with Prisma, we can set the id field directly
              try {
                // Check if chat already exists (race condition)
                const existing = await this.db.chat.findUnique({
                  where: { id: chatId },
                });
                
                if (existing) {
                  console.log(`ℹ️ [MONITOR] Chat room ${chatId} already exists (race condition)`);
                  createdCount++;
                  continue;
                }
                
                // Create chat room with the specific chatId from messages
                await this.db.chat.create({
                  data: {
                    id: chatId, // Use the existing chatId from messages
                    userId: user.id,
                    sellerId: seller.id,
                    status: 'ACTIVE',
                  },
                });
                
                createdCount++;
                console.log(`✅ [MONITOR] Created chat room ${chatId} from orphaned messages (user: ${user.id}, seller: ${seller.id})`);
              } catch (createError: any) {
                // If chat already exists (race condition), that's fine
                if (createError.code === 'P2002' || createError.message?.includes('duplicate') || createError.message?.includes('E11000')) {
                  console.log(`ℹ️ [MONITOR] Chat room ${chatId} already exists (race condition)`);
                  createdCount++;
                } else {
                  console.error(`❌ [MONITOR] Error creating chat room ${chatId}:`, {
                    error: createError.message,
                    code: createError.code,
                    user: user.id,
                    seller: seller.id,
                  });
                  throw createError;
                }
              }
            } catch (error) {
              console.error(`❌ [MONITOR] Failed to create chat room ${chatId}:`, error);
            }
          }
          
          if (createdCount > 0 && !recursiveCall) {
            console.log(`✅ [MONITOR] Created ${createdCount} chat rooms from orphaned messages. Refetching...`);
            // Recursively call to get the newly created chats (only once)
            return await this.getAllChatsForMonitor(true);
          }
        }
      }

      console.log(`✅ [MONITOR] Returning ${validChats.length} conversations`);
      console.log(`📊 [MONITOR] Final counts - Chat table: ${chatTableCount}, Messages: ${messageCount}, Valid chats: ${validChats.length}`);
      if (!recursiveCall) {
        console.log('📋 [MONITOR] ========== END getAllChatsForMonitor ==========');
      }
      
      return validChats;
    } catch (error: any) {
      console.error('❌ [MONITOR] Error fetching chats:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        meta: error?.meta,
        stack: error?.stack,
      });
      
      // Return empty array on error to prevent frontend crash
      return [];
    }
  }

  // Get chat by ID with full details
  async getChatById(chatId: string) {
    return await this.db.chat.findUnique({
      where: {
        id: chatId,
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            profile_pic: true,
          },
        },
        seller: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            profile_pic: true,
          },
        },
        listing: {
          select: {
            id: true,
            status: true,
            portfolioLink: true,
            created_at: true,
            updated_at: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
          include: {
            sender: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                profile_pic: true,
              },
            },
          },
        },
        chatLabels: {
          select: {
            label: true,
            userId: true,
          },
        },
        monitorViews: {
          select: {
            monitorId: true,
            viewedAt: true,
          },
        },
      },
    });
  }

  async getMangaedChatRoomsCountById(userId: string) {
    const count = await this.db.chatMonitor.count({
      where: {
        monitorId: userId,
      },
    });

    return {
      id: userId,
      count: count,
    };
  }

  async createChatRoom(userId: string, sellerId: string, listingId?: string) {
    // CRITICAL: Check if chat room exists first
    const existingRoom = await this.getChatRoom(userId, sellerId, listingId);
    
    console.log('🔍 Checking for existing chat room:', {
      userId,
      sellerId,
      listingId: listingId || 'none',
      found: !!existingRoom,
      existingRoomId: existingRoom?.id,
      existingRoomListingId: existingRoom?.listingId
    });
    
    if (existingRoom) {
      // If listingId provided and existing room doesn't have it, update it
      if (listingId && !existingRoom.listingId) {
        console.log('🔄 Updating existing chat room with listingId:', listingId);
        const updatedRoom = await this.db.chat.update({
          where: { id: existingRoom.id },
          data: { listingId: listingId },
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                profile_pic: true,
              },
            },
            seller: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                profile_pic: true,
              },
            },
            listing: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        });
        console.log('✅ Updated existing chat room with listingId:', updatedRoom.id);
        return updatedRoom;
      }
      
      console.log('✅ Chat room already exists, returning existing room:', existingRoom.id);
      return existingRoom;
    }

    // CRITICAL: Create new chat room with listingId if provided
    // This ensures each listing gets its own unique chat room
    console.log('🆕 Creating new chat room:', { 
      userId, 
      sellerId, 
      listingId: listingId || 'none (general chat)' 
    });
    
    const newChatRoom = await this.db.chat.create({
      data: {
        userId: userId,
        sellerId: sellerId,
        listingId: listingId || null, // Store listingId if provided
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            profile_pic: true,
          },
        },
        seller: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            profile_pic: true,
          },
        },
        listing: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });
    
    console.log('✅ Created new chat room:', {
      id: newChatRoom.id,
      userId: newChatRoom.userId,
      sellerId: newChatRoom.sellerId,
      listingId: newChatRoom.listingId
    });
    
    return newChatRoom;
  }

  async updateOfferStatus(chatId: string, isOffered: boolean) {
    return await this.db.chat.update({
      where: {
        id: chatId,
      },
      data: {
        isOffered: isOffered,
      },
    });
  }

  async updateChatLabelStatus(
    chatId: string,
    userId: string,
    label: ChatLabelType,
  ) {
    return await this.db.chatLabel.upsert({
      where: {
        chatId_userId: {
          chatId: chatId,
          userId: userId,
        },
      },
      create: {
        chatId: chatId,
        userId: userId,
        label: label,
      },
      update: {
        label: label,
      },
    });
  }

  async deleteChat(chatId: string, userId: string) {
    // Verify user is part of this chat before deleting
    const chat = await this.db.chat.findUnique({
      where: { id: chatId },
    });

    if (!chat) {
      throw new HttpException('Chat not found', 404);
    }

    if (chat.userId !== userId && chat.sellerId !== userId) {
      throw new HttpException('Unauthorized to delete this chat', 403);
    }

    // Delete all messages first
    await this.db.message.deleteMany({
      where: { chatId: chatId },
    });

    // Delete chat labels
    await this.db.chatLabel.deleteMany({
      where: { chatId: chatId },
    });

    // Delete chat monitors
    await this.db.chatMonitor.deleteMany({
      where: { chatId: chatId },
    });

    // Delete the chat room
    await this.db.chat.delete({
      where: { id: chatId },
    });
    
    // Return success response
    return { success: true, message: 'Chat deleted successfully' };
  }

  async archiveChat(chatId: string, userId: string) {
    // Verify user is part of this chat
    const chat = await this.db.chat.findUnique({
      where: { id: chatId },
    });

    if (!chat) {
      throw new HttpException('Chat not found', 404);
    }

    if (chat.userId !== userId && chat.sellerId !== userId) {
      throw new HttpException('Unauthorized to archive this chat', 403);
    }

    return await this.db.chat.update({
      where: { id: chatId },
      data: { status: 'ARCHIVED' },
    });
  }

  async unarchiveChat(chatId: string, userId: string) {
    // Verify user is part of this chat
    const chat = await this.db.chat.findUnique({
      where: { id: chatId },
    });

    if (!chat) {
      throw new HttpException('Chat not found', 404);
    }

    if (chat.userId !== userId && chat.sellerId !== userId) {
      throw new HttpException('Unauthorized to unarchive this chat', 403);
    }

    return await this.db.chat.update({
      where: { id: chatId },
      data: { status: 'ACTIVE' },
    });
  }

  async blockUser(blockerId: string, blockedUserId: string) {
    // For now, we'll use a simple approach: mark the chat as FLAGGED
    // In a production system, you'd want a separate UserBlock model
    // Find all chats between these users
    const chats = await this.db.chat.findMany({
      where: {
        OR: [
          { userId: blockerId, sellerId: blockedUserId },
          { userId: blockedUserId, sellerId: blockerId },
        ],
      },
    });

    // Mark all chats as FLAGGED (blocked)
    const updates = chats.map(chat =>
      this.db.chat.update({
        where: { id: chat.id },
        data: { status: 'FLAGGED' },
      })
    );

    await Promise.all(updates);
    return { success: true, message: 'User blocked successfully' };
  }

  async unblockUser(blockerId: string, blockedUserId: string) {
    // Find all chats between these users
    const chats = await this.db.chat.findMany({
      where: {
        OR: [
          { userId: blockerId, sellerId: blockedUserId },
          { userId: blockedUserId, sellerId: blockerId },
        ],
        status: 'FLAGGED',
      },
    });

    // Mark all chats as ACTIVE (unblocked)
    const updates = chats.map(chat =>
      this.db.chat.update({
        where: { id: chat.id },
        data: { status: 'ACTIVE' },
      })
    );

    await Promise.all(updates);
    return { success: true, message: 'User unblocked successfully' };
  }

  // -----------------------Video Call Specific---------------
  // Mark messages as read for a chat - marks across ALL chats with the same seller
  async markMessagesAsRead(chatId: string, userId: string) {
    // Verify user is part of this chat
    const chat = await this.db.chat.findUnique({
      where: { id: chatId },
    });

    if (!chat) {
      throw new HttpException('Chat not found', 404);
    }

    if (chat.userId !== userId && chat.sellerId !== userId) {
      throw new HttpException('Unauthorized to mark messages as read', 403);
    }

    // Get ALL chat rooms between these users
    const whereConditions = [
      {
        AND: [
          { userId: chat.userId },
          { sellerId: chat.sellerId },
        ],
      },
      {
        AND: [
          { userId: chat.sellerId },
          { sellerId: chat.userId },
        ],
      }
    ];

    const allChatRooms = await this.db.chat.findMany({
      where: {
        OR: whereConditions,
      },
      select: {
        id: true,
      },
    });

    // Get all chat IDs
    const allChatIds = allChatRooms.map(room => room.id);

    // Mark all unread messages from other users as read across ALL chats with this seller
    const updateResult = await this.db.message.updateMany({
      where: {
        chatId: { in: allChatIds }, // All chats with this seller
        senderId: { not: userId }, // Messages not from current user
        read: false, // Only update unread messages
      },
      data: {
        read: true,
      },
    });

    console.log(`✅ Marked ${updateResult.count} messages as read across ${allChatIds.length} chat(s) for user ${userId}`);

    return { success: true, message: 'Messages marked as read across all chats with this seller' };
  }

  // Assign monitor to chat
  async assignMonitorToChat(chatId: string, monitorId: string) {
    // Verify chat exists
    const chat = await this.db.chat.findUnique({
      where: { id: chatId },
    });

    if (!chat) {
      throw new HttpException('Chat not found', 404);
    }

    // Verify monitor exists and has correct role
    const monitor = await this.db.user.findUnique({
      where: { id: monitorId },
      select: { id: true, role: true },
    });

    if (!monitor) {
      throw new HttpException('Monitor not found', 404);
    }

    if (monitor.role !== 'ADMIN' && monitor.role !== 'MONITER') {
      throw new HttpException('User is not a monitor or admin', 403);
    }

    // Check if already assigned
    const existingAssignment = await this.db.chatMonitor.findFirst({
      where: { chatId, monitorId },
    });

    if (existingAssignment) {
      console.log(`ℹ️ Chat ${chatId} already assigned to monitor ${monitorId}`);
      return {
        success: true,
        message: 'Chat already assigned to this monitor',
        assignment: existingAssignment,
      };
    }

    // Create assignment
    const assignment = await this.db.chatMonitor.create({
      data: {
        chatId,
        monitorId,
        viewedAt: new Date(),
      },
    });

    console.log(`✅ Chat ${chatId} assigned to monitor ${monitorId}`);
    return {
      success: true,
      message: 'Chat assigned successfully',
      assignment,
    };
  }

  // Unassign monitor from chat
  async unassignMonitorFromChat(chatId: string, monitorId?: string) {
    // Verify chat exists
    const chat = await this.db.chat.findUnique({
      where: { id: chatId },
    });

    if (!chat) {
      throw new HttpException('Chat not found', 404);
    }

    // Delete assignment(s)
    const whereCondition: any = { chatId };
    if (monitorId) {
      whereCondition.monitorId = monitorId;
    }

    const deleteResult = await this.db.chatMonitor.deleteMany({
      where: whereCondition,
    });

    console.log(`🗑️ Unassigned ${deleteResult.count} entry/entries for chat ${chatId}${monitorId ? ` from monitor ${monitorId}` : ''}`);
    
    return {
      success: deleteResult.count > 0,
      message: deleteResult.count > 0 ? 'Chat unassigned successfully' : 'No assignment found to unassign',
      count: deleteResult.count,
    };
  }

  // Get assigned monitor for a chat
  async getAssignedMonitor(chatId: string) {
    const assignments = await this.db.chatMonitor.findMany({
      where: { chatId },
      include: {
        monitor: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            profile_pic: true,
            role: true,
          },
        },
      },
      orderBy: {
        viewedAt: 'desc',
      },
    });

    if (assignments.length === 0) {
      return {
        success: true,
        assigned: false,
        monitor: null,
      };
    }

    return {
      success: true,
      assigned: true,
      monitor: assignments[0].monitor,
      assignment: assignments[0],
      allAssignments: assignments,
    };
  }
}
