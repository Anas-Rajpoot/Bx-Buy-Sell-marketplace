import { lazy, Suspense, useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ListingsSidebar } from "@/components/listings/ListingsSidebar";
import { DashboardHeader } from "@/components/listings/DashboardHeader";
import { ConversationList } from "@/components/chat/ConversationList";
import { MessageSquare, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api";

const ChatWindow = lazy(() =>
  import("@/components/chat/ChatWindow").then((m) => ({ default: m.ChatWindow }))
);
const ChatDetails = lazy(() =>
  import("@/components/chat/ChatDetails").then((m) => ({ default: m.ChatDetails }))
);

const ChatPaneLoader = () => (
  <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm sm:text-base p-4">
    Loading chat...
  </div>
);

const Chat = () => {
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [chatRoomData, setChatRoomData] = useState<{ userId: string; sellerId: string; listingId?: string } | null>(null);
  const [urlParamsProcessed, setUrlParamsProcessed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [listRefreshToken, setListRefreshToken] = useState(0);
  const navigate = useNavigate();
  const userId = user?.id;

  const handleSelectConversation = useCallback(
    (id: string, userId: string, sellerId: string) => {
      setSelectedConversation(id);
      setChatRoomData({ userId, sellerId });
    },
    [],
  );

  const handleConversationDeleted = useCallback(() => {
    setSelectedConversation(null);
    setChatRoomData(null);
  }, []);

  // Fetch the user's chat rooms through React Query so the result is CACHED.
  // Navigating away and back shows the conversations instantly (refreshed in the
  // background) instead of a full-screen "Loading..." spinner on every visit.
  const {
    data: rooms = [],
    isLoading: roomsLoading,
    refetch: refetchRooms,
  } = useQuery({
    queryKey: ["chat-rooms", userId],
    enabled: !authLoading && !!userId,
    queryFn: async () => {
      if (!userId) return [];
      // Rooms where the user is the buyer or the seller, fetched in parallel.
      const [buyerResponse, sellerResponse] = await Promise.all([
        apiClient.getChatRoomsByUserId(userId),
        apiClient.getChatRoomsBySellerId(userId),
      ]);

      const buyerRooms = buyerResponse.success && Array.isArray(buyerResponse.data)
        ? buyerResponse.data
        : [];
      const sellerRooms = sellerResponse.success && Array.isArray(sellerResponse.data)
        ? sellerResponse.data
        : [];

      // Combine, deduplicate, and sort newest-first.
      const allRooms = [...buyerRooms, ...sellerRooms];
      const uniqueRooms = allRooms.filter((room, index, self) =>
        index === self.findIndex((r) => r.id === room.id)
      );
      uniqueRooms.sort((a, b) =>
        new Date(b.updatedAt || b.createdAt || 0).getTime() -
        new Date(a.updatedAt || a.createdAt || 0).getTime()
      );
      return uniqueRooms;
    },
  });

  // Let child panes (ChatWindow / ChatDetails) refresh the room list on demand.
  const checkConversations = useCallback(async () => {
    await refetchRooms();
  }, [refetchRooms]);

  // Redirect unauthenticated users to login.
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [authLoading, user, navigate]);

  // Deep-link from the "Contact Seller" button: auto-select that conversation.
  useEffect(() => {
    if (authLoading || !user || urlParamsProcessed) return;

    const chatId = searchParams.get("chatId");
    const paramUserId = searchParams.get("userId");
    const sellerId = searchParams.get("sellerId");

    if (chatId && paramUserId && sellerId) {
      setSelectedConversation(chatId);
      setChatRoomData({ userId: paramUserId, sellerId });
      setUrlParamsProcessed(true);
      const timer = setTimeout(() => navigate("/chat", { replace: true }), 1000);
      return () => clearTimeout(timer);
    }

    setUrlParamsProcessed(true);
  }, [authLoading, user, urlParamsProcessed, searchParams, navigate]);

  // Once rooms load, auto-select the most recent conversation if none is chosen.
  useEffect(() => {
    if (!selectedConversation && rooms.length > 0) {
      const firstRoom = rooms[0];
      setSelectedConversation(firstRoom.id);
      setChatRoomData({ userId: firstRoom.userId, sellerId: firstRoom.sellerId });
    }
  }, [rooms, selectedConversation]);

  const hasConversations = rooms.length > 0 || !!selectedConversation;

  // Only the (instant, localStorage-based) auth check gates the whole screen.
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Show the full-page empty state only once we KNOW (rooms finished loading)
  // there are none. While rooms are still loading we fall through to the chat
  // layout, where the conversation list renders its own (cache-seeded) state —
  // no blocking page-level spinner, so the shell appears immediately.
  if (!roomsLoading && !hasConversations && !selectedConversation) {
    return (
      <div className="flex min-h-screen bg-background">
        {/* Sidebar handled in DashboardHeader for Chat tab */}

        <div className="flex-1 flex flex-col w-full overflow-hidden">
          {/* Header - Shared across all tabs */}
          <DashboardHeader sidebarOpen={sidebarOpen} onSidebarOpenChange={setSidebarOpen} />

          {/* Empty State Content */}
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <MessageSquare className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Messages</h1>
              <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">
                Your conversations with buyers and sellers will appear here. Start connecting to begin messaging.
              </p>
              <Button
                onClick={() => navigate("/")}
                className="bg-[#D3FC50] text-black hover:bg-[#D3FC50]/90 rounded-full text-sm sm:text-base"
              >
                Browse Listings
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-background" style={{ height: '100vh', maxHeight: '100vh', overflow: 'hidden' }}>
      {/* Sidebar - Always drawer in Chat tab (no fixed sidebar) */}

        <div className="flex-1 flex flex-col w-full overflow-hidden" style={{ height: '100vh', maxHeight: '100vh', overflow: 'hidden' }}>
        {/* Header - Shared across all tabs */}
        <DashboardHeader sidebarOpen={sidebarOpen} onSidebarOpenChange={setSidebarOpen} />

        {/* Main Content Area */}
        <div 
          className="flex-1 flex flex-col md:flex-row overflow-hidden gap-2 sm:gap-2.5 md:gap-3 p-3 sm:p-4 md:p-6 lg:p-8 2xl:justify-center 2xl:px-4" 
          style={{ 
            height: 'calc(100vh - 64px)',
            maxHeight: 'calc(100vh - 64px)',
            overflowY: 'hidden',
          }}
        >
          {/* First Div - Conversation List */}
          <div
            className={`
              ${selectedConversation ? 'hidden md:flex' : 'flex'} 
              flex-col w-full md:w-[280px] lg:w-[300px] xl:w-[320px] flex-shrink-0
            `}
            style={{
              height: '100%',
              maxHeight: '100%',
              borderRadius: '20px',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              backgroundColor: 'rgba(255, 255, 255, 1)',
              overflow: 'hidden',
            }}
          >
              <ConversationList 
              selectedConversation={selectedConversation}
              onSelectConversation={handleSelectConversation}
              userId={user.id}
                refreshTrigger={`${selectedConversation || ""}-${listRefreshToken}`} // Trigger refresh when conversation changes or label updates
              onConversationDeleted={handleConversationDeleted}
            />
          </div>
        
          {/* Second Div - Chat Window */}
          {selectedConversation && chatRoomData ? (
            <div
              className="flex flex-col overflow-hidden relative flex-1 min-w-0 w-full md:w-auto"
              data-desktop-width="688px"
              style={{
                height: '100%',
                maxHeight: '100%',
                borderRadius: '20px',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                backgroundColor: 'rgba(255, 255, 255, 1)',
              }}
            >
              {/* Mobile Back Button */}
              <button
                onClick={() => {
                  setSelectedConversation(null);
                  setChatRoomData(null);
                }}
                className="md:hidden absolute top-4 left-4 z-10 w-10 h-10 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-background shadow-lg border border-border"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="flex-1 flex overflow-hidden" style={{ borderRadius: '20px' }}>
                <Suspense fallback={<ChatPaneLoader />}>
                  <ChatWindow 
                    conversationId={selectedConversation} 
                    currentUserId={user.id}
                    userId={chatRoomData.userId}
                    sellerId={chatRoomData.sellerId}
                    refreshConversations={checkConversations}
                  />
                </Suspense>
              </div>
            </div>
          ) : (
            <div
              className="hidden md:flex items-center justify-center flex-1 min-w-0"
              style={{
                height: '100%',
                maxHeight: '100%',
                borderRadius: '20px',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                backgroundColor: 'rgba(255, 255, 255, 1)',
              }}
            >
              <div className="text-center max-w-md px-4">
                <MessageSquare className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-base sm:text-lg md:text-xl font-semibold mb-2">Select a conversation</h2>
                <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
                  Choose a conversation from the list to start messaging
                </p>
              </div>
            </div>
          )}

          {/* Third Div - Chat Details */}
          {selectedConversation && chatRoomData && (
            <div
              className="hidden xl:flex flex-col flex-shrink-0 w-full xl:w-[320px] 2xl:w-[383px]"
              style={{
                height: '100%',
                maxHeight: '100%',
                borderRadius: '20px',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                backgroundColor: 'rgba(255, 255, 255, 1)',
                overflow: 'hidden',
              }}
            >
              <Suspense fallback={<ChatPaneLoader />}>
                <ChatDetails 
                  conversationId={selectedConversation} 
                  userId={chatRoomData.userId}
                  sellerId={chatRoomData.sellerId}
                  onLabelUpdated={() => {
                    setListRefreshToken((prev) => prev + 1);
                    checkConversations();
                  }}
                />
              </Suspense>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
