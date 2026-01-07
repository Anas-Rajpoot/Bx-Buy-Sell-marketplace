import { useEffect, useState, useRef } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import filterIcon from "@/assets/filter.svg";
import archiveIcon from "@/assets/archive.svg";
import pinIcon from "@/assets/pin.svg";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api";
import { formatChatTime } from "@/lib/timeFormatter";
import { cn } from "@/lib/utils";
import { createSocketConnection, getWebSocketUrl } from "@/lib/socket";
import { Socket } from "socket.io-client";
import { toast } from "sonner";

interface ChatRoom {
  id: string;
  userId: string;
  sellerId: string;
  isOffered: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  messages?: Array<{
    id: string;
    content: string;
    senderId: string;
    read: boolean;
    createdAt: string;
  }>;
}

interface Conversation {
  id: string;
  userId: string;
  sellerId: string;
  listingId?: string | null; // CRITICAL: Include listingId to scope chats to specific listings
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar?: string;
  lastMessage?: string;
  lastMessageAt: string;
  unreadCount: number;
  isOnline?: boolean;
  isPinned?: boolean;
  isArchived: boolean;
  label?: 'GOOD' | 'MEDIUM' | 'BAD' | null;
}

interface ConversationListProps {
  selectedConversation: string | null;
  onSelectConversation: (id: string, userId: string, sellerId: string) => void;
  userId: string;
  refreshTrigger?: string | null; // Trigger refresh when conversation changes
  onConversationDeleted?: () => void; // Callback when conversation is deleted
}

