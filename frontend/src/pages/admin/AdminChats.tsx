import { useState } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminConversationList } from "@/components/admin/chat/AdminConversationList";
import { AdminChatWindow } from "@/components/admin/chat/AdminChatWindow";
import { AdminChatDetails } from "@/components/admin/chat/AdminChatDetails";

const AdminChats = () => {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  return (
    <div className="flex bg-background" style={{ height: '100vh', maxHeight: '100vh', overflow: 'hidden' }}>
      <AdminSidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden w-full min-w-0" style={{ height: '100vh', maxHeight: '100vh', overflow: 'hidden' }}>
        <AdminHeader />

        {/* Main Content */}
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
              ${selectedConversationId ? 'hidden md:flex' : 'flex'} 
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
            <AdminConversationList 
              selectedConversationId={selectedConversationId}
              onSelectConversation={setSelectedConversationId}
            />
          </div>

          {/* Second Div - Chat Window */}
          {selectedConversationId ? (
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
              <AdminChatWindow conversationId={selectedConversationId} />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm sm:text-base p-4" style={{ borderRadius: '20px', border: '1px solid rgba(0, 0, 0, 0.1)', backgroundColor: 'rgba(255, 255, 255, 1)' }}>
              Select a conversation to view messages
            </div>
          )}

          {/* Third Div - Chat Details */}
          {selectedConversationId && (
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
              <AdminChatDetails conversationId={selectedConversationId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminChats;
