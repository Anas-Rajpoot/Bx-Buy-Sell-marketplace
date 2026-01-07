import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import docIcon from "@/assets/doc.svg";
import labelIcon from "@/assets/label.svg";
import reportIcon from "@/assets/report.svg";
import handshakeIcon from "@/assets/fi_3585639.svg";

interface ChatDetailsProps {
  conversationId: string;
  userId?: string;
  sellerId?: string;
}

export const ChatDetails = ({ conversationId, userId, sellerId, onLabelUpdated }: ChatDetailsProps) => {
  const { user } = useAuth();
  const [listing, setListing] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [memberCount, setMemberCount] = useState(2);
  const [onlineCount, setOnlineCount] = useState(0);
  const [messages, setMessages] = useState<any[]>([]);
  const [mediaCount, setMediaCount] = useState(0);
  const [chatLabel, setChatLabel] = useState<'GOOD' | 'MEDIUM' | 'BAD' | null>(null);
  
  // Dialog states
  const [isMediaDialogOpen, setIsMediaDialogOpen] = useState(false);
  const [isLabelDialogOpen, setIsLabelDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);

  useEffect(() => {
    fetchDetails();
    if (userId && sellerId) {
      fetchMessages();
    }
  }, [conversationId, userId, sellerId]);

  const fetchDetails = async () => {
    try {
      // Try to get listing from chat room first (more reliable)
      if (userId && sellerId) {
        const chatResponse = await apiClient.getChatRoom(userId, sellerId);
        if (chatResponse.success && chatResponse.data) {
          const chatData = (chatResponse.data as any).data || chatResponse.data;
          
          // Get listing from chat room
          if (chatData?.listing) {
            setListing(chatData.listing);
          }

          // Get participants from chat room
          const buyer = chatData?.user;
          const seller = chatData?.seller;
          
          const buyerProfile = buyer ? {
            id: buyer.id,
            full_name: `${buyer.first_name || ''} ${buyer.last_name || ''}`.trim(),
            avatar_url: buyer.profile_pic,
            email: buyer.email,
            is_online: buyer.is_online || false,
          } : null;

          const sellerProfile = seller ? {
            id: seller.id,
            full_name: `${seller.first_name || ''} ${seller.last_name || ''}`.trim(),
            avatar_url: seller.profile_pic,
            email: seller.email,
            is_online: seller.is_online || false,
          } : null;

          setParticipants([buyerProfile, sellerProfile].filter(Boolean));
          return;
        }
      }

      // Fallback: Try getChatById
      const response = await apiClient.getChatById(conversationId);
      if (response.success && response.data) {
        const chat = (response.data as any).data || response.data;
        
        if (chat) {
          // Set listing if available
          if (chat.listing) {
            setListing(chat.listing);
          }

          // Get participants from chat (user and seller)
          const buyer = chat.user;
          const seller = chat.seller;
          
          const buyerProfile = buyer ? {
            id: buyer.id,
            full_name: `${buyer.first_name || ''} ${buyer.last_name || ''}`.trim(),
            avatar_url: buyer.profile_pic,
            email: buyer.email,
            is_online: buyer.is_online || false,
          } : null;

          const sellerProfile = seller ? {
            id: seller.id,
            full_name: `${seller.first_name || ''} ${seller.last_name || ''}`.trim(),
            avatar_url: seller.profile_pic,
            email: seller.email,
            is_online: seller.is_online || false,
          } : null;

          setParticipants([buyerProfile, sellerProfile].filter(Boolean));
        }
      }
    } catch (error) {
      console.error('Error fetching chat details:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      if (!userId || !sellerId) return;
      
      const response = await apiClient.getChatRoom(userId, sellerId);
      if (response.success && response.data) {
        const chatData = (response.data as any).data || response.data;
        const messagesData = chatData?.messages || [];
        setMessages(messagesData);

        // Get listing from chat room if available
        if (chatData?.listing && !listing) {
          setListing(chatData.listing);
        }

        // Get chat label if available
        if (chatData?.chatLabel && chatData.chatLabel.length > 0) {
          const label = chatData.chatLabel[0].label;
          if (label === 'GOOD' || label === 'MEDIUM' || label === 'BAD') {
            setChatLabel(label);
          }
        }

        // Extract unique participants from messages (including admin/support)
        const participantIds = new Set<string>();
        const participantMap = new Map<string, any>();

        // Add user and seller from chat data first (more reliable)
        if (chatData?.user) {
          const user = chatData.user;
          participantIds.add(user.id || userId);
          participantMap.set(user.id || userId, {
            id: user.id || userId,
            full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
            avatar_url: user.profile_pic,
            email: user.email,
            is_online: user.is_online || false,
          });
        }
        
        if (chatData?.seller) {
          const seller = chatData.seller;
          participantIds.add(seller.id || sellerId);
          participantMap.set(seller.id || sellerId, {
            id: seller.id || sellerId,
            full_name: `${seller.first_name || ''} ${seller.last_name || ''}`.trim(),
            avatar_url: seller.profile_pic,
            email: seller.email,
            is_online: seller.is_online || false,
          });
        }

        // Add participants from messages
        messagesData.forEach((msg: any) => {
          if (msg.senderId) {
            participantIds.add(msg.senderId);
            if (msg.sender && !participantMap.has(msg.senderId)) {
              participantMap.set(msg.senderId, {
                id: msg.sender.id || msg.senderId,
                full_name: `${msg.sender.first_name || ''} ${msg.sender.last_name || ''}`.trim(),
                avatar_url: msg.sender.profile_pic,
                email: msg.sender.email,
                role: msg.sender.role || msg.type,
                is_online: msg.sender.is_online || false,
              });
            }
          }
        });

        // Get all unique participants
        const allParticipants: any[] = [];
        participantIds.forEach(id => {
          const participant = participantMap.get(id);
          if (participant) {
            allParticipants.push(participant);
          }
        });

        // Update participants list (user, seller, and any admin/support)
        setParticipants(allParticipants);
        setMemberCount(participantIds.size);
        
        // Count online members
        const online = allParticipants.filter(p => p.is_online).length;
        setOnlineCount(online);

        // Extract media files (images and files)
        const mediaFiles = messagesData.filter((msg: any) => 
          msg.type === 'IMAGE' || msg.type === 'FILE' || msg.fileUrl
        ).map((msg: any) => ({
          id: msg.id,
          type: msg.type || (msg.fileUrl ? 'FILE' : 'IMAGE'),
          url: msg.fileUrl || msg.content,
          content: msg.content,
          createdAt: msg.createdAt,
          senderId: msg.senderId,
          sender: msg.sender,
        }));
        setMediaFiles(mediaFiles);
        setMediaCount(mediaFiles.length);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleLabelClick = () => {
    setIsLabelDialogOpen(true);
  };

  const handleMediaClick = () => {
    setIsMediaDialogOpen(true);
  };

  const handleReportClick = () => {
    setIsReportDialogOpen(true);
  };

  const handleLabelChange = async (label: 'GOOD' | 'MEDIUM' | 'BAD') => {
    try {
      if (!user?.id) {
        toast.error('User not found');
        return;
      }

      const response = await apiClient.updateChatLabel(conversationId, label, user.id);
      if (response.success) {
        setChatLabel(label);
        setIsLabelDialogOpen(false);
        toast.success(`Chat labeled as ${label === 'GOOD' ? 'Good' : label === 'MEDIUM' ? 'Medium' : 'Bad'}`);
        // Trigger refresh of conversation list to show updated label
        if (onLabelUpdated) {
          onLabelUpdated();
        }
      } else {
        toast.error(response.error || 'Failed to update label');
      }
    } catch (error) {
      console.error('Error updating label:', error);
      toast.error('Failed to update label');
    }
  };

  const handleReportSubmit = async () => {
    try {
      if (!reportReason.trim()) {
        toast.error('Please provide a reason for reporting');
        return;
      }

      // TODO: Implement report API call when available
      // For now, just show a success message
      toast.success('Report submitted successfully');
      setReportReason("");
      setIsReportDialogOpen(false);
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Failed to submit report');
    }
  };

  // Show loading only if we have no data at all
  if (participants.length === 0) {
    return (
      <div className="w-full bg-background flex items-center justify-center h-full">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full bg-background flex flex-col h-full overflow-y-auto p-4">
        {/* Details Heading - Top Left */}
        <h3 
          style={{
            fontFamily: 'Lufga',
            fontWeight: 600,
            fontSize: '18px',
            lineHeight: '100%',
            letterSpacing: '0%',
            color: 'rgba(0, 0, 0, 1)',
            margin: 0,
            marginBottom: '16px',
            textAlign: 'left',
          }}
        >
          Details
        </h3>
        
        {/* Profile Pictures Group - Centered */}
        <div className="flex items-center justify-center mb-4" style={{ gap: '-8px' }}>
          {participants.slice(0, 3).map((participant, i) => (
            <Avatar 
              key={participant.id} 
              className="border-2 border-white" 
              style={{ 
                width: '48px',
                height: '48px',
                marginLeft: i > 0 ? '-8px' : '0',
                zIndex: participants.length - i,
              }}
            >
              <AvatarImage src={participant.avatar_url} />
              <AvatarFallback style={{ fontSize: '16px' }}>
                {participant.full_name?.charAt(0) || participant.email?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>

        {/* Listing Title - Centered */}
        <h4 
          style={{
            fontFamily: 'Lufga',
            fontWeight: 600,
            fontSize: '24px',
            lineHeight: '100%',
            letterSpacing: '0%',
            color: 'rgba(0, 0, 0, 1)',
            textAlign: 'center',
            margin: 0,
            marginBottom: '8px',
          }}
        >
          {listing?.title || 'Online Fashion Store'}
        </h4>

        {/* Member Count and Online Status - Centered */}
        <p 
          style={{
            fontFamily: 'Lufga',
            fontWeight: 400,
            fontSize: '16px',
            lineHeight: '100%',
            letterSpacing: '0%',
            color: 'rgba(0, 0, 0, 0.5)',
            textAlign: 'center',
            margin: 0,
            marginBottom: '24px',
          }}
        >
          {memberCount} Members, {onlineCount} online
        </p>

        {/* Three Rows Section */}
        <div
          style={{
            width: '343px',
            minHeight: '192px',
            gap: '24px',
            padding: '12px',
            background: 'rgba(250, 250, 250, 1)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            marginBottom: '16px',
          }}
        >
          {/* First Row: Docs, Link, Media */}
          <div
            onClick={handleMediaClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '8px',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.02)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <img 
              src={docIcon} 
              alt="Docs" 
              style={{ 
                width: '40px', 
                height: '40px',
                flexShrink: 0,
              }} 
            />
            <span
              style={{
                fontFamily: 'Lufga',
                fontWeight: 500,
                fontSize: '16px',
                lineHeight: '100%',
                letterSpacing: '0%',
                color: 'rgba(0, 0, 0, 1)',
                flex: 1,
              }}
            >
            Docs, Link, Media
            </span>
            <div
              style={{
                width: '41px',
                height: '21px',
                borderRadius: '40px',
                gap: '10px',
                paddingTop: '2px',
                paddingRight: '10px',
                paddingBottom: '2px',
                paddingLeft: '10px',
                background: 'rgba(0, 0, 0, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontFamily: 'Lufga',
                  fontWeight: 500,
                  fontSize: '13px',
                  lineHeight: '100%',
                  letterSpacing: '0%',
                  textAlign: 'center',
                  color: 'rgba(0, 0, 0, 0.5)',
                }}
              >
                {mediaCount}
              </span>
            </div>
            <ChevronRight 
              className="w-5 h-5 text-black/50" 
              style={{ flexShrink: 0, marginLeft: '4px' }}
            />
          </div>

          {/* Second Row: Label this chat */}
          <div
            onClick={handleLabelClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '8px',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.02)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <img 
              src={labelIcon} 
              alt="Label" 
              style={{ 
                width: '40px', 
                height: '40px',
                flexShrink: 0,
              }} 
            />
            <span
              style={{
                fontFamily: 'Lufga',
                fontWeight: 500,
                fontSize: '16px',
                lineHeight: '100%',
                letterSpacing: '0%',
                color: 'rgba(0, 0, 0, 1)',
                flex: 1,
              }}
            >
            Label this chat
            </span>
            {chatLabel && (
              <div
                style={{
                  paddingTop: '2px',
                  paddingRight: '10px',
                  paddingBottom: '2px',
                  paddingLeft: '10px',
                  borderRadius: '40px',
                  backgroundColor: 
                    chatLabel === 'GOOD' ? 'rgba(34, 191, 21, 0.1)' :
                    chatLabel === 'MEDIUM' ? 'rgba(0, 103, 255, 0.05)' :
                    'rgba(255, 0, 0, 0.05)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  height: '21px',
                  minWidth: chatLabel === 'GOOD' ? '48px' : chatLabel === 'MEDIUM' ? '62px' : '40px',
                }}
              >
                <span
                  style={{
                    fontFamily: 'Lufga',
                    fontWeight: 500,
                    fontSize: '13px',
                    lineHeight: '100%',
                    letterSpacing: '0%',
                    textAlign: 'center',
                    color: 
                      chatLabel === 'GOOD' ? 'rgba(34, 191, 21, 1)' :
                      chatLabel === 'MEDIUM' ? 'rgba(0, 103, 255, 1)' :
                      'rgba(255, 0, 0, 1)',
                  }}
                >
                  {chatLabel === 'GOOD' ? 'Good' : chatLabel === 'MEDIUM' ? 'Medium' : 'Bad'}
                </span>
              </div>
            )}
            <ChevronRight 
              className="w-5 h-5 text-black/50" 
              style={{ flexShrink: 0, marginLeft: '4px' }}
            />
          </div>

          {/* Third Row: Report chat */}
          <div
            onClick={handleReportClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '8px',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.02)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <img 
              src={reportIcon} 
              alt="Report" 
              style={{ 
                width: '40px', 
                height: '40px',
                flexShrink: 0,
              }} 
            />
            <span
              style={{
                fontFamily: 'Lufga',
                fontWeight: 500,
                fontSize: '16px',
                lineHeight: '100%',
                letterSpacing: '0%',
                color: 'rgba(0, 0, 0, 1)',
                flex: 1,
              }}
            >
            Report chat
            </span>
            <ChevronRight 
              className="w-5 h-5 text-black/50" 
              style={{ flexShrink: 0, marginLeft: '4px' }}
            />
          </div>
        </div>

        {/* Make Offer Button */}
        <button
          style={{
            width: '343px',
            height: '50px',
            borderRadius: '62px',
            gap: '10px',
            padding: '10px',
            background: 'rgba(197, 253, 31, 1)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <img 
            src={handshakeIcon} 
            alt="Handshake" 
            style={{ 
              width: '32px', 
              height: '32px',
              flexShrink: 0,
            }} 
          />
          <span
            style={{
              fontFamily: 'Lufga',
              fontWeight: 500,
              fontSize: '20px',
              lineHeight: '140%',
              letterSpacing: '0%',
              color: 'rgba(0, 0, 0, 1)',
            }}
          >
          Make Offer
          </span>
        </button>
      </div>

      {/* Media Dialog */}
      <Dialog open={isMediaDialogOpen} onOpenChange={setIsMediaDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Docs, Links & Media ({mediaCount})</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {mediaFiles.length === 0 ? (
              <p className="text-muted-foreground col-span-full text-center py-8">
                No media files found in this chat
              </p>
            ) : (
              mediaFiles.map((file) => (
                <div key={file.id} className="border rounded-lg overflow-hidden">
                  {file.type === 'IMAGE' ? (
                    <img
                      src={file.url || file.content}
                      alt="Media"
                      className="w-full h-48 object-cover cursor-pointer"
                      onClick={() => window.open(file.url || file.content, '_blank')}
                    />
                  ) : (
                    <div className="w-full h-48 bg-muted flex items-center justify-center">
                      <a
                        href={file.url || file.content}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        {file.content || 'Download File'}
                      </a>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Label Dialog */}
      <Dialog open={isLabelDialogOpen} onOpenChange={setIsLabelDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Label this chat</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button
              variant={chatLabel === 'GOOD' ? 'default' : 'outline'}
              onClick={() => handleLabelChange('GOOD')}
              className="w-full justify-start h-12"
              style={{
                backgroundColor: chatLabel === 'GOOD' ? 'rgba(34, 191, 21, 0.1)' : 'transparent',
                borderColor: chatLabel === 'GOOD' ? 'rgba(34, 191, 21, 1)' : 'rgba(0, 0, 0, 0.2)',
                color: chatLabel === 'GOOD' ? 'rgba(34, 191, 21, 1)' : 'rgba(0, 0, 0, 1)',
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(34, 191, 21, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '12px',
                }}
              >
                <span style={{ color: 'rgba(34, 191, 21, 1)', fontSize: '12px' }}>✓</span>
              </div>
              Good
            </Button>
            <Button
              variant={chatLabel === 'MEDIUM' ? 'default' : 'outline'}
              onClick={() => handleLabelChange('MEDIUM')}
              className="w-full justify-start h-12"
              style={{
                backgroundColor: chatLabel === 'MEDIUM' ? 'rgba(0, 103, 255, 0.05)' : 'transparent',
                borderColor: chatLabel === 'MEDIUM' ? 'rgba(0, 103, 255, 1)' : 'rgba(0, 0, 0, 0.2)',
                color: chatLabel === 'MEDIUM' ? 'rgba(0, 103, 255, 1)' : 'rgba(0, 0, 0, 1)',
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(0, 103, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '12px',
                }}
              >
                <span style={{ color: 'rgba(0, 103, 255, 1)', fontSize: '12px' }}>✓</span>
              </div>
              Medium
            </Button>
            <Button
              variant={chatLabel === 'BAD' ? 'default' : 'outline'}
              onClick={() => handleLabelChange('BAD')}
              className="w-full justify-start h-12"
              style={{
                backgroundColor: chatLabel === 'BAD' ? 'rgba(255, 0, 0, 0.05)' : 'transparent',
                borderColor: chatLabel === 'BAD' ? 'rgba(255, 0, 0, 1)' : 'rgba(0, 0, 0, 0.2)',
                color: chatLabel === 'BAD' ? 'rgba(255, 0, 0, 1)' : 'rgba(0, 0, 0, 1)',
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 0, 0, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '12px',
                }}
              >
                <span style={{ color: 'rgba(255, 0, 0, 1)', fontSize: '12px' }}>✓</span>
              </div>
              Bad
            </Button>
            </div>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Report chat</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <label className="text-sm font-medium mb-2 block">
              Reason for reporting
            </label>
            <Textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Please describe the issue..."
              className="min-h-[120px]"
            />
            <div className="flex gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsReportDialogOpen(false);
                  setReportReason("");
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReportSubmit}
                className="flex-1"
                style={{
                  backgroundColor: 'rgba(225, 38, 38, 1)',
                  color: 'white',
                }}
              >
                Submit Report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