export const ConversationList = ({ selectedConversation, onSelectConversation, userId, refreshTrigger, onConversationDeleted }: ConversationListProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    fetchConversations();
    
    // Set up WebSocket connection for real-time updates
    // NOTE: ConversationList socket does NOT join any rooms - it only listens for updates
    const wsUrl = getWebSocketUrl();
    console.log('🔌 ConversationList: Connecting to Socket.IO for real-time updates:', wsUrl);
    
    const socket = createSocketConnection({
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
    
    socketRef.current = socket;
    
    socket.on('connect', () => {
      console.log('✅ ConversationList: Socket.IO connected for real-time updates');
      
      // Register user for video calls (CRITICAL: must be done for all socket connections)
      // This ensures users receive video call notifications even when not in ChatWindow
      const authUser = JSON.parse(localStorage.getItem('user_data') || '{}');
      if (authUser?.id) {
        setTimeout(() => {
          socket.emit('video:register', { userId: authUser.id });
          console.log('📹 ConversationList: Registered user for video calls:', authUser.id);
        }, 100);
      }
      
      // CRITICAL: Do NOT join any rooms here - ConversationList should not receive messages
      // It only listens for message events to trigger conversation list refresh
    });
    
    // Also listen for incoming video calls to show notifications
    socket.removeAllListeners('video:incoming-call');
    socket.on('video:incoming-call', (data: { from: string; to: string; channelName: string; chatId: string }) => {
      console.log('📞 ConversationList: Received incoming video call from:', data.from, 'chatId:', data.chatId);
      
      // Show browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Incoming Video Call', {
          body: 'You have an incoming video call',
          icon: '/favicon.ico',
          tag: 'video-call',
          requireInteraction: true,
        });
      } else if ('Notification' in window && Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('Incoming Video Call', {
              body: 'You have an incoming video call',
              icon: '/favicon.ico',
              tag: 'video-call',
              requireInteraction: true,
            });
          }
        });
      }
      
      // Dispatch a custom event to notify Chat page to handle the incoming call
      // This allows the ChatWindow to show the incoming call dialog
      window.dispatchEvent(new CustomEvent('video:incoming-call', { 
        detail: data 
      }));
      
      // Also try to navigate to the chat if not already there
      if (window.location.pathname !== '/chat') {
        window.location.href = `/chat?chatId=${data.chatId}`;
      }
    });
    
    // Listen for new messages to update conversation list in real-time
    // NOTE: This socket is NOT in any room, so it receives ALL messages
    // We use this to refresh the conversation list when ANY message is sent
    socket.on('message', (data: string) => {
      try {
        const message = typeof data === 'string' ? JSON.parse(data) : data;
        console.log('📨 ConversationList: Received message event, refreshing list:', message.chatId);
        // Refresh conversation list when a new message arrives
        // Use debounce to avoid too many refreshes
        setTimeout(() => {
          fetchConversations();
        }, 500);
      } catch (error) {
        console.error('Error parsing message in ConversationList:', error);
      }
    });
    
    // REMOVED: 'message:recieve' listener - backend only emits 'message' event now
    // The 'message' listener above already handles refreshing the conversation list
    
    // Poll for new messages every 15 seconds as fallback
    const interval = setInterval(() => {
      fetchConversations();
    }, 15000);

    return () => {
      clearInterval(interval);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [userId]);

  // Refresh conversations when selected conversation changes (to update unread counts after marking as read)
  useEffect(() => {
    if (refreshTrigger) {
      console.log('🔄 Refresh trigger changed, refreshing conversations:', refreshTrigger);
      // Multiple refreshes to ensure unread counts update properly
      const timer1 = setTimeout(() => {
        fetchConversations();
      }, 800); // First refresh
      
      const timer2 = setTimeout(() => {
        fetchConversations();
      }, 2000); // Second refresh after mark-read should complete
      
      const timer3 = setTimeout(() => {
        fetchConversations();
      }, 4000); // Third refresh to catch any delayed updates
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [refreshTrigger, selectedConversation]);

  const fetchConversations = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      // Get chat rooms where user is buyer
      const buyerResponse = await apiClient.getChatRoomsByUserId(userId);
      // Get chat rooms where user is seller
      const sellerResponse = await apiClient.getChatRoomsBySellerId(userId);

      const buyerRooms: ChatRoom[] = buyerResponse.success && Array.isArray(buyerResponse.data) 
        ? buyerResponse.data 
        : [];
      const sellerRooms: ChatRoom[] = sellerResponse.success && Array.isArray(sellerResponse.data) 
        ? sellerResponse.data 
        : [];

      // Combine and deduplicate by room ID first
      const allRooms = [...buyerRooms, ...sellerRooms];
      const uniqueRoomsById = allRooms.filter((room, index, self) => 
        index === self.findIndex(r => r.id === room.id)
      );
      
      // CRITICAL: Merge all chats with the same seller into ONE conversation
      // Group by user pair ONLY (ignore listingId) - one conversation per seller
      const roomsBySeller = new Map<string, ChatRoom>();
      
      uniqueRoomsById.forEach(room => {
        // Create a normalized key based on user pair ONLY (not listingId)
        // Sort userId and sellerId to handle both directions (user is buyer or seller)
        // CRITICAL: Use sorted IDs to ensure same pair regardless of which is buyer/seller
        const sortedIds = [room.userId, room.sellerId].sort();
        const userPair = sortedIds.join('-');
        
        console.log(`Merging room ${room.id}: userId=${room.userId}, sellerId=${room.sellerId}, pair=${userPair}`);
        
        // If we already have a room with this seller, keep the one with the most recent updatedAt
        const existing = roomsBySeller.get(userPair);
        if (!existing || new Date(room.updatedAt || room.createdAt || 0) > new Date(existing.updatedAt || existing.createdAt || 0)) {
          roomsBySeller.set(userPair, room);
          console.log(`  → Selected room ${room.id} (updatedAt: ${room.updatedAt})`);
        } else {
          console.log(`  → Skipped room ${room.id} (older than ${existing.id})`);
        }
      });
      
      const uniqueRooms = Array.from(roomsBySeller.values());
      
      console.log(`✅ Final deduplication: ${uniqueRoomsById.length} rooms → ${uniqueRooms.length} unique conversations`);
      
      console.log('📊 Conversation deduplication:', {
        total: allRooms.length,
        afterIdDedup: uniqueRoomsById.length,
        afterPairDedup: uniqueRooms.length,
        duplicatesRemoved: allRooms.length - uniqueRooms.length,
        roomsBySellerKeys: Array.from(roomsBySeller.keys()),
        uniqueRoomsCount: uniqueRooms.length
      });
      
      // DEBUG: Log which rooms are being grouped
      uniqueRoomsById.forEach(room => {
        const userPair = [room.userId, room.sellerId].sort().join('-');
        console.log(`  Room ${room.id}: userId=${room.userId}, sellerId=${room.sellerId}, pair=${userPair}`);
      });

      // Fetch details for each conversation
      const conversationsWithDetails = await Promise.all(
        uniqueRooms.map(async (room) => {
          const otherUserId = room.userId === userId ? room.sellerId : room.userId;
          
          // Get other user details
          const userResponse = await apiClient.getUserById(otherUserId);
          const otherUser = userResponse.success && userResponse.data 
            ? userResponse.data 
            : null;

          const firstName = otherUser?.first_name || '';
          const lastName = otherUser?.last_name || '';
          const fullName = `${firstName} ${lastName}`.trim() || otherUser?.email || 'Unknown User';

          // Get ALL messages from ALL chat rooms with this seller (merged)
          const chatResponse = await apiClient.getChatRoom(room.userId, room.sellerId);

          let lastMessage = '';
          let lastMessageAt = room.updatedAt;
          let unreadCount = 0;

          // Extract messages - handle both wrapped and direct responses
          const chatData = chatResponse.data?.data || chatResponse.data;
          const messages = chatResponse.success && chatData?.messages
            ? (Array.isArray(chatData.messages) ? chatData.messages : [])
            : [];
            
          // Extract label from chat data - filter by current userId since labels are per user
          // Label could be: chatData.label, chatData.chatLabel (array), or room.label
          let label: 'GOOD' | 'MEDIUM' | 'BAD' | null = null;
          
          // First check if there's a direct label property
          if (chatData?.label) {
            label = chatData.label;
          } 
          // Check chatLabel array - filter by current userId to get this user's label
          else if (chatData?.chatLabel && Array.isArray(chatData.chatLabel) && chatData.chatLabel.length > 0) {
            // Find the label for the current user
            const userLabel = chatData.chatLabel.find((l: any) => l.userId === userId);
            if (userLabel && userLabel.label) {
              label = userLabel.label;
            } else if (chatData.chatLabel.length > 0 && chatData.chatLabel[0].label) {
              // Fallback to first label if no user-specific label found
              label = chatData.chatLabel[0].label;
            }
          } 
          // Check room label as fallback
          else if ((room as any).label) {
            label = (room as any).label;
          }
          
          // Normalize label to ensure it's one of the valid values
          if (label && (label === 'GOOD' || label === 'MEDIUM' || label === 'BAD')) {
            // Label is valid
          } else {
            label = null;
          }
          
          console.log('🏷️ Label extraction:', { 
            roomId: room.id, 
            userId: userId,
            chatDataLabel: chatData?.label, 
            chatDataChatLabel: chatData?.chatLabel,
            userSpecificLabel: chatData?.chatLabel?.find((l: any) => l.userId === userId),
            roomLabel: (room as any).label, 
            finalLabel: label 
          });
            
          if (messages.length > 0) {
            // Sort by creation date (most recent first)
            const sortedMessages = [...messages].sort((a, b) => 
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            
            // Get last message (most recent)
            const lastMsg = sortedMessages[0];
            lastMessage = lastMsg?.content || '';
            lastMessageAt = lastMsg?.createdAt || room.updatedAt;
            
            // Count ALL unread messages across ALL chats with this seller
            // CRITICAL: Always set unread to 0 if this conversation is currently selected (user is viewing it)
            const isSelected = selectedConversation === room.id || selectedConversation === chatData?.id;
            
            if (isSelected) {
              // Force unread count to 0 for selected conversation
              unreadCount = 0;
              console.log(`  ✅ Conversation with ${fullName} is SELECTED - forcing unread count to 0`);
            } else {
              // Only count messages that are explicitly unread (false, null, or undefined)
              unreadCount = messages.filter(msg => 
                msg.senderId !== userId && 
                (msg.read === false || msg.read === null || msg.read === undefined)
              ).length;
            }
            
            console.log(`  Conversation with ${fullName}: ${messages.length} total messages, ${unreadCount} unread (selected: ${isSelected}, roomId: ${room.id}, selectedId: ${selectedConversation})`);
          } else {
            console.log(`  Conversation with ${fullName}: No messages`);
            unreadCount = 0; // No messages = no unread
          }

          return {
            id: room.id, // Use the most recent chat room's ID as the conversation ID
            userId: room.userId,
            sellerId: room.sellerId,
            listingId: null, // Not used - merged conversation
            otherUserId,
            otherUserName: fullName,
            otherUserAvatar: otherUser?.profile_pic,
            lastMessage,
            lastMessageAt,
            unreadCount,
            label: label && (label === 'GOOD' || label === 'MEDIUM' || label === 'BAD') ? label : null,
            isArchived: room.status === 'ARCHIVED',
          };
        })
      );

      // Sort by last message time
      conversationsWithDetails.sort((a, b) => 
        new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      );

      setConversations(conversationsWithDetails);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter(convo => 
    convo.isArchived === showArchived &&
    (convo.otherUserName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading && conversations.length === 0) {
    return (
      <div className="w-full bg-background flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground text-sm">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-background flex flex-col h-full" style={{ padding: '15px', boxSizing: 'border-box' }}>
      {/* Search and Filter Container */}
      <div 
        style={{
          width: '100%',
          height: '47px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxSizing: 'border-box',
        }}
      >
        {/* Search Field */}
        <div
          className="flex-1"
          style={{
            position: 'relative',
            height: '42px',
            display: 'flex',
            alignItems: 'center',
            paddingTop: '11px',
            paddingRight: '14px',
            paddingBottom: '11px',
            paddingLeft: '14px',
            gap: '8px',
            borderRadius: '50px',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            backgroundColor: 'rgba(250, 250, 250, 1)',
            boxSizing: 'border-box',
          }}
        >
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: 'rgba(0, 0, 0, 0.5)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 border-none outline-none bg-transparent text-base lg:text-[13px] xl:text-base text-black/50"
            style={{
              fontFamily: 'Lufga',
              fontWeight: 400,
              lineHeight: '100%',
              letterSpacing: '0%',
            }}
          />
        </div>

        {/* Filter Icon Button */}
        <button
          type="button"
          style={{
            width: '42px',
            height: '42px',
            padding: '0',
            borderRadius: '50px',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            backgroundColor: 'rgba(250, 250, 250, 1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            boxSizing: 'border-box',
          }}
        >
          <img 
            src={filterIcon} 
            alt="Filter" 
            style={{ 
              width: '18px', 
              height: '18px',
            }} 
          />
        </button>
      </div>

      {/* Archived Chats Toggle */}
      <div
        style={{
          marginTop: '16px',
          width: '343px',
          height: '45px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px',
          borderRadius: '50px',
          cursor: 'pointer',
        }}
        onClick={() => setShowArchived(!showArchived)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img 
            src={archiveIcon} 
            alt="Archive" 
            style={{ 
              width: '20px', 
              height: '20px',
              flexShrink: 0,
            }} 
          />
          <span
            className="text-base lg:text-[13px] xl:text-base text-black"
            style={{
              fontFamily: 'Lufga',
              fontWeight: 500,
              lineHeight: '100%',
              letterSpacing: '0%',
            }}
          >
            Archived Chats
          </span>
        </div>
        <div
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '100px',
            backgroundColor: 'rgba(165, 165, 165, 1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontFamily: 'Lufga',
              fontWeight: 600,
              fontSize: '10px',
              lineHeight: '100%',
              letterSpacing: '0%',
              color: 'rgba(250, 250, 250, 1)',
            }}
          >
            {conversations.filter(c => c.isArchived).length}
          </span>
        </div>
      </div>

      {/* Conversations List */}
      <div 
        className="flex-1 overflow-y-auto w-full"
        style={{
          marginTop: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        {filteredConversations.map((convo) => {
          const isUnread = convo.unreadCount > 0 && selectedConversation !== convo.id;
          const truncateMessage = (text: string, maxLength: number = 40) => {
            if (!text) return 'No messages yet';
            return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
          };

          return (
            <div
              key={convo.id}
              onClick={() => {
                onSelectConversation(convo.id, convo.userId, convo.sellerId);
              }}
              className={cn(
                "w-full flex items-center transition-colors cursor-pointer group relative h-[70px] lg:h-[60px] xl:h-[70px]"
              )}
              style={{
                paddingTop: '10px',
                paddingRight: '12px',
                paddingBottom: '10px',
                paddingLeft: '12px',
                gap: '10px',
                backgroundColor: selectedConversation === convo.id ? 'rgba(239, 239, 239, 1)' : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (selectedConversation !== convo.id) {
                  e.currentTarget.style.backgroundColor = 'rgba(239, 239, 239, 1)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedConversation !== convo.id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {/* First Section: Profile Image with Status */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                  <Avatar 
                  className="w-11 h-11 lg:w-10 lg:h-10 xl:w-11 xl:h-11"
                  style={{
                    borderRadius: '20px',
                  }}
                >
                  <AvatarImage src={convo.otherUserAvatar} />
                  <AvatarFallback className="text-sm lg:text-[11px] xl:text-sm">
                    {convo.otherUserName.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                {/* Online Status Indicator */}
                {convo.isOnline && (
                  <div
                    className="absolute bottom-0 right-0 w-3 h-3 lg:w-2.5 lg:h-2.5 xl:w-3 xl:h-3 rounded-full bg-green-500 border-2 border-white z-[1]"
                  />
                )}
              </div>

              {/* Second Section: User Name and Last Message */}
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h4
                    className="text-base lg:text-xs xl:text-base text-black m-0 overflow-hidden text-ellipsis whitespace-nowrap"
                    style={{
                      fontFamily: 'Lufga',
                      fontWeight: 600,
                      lineHeight: '100%',
                      letterSpacing: '0%',
                    }}
                  >
                    {convo.otherUserName}
                  </h4>
                  {convo.label && (
                    <div
                      style={{
                        paddingTop: '2px',
                        paddingRight: '10px',
                        paddingBottom: '2px',
                        paddingLeft: '10px',
                        borderRadius: '40px',
                        backgroundColor: 
                          convo.label === 'GOOD' ? 'rgba(34, 191, 21, 0.1)' :
                          convo.label === 'MEDIUM' ? 'rgba(0, 103, 255, 0.05)' :
                          'rgba(255, 0, 0, 0.05)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        height: '18px',
                        width: convo.label === 'GOOD' ? '48px' : convo.label === 'MEDIUM' ? '62px' : '40px',
                      }}
                    >
                      <span
                        className="text-xs lg:text-[10px] xl:text-xs text-center"
                        style={{
                          fontFamily: 'Lufga',
                          fontWeight: 500,
                          lineHeight: '100%',
                          letterSpacing: '0%',
                          color: 
                            convo.label === 'GOOD' ? 'rgba(34, 191, 21, 1)' :
                            convo.label === 'MEDIUM' ? 'rgba(0, 103, 255, 1)' :
                            'rgba(255, 0, 0, 1)',
                        }}
                      >
                        {convo.label === 'GOOD' ? 'Good' : convo.label === 'MEDIUM' ? 'Medium' : 'Bad'}
                      </span>
                    </div>
                  )}
                </div>
                <p
                  className="text-xs lg:text-[10px] xl:text-xs m-0 overflow-hidden text-ellipsis whitespace-nowrap"
                  style={{
                    fontFamily: 'Lufga',
                    fontWeight: 500,
                    lineHeight: '100%',
                    letterSpacing: '0%',
                    color: isUnread ? 'rgba(0, 0, 0, 0.9)' : 'rgba(0, 0, 0, 0.6)',
                  }}
                >
                  {truncateMessage(convo.lastMessage || 'No messages yet')}
                </p>
              </div>

              {/* Third Section: Time, Notification Badge, and Pin Icon */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: '4px',
                  flexShrink: 0,
                }}
              >
                <span
                  className="text-xs lg:text-[9px] xl:text-xs text-black/60 whitespace-nowrap"
                  style={{
                    fontFamily: 'Lufga',
                    fontWeight: 500,
                    lineHeight: '100%',
                    letterSpacing: '0%',
                  }}
                >
                  {formatChatTime(convo.lastMessageAt)}
                </span>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {isUnread && (
                    <div
                      style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '100px',
                      background: 'linear-gradient(168.64deg, #FE4A23 7.17%, #FF4590 91.64%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'Lufga',
                        fontWeight: 600,
                        fontSize: '9px',
                        lineHeight: '100%',
                        letterSpacing: '0%',
                        color: 'rgba(250, 250, 250, 1)',
                      }}
                    >
                      {convo.unreadCount}
                    </span>
                    </div>
                  )}
                  {convo.isPinned && (
                    <img
                      src={pinIcon}
                      alt="Pinned"
                      style={{
                      width: '14px',
                      height: '14px',
                      flexShrink: 0,
                    }}
                  />
                )}
              </div>
              </div>
            </div>
          );
        })}

        {filteredConversations.length === 0 && !loading && (
          <div className="p-8 text-center text-muted-foreground">
            <p>No conversations yet</p>
          </div>
        )}
      </div>
    </div>
  );
};
