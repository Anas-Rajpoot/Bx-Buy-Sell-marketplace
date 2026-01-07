import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ListingsSidebar } from "@/components/listings/ListingsSidebar";
import { DashboardHeader } from "@/components/listings/DashboardHeader";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { ChatDetails } from "@/components/chat/ChatDetails";
import { MessageSquare, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api";

const Chat = () => {
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [chatRoomData, setChatRoomData] = useState<{ userId: string; sellerId: string; listingId?: string } | null>(null);
  const [hasConversations, setHasConversations] = useState(false);
  const [urlParamsProcessed, setUrlParamsProcessed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const initializeChat = async () => {
      if (!authLoading) {
        if (!user) {
          navigate("/login");
          return;
        }
        
        // Check if chatId is provided in URL params (from Contact Seller button)
        const chatId = searchParams.get('chatId');
        const userId = searchParams.get('userId');
        const sellerId = searchParams.get('sellerId');
        // No longer using listingId - merged conversations
        
        if (chatId && userId && sellerId && !urlParamsProcessed) {
          console.log('📥 Processing URL params:', { chatId, userId, sellerId });
          
          // Auto-select the conversation from URL params (merged conversation)
          setSelectedConversation(chatId);
          setChatRoomData({ userId, sellerId });
          setHasConversations(true);
          setUrlParamsProcessed(true);
          
          // Trigger refresh of conversation list to update unread counts after chat loads
          setTimeout(() => checkConversations(), 2000);
          
          // Clear URL params AFTER ChatWindow has mounted and processed them
          // Use a delay to ensure ChatWindow has time to initialize
          setTimeout(() => {
            navigate('/chat', { replace: true });
          }, 1000);
        } else if (!urlParamsProcessed) {
          // No URL params, check for existing conversations
          await checkConversations();
          setUrlParamsProcessed(true);
        }
        
        setLoading(false);
      }
    };
    
    initializeChat();
  }, [user, authLoading, navigate, searchParams, urlParamsProcessed]);


  
  const checkConversations = async () => {
    if (!user?.id) return;

    try {
      // Get chat rooms where user is buyer
      const buyerResponse = await apiClient.getChatRoomsByUserId(user.id);
      // Get chat rooms where user is seller
      const sellerResponse = await apiClient.getChatRoomsBySellerId(user.id);

      const buyerRooms = buyerResponse.success && Array.isArray(buyerResponse.data) 
        ? buyerResponse.data 
        : [];
      const sellerRooms = sellerResponse.success && Array.isArray(sellerResponse.data) 
        ? sellerResponse.data 
        : [];

      // Combine and deduplicate
      const allRooms = [...buyerRooms, ...sellerRooms];
      const uniqueRooms = allRooms.filter((room, index, self) => 
        index === self.findIndex(r => r.id === room.id)
      );

      // Sort by updatedAt to get most recent first
      uniqueRooms.sort((a, b) => 
        new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()
      );

      setHasConversations(uniqueRooms.length > 0);
      
      // If no conversation is selected and we have conversations, auto-select the first (most recent) one
      if (!selectedConversation && uniqueRooms.length > 0) {
        const firstRoom = uniqueRooms[0];
        console.log('🔄 Auto-selecting first conversation:', { 
          id: firstRoom.id, 
          userId: firstRoom.userId, 
          sellerId: firstRoom.sellerId
        });
        setSelectedConversation(firstRoom.id);
        setChatRoomData({ 
          userId: firstRoom.userId, 
          sellerId: firstRoom.sellerId
        });
      }
    } catch (error) {
      console.error('Error checking conversations:', error);
      setHasConversations(false);
    }
  };

  if (loading || authLoading) {
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

  if (!hasConversations && !selectedConversation) {
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
              onSelectConversation={(id, userId, sellerId) => {
                console.log('📥 Conversation selected:', { id, userId, sellerId });
                setSelectedConversation(id);
                // Don't pass listingId - show merged conversation with all messages
                setChatRoomData({ userId, sellerId });
                // Refresh conversations multiple times to ensure unread counts update
                checkConversations(); // Immediate refresh to update UI
                setTimeout(() => checkConversations(), 500);
                setTimeout(() => checkConversations(), 1500);
                setTimeout(() => checkConversations(), 3000);
                setTimeout(() => checkConversations(), 5000);
              }}
              userId={user.id}
              refreshTrigger={selectedConversation} // Trigger refresh when conversation changes
              onConversationDeleted={() => {
                // If deleted conversation was selected, clear selection
                setSelectedConversation(null);
                setChatRoomData(null);
              }}
              key={selectedConversation} // Force re-render when conversation changes
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
                <ChatWindow 
                  conversationId={selectedConversation} 
                  currentUserId={user.id}
                  userId={chatRoomData.userId}
                  sellerId={chatRoomData.sellerId}
                  refreshConversations={checkConversations}
                />
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
              className="hidden 2xl:flex flex-col flex-shrink-0 w-full 2xl:w-[383px]"
              style={{
                height: '100%',
                maxHeight: '100%',
                borderRadius: '20px',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                backgroundColor: 'rgba(255, 255, 255, 1)',
                overflow: 'hidden',
              }}
            >
              <ChatDetails 
                conversationId={selectedConversation} 
                userId={chatRoomData.userId}
                sellerId={chatRoomData.sellerId}
                onLabelUpdated={checkConversations}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
