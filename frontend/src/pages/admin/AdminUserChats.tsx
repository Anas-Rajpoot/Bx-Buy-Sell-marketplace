import { useNavigate, useParams } from "react-router-dom";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Search, SlidersHorizontal, Archive, Video, MoreVertical, Send, Paperclip, Star, AlertCircle, Heart, Share2, Loader2 } from "lucide-react";
import { useUserConversations } from "@/hooks/useUserConversations";

export default function AdminUserChats() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: conversations, isLoading } = useUserConversations(id);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "just now";
    if (diffInHours < 24) return `${diffInHours}hr ago`;
    return `${Math.floor(diffInHours / 24)} day(s) ago`;
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AdminSidebar />
      
      <main className="flex-1 flex flex-col">
        <div className="border-b border-border bg-background">
          <div className="flex items-center justify-between px-8 py-4">
            <h1 className="text-2xl font-semibold">Users Chats</h1>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon">
                🔔
              </Button>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">Jhonson</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Conversations List */}
          <div className="w-80 border-r border-border bg-background">
            <div className="p-4 border-b border-border">
              <Button 
                variant="ghost" 
                className="mb-4 text-accent hover:text-accent w-full justify-start"
                onClick={() => navigate(`/admin/users/${id}`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                User Details
              </Button>
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search" className="pl-10 bg-muted/30 border-muted" />
                </div>
                <Button variant="outline" size="icon" className="border-muted">
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" className="w-full justify-start border-muted">
                <Archive className="h-4 w-4 mr-2" />
                Archived Chats
                <Badge variant="secondary" className="ml-auto">0</Badge>
              </Button>
            </div>
            <ScrollArea className="h-[calc(100vh-280px)]">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                </div>
              ) : !conversations || conversations.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-muted-foreground text-sm">No conversations found</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <div 
                    key={conv.id}
                    className="p-4 border-b border-border hover:bg-muted/5 cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <Avatar>
                          <AvatarFallback>
                            {conv.listing?.title?.[0] || "U"}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">
                            {conv.listing?.title || "Conversation"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(conv.updated_at)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {conv.last_message || "No messages yet"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </div>

          {/* Chat Window */}
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>EC</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">E-Commerce Store</h3>
                  <p className="text-sm text-muted-foreground">3 Members, 1 online</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                  <Search className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Video className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 p-6">
              <div className="space-y-4">
                <div className="flex flex-col items-start max-w-[70%]">
                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-sm mb-2"><strong>Key Players:</strong> Salah and Haaland in form scoring regularly.</p>
                    <p className="text-sm mb-2"><strong>Match Conditions:</strong> Ideal weather and key players available.</p>
                    <p className="text-sm"><strong>Conclusion:</strong> Bet on "Over 2.5 goals" with odds of 1.8 to maximize your winnings.</p>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">12 Nov 2025, 09:10 AM</span>
                </div>

                <div className="flex flex-col items-end max-w-[70%] ml-auto">
                  <div className="bg-blue-500 text-white rounded-lg p-4">
                    <p className="text-sm">How many goals will be scored in the Liverpool - Manchester City match?</p>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">12 Nov 2025, 09:10 AM</span>
                </div>

                <div className="flex flex-col items-start max-w-[70%]">
                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-start gap-2 mb-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">A</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xs font-medium">@Alex</p>
                        <Badge className="bg-accent text-black text-xs">Official EX-Support</Badge>
                      </div>
                    </div>
                    <p className="text-sm mb-2"><strong>Explanation:</strong></p>
                    <p className="text-sm mb-2"><strong>History:</strong> Average of 3.2 goals per match in the last 10 matches.</p>
                    <p className="text-sm mb-2"><strong>Current Form:</strong> Liverpool 1.6 goals/match at home, Man City 2 goals/match away.</p>
                    <p className="text-sm mb-2"><strong>Key Players:</strong> Salah and Haaland in form scoring regularly.</p>
                    <p className="text-sm mb-2"><strong>Match Conditions:</strong> Ideal weather and key players available.</p>
                    <p className="text-sm"><strong>Conclusion:</strong> Bet on "Over 2.5 goals" with odds of 1.8 to maximize your winnings.</p>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">12 Nov 2025, 09:10 AM</span>
                </div>
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Button variant="outline" size="icon">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input placeholder="Your message" className="flex-1 bg-muted/30 border-muted" />
                <Button className="bg-accent text-black hover:bg-accent/90">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Details Panel */}
          <div className="w-80 border-l border-border bg-background p-6">
            <h3 className="font-semibold mb-4">Details</h3>
            
            <div className="flex flex-col items-center mb-6">
              <Avatar className="h-20 w-20 mb-3">
                <AvatarFallback>OF</AvatarFallback>
              </Avatar>
              <h4 className="font-semibold">Online Fashion Store</h4>
              <p className="text-sm text-muted-foreground">3 Members, 1 online</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <span className="text-sm">📄</span>
                  </div>
                  <span className="text-sm">Docs, Link, Media</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">120</span>
                  <span>›</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-accent" />
                  <span className="text-sm">Label this chat</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-accent/20 text-accent border-accent/30">Good</Badge>
                  <span>›</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <span className="text-sm">Report chat</span>
                </div>
                <span>›</span>
              </div>
            </div>

            <Button className="w-full mt-6 bg-accent text-black hover:bg-accent/90">
              🎨 Make Offer
            </Button>

            <div className="mt-6">
              <h4 className="font-semibold mb-3">Listing Information</h4>
              <Card className="overflow-hidden border-border">
                <div className="relative aspect-video bg-muted">
                  <img src="/placeholder.svg" alt="Listing" className="w-full h-full object-cover" />
                  <Badge className="absolute top-2 left-2 bg-muted/90">Saas</Badge>
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7 bg-background/90">
                      <Heart className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 bg-background/90">
                      <Share2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="p-3">
                  <h5 className="font-medium mb-1">E-commerce Store</h5>
                  <p className="text-xs text-muted-foreground mb-2">
                    Easily manage your listings with images, pricing, status, and requests to optimize your selling experience.
                  </p>
                  <p className="text-lg font-bold">$12,000</p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
