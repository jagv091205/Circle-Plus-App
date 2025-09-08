import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { User } from "@supabase/supabase-js";
import { ArrowLeftIcon, PaperAirplaneIcon, MagnifyingGlassIcon, UserIcon } from "@heroicons/react/24/outline";
import Navbar from "../Layout/Navbar";

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface Conversation {
  id: string;
  last_message_at: string;
  participants: Profile[];
  last_message_content?: string;
  unread_count: number;
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  profiles: Profile;
}

interface Circle {
  id: string;
  name: string;
  description: string | null;
}

interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: {
    id?: string;
    conversation_id?: string;
    sender_id?: string;
    content?: string;
    created_at?: string;
    [key: string]: any;
  };
  old?: {
    id?: string;
    conversation_id?: string;
    sender_id?: string;
    content?: string;
    created_at?: string;
    [key: string]: any;
  };
}

const Messages = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { conversationId } = useParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [circleMembers, setCircleMembers] = useState<Profile[]>([]);
  const [allCircleMembers, setAllCircleMembers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCircle, setSelectedCircle] = useState<Circle | null>(null);
  const [membersLoading, setMembersLoading] = useState(false);
  const [realtimeChannel, setRealtimeChannel] = useState<any>(null);
  const [conversationsChannel, setConversationsChannel] = useState<any>(null);
  const [showCircleSelector, setShowCircleSelector] = useState(false);
  const [userCircles, setUserCircles] = useState<Circle[]>([]);

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-focus message input when conversation is selected
  useEffect(() => {
    if (conversationId && messageInputRef.current) {
      setTimeout(() => {
        messageInputRef.current?.focus();
      }, 100);
    }
  }, [conversationId]);

  // Debug logging
  console.log("=== MESSAGES COMPONENT DEBUG ===");
  console.log("Current URL:", window.location.href);
  console.log("Location search:", location.search);
  console.log("Search params:", Object.fromEntries(searchParams.entries()));
  console.log("Conversation ID from params:", conversationId);

  // Get user on component mount
  useEffect(() => {
    const initializeUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        
        if (!user) {
          console.log("No user found, redirecting to login");
          navigate("/login");
          return;
        }
        
        console.log("User loaded:", user.id);
        setUser(user);
      } catch (error) {
        console.error("Error getting user:", error);
        navigate("/login");
      }
    };

    initializeUser();
  }, [navigate]);

  // Load user's circles
  useEffect(() => {
    const loadUserCircles = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("circle_members")
          .select(`
            circles:circle_id(
              id,
              name,
              description
            )
          `)
          .eq("profile_id", user.id)
          .eq("status", "active");

        if (error) {
          console.error("Error fetching user circles:", error);
          return;
        }

        const circles = (data || [])
          .filter(item => item.circles)
          .map((item: any) => item.circles);
        
        console.log("User circles loaded:", circles);
        setUserCircles(circles);
      } catch (error) {
        console.error("Error in loadUserCircles:", error);
      }
    };

    loadUserCircles();
  }, [user]);

  // Handle startWith parameter and circle detection
  useEffect(() => {
    const detectCircleAndHandleStartWith = async () => {
      if (!user) return;

      // Check for startWith parameter first
      const startWithUserId = searchParams.get('startWith');
      if (startWithUserId) {
        console.log("Starting conversation with user:", startWithUserId);
        await startConversation(startWithUserId);
        return;
      }

      // Method 1: Check URL search params for circleId
      const circleIdFromUrl = searchParams.get('circleId');
      console.log("Circle ID from URL params:", circleIdFromUrl);

      // Method 2: Check URL hash (if you're using hash routing)
      const urlHash = window.location.hash;
      const hashCircleId = urlHash.includes('circleId=') 
        ? urlHash.split('circleId=')[1]?.split('&')[0] 
        : null;
      console.log("Circle ID from URL hash:", hashCircleId);

      // Method 3: Check location state (if passed via navigate)
      const stateCircleId = location.state?.circleId;
      console.log("Circle ID from location state:", stateCircleId);

      // Method 4: Check localStorage (fallback)
      const storageCircleId = localStorage.getItem('currentCircleId');
      console.log("Circle ID from localStorage:", storageCircleId);

      // Priority order: URL params > Hash > State > LocalStorage
      const circleId = circleIdFromUrl || hashCircleId || stateCircleId || storageCircleId;
      
      if (circleId) {
        console.log("Using circle ID:", circleId);
        await loadCircleData(circleId);
      } else {
        console.log("No circle ID found, showing regular conversations");
        setSelectedCircle(null);
        await loadConversations();
      }
    };

    detectCircleAndHandleStartWith();
  }, [user, location.search, location.state, searchParams]);

  // Handle conversation selection
  useEffect(() => {
    if (conversationId && user) {
      handleConversationSelect(conversationId);
    }
  }, [conversationId, user]);

  // Set up global realtime subscriptions
  useEffect(() => {
    if (!user) return;

    console.log("Setting up global realtime subscriptions");

    // Subscribe to all conversations for this user
    const conversationsChannel = supabase
      .channel(`user-conversations:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'direct_messages',
        },
        async (payload: RealtimePayload) => {
          console.log("Global message event:", payload);
          
          // Safely access conversation_id with proper type checking
          const conversationIdFromPayload = payload.new?.conversation_id || payload.old?.conversation_id;
          
          if (!conversationIdFromPayload) {
            console.log("No conversation_id in payload, skipping");
            return;
          }
          
          // Check if this message is for a conversation the user is part of
          const { data: isParticipant } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('conversation_id', conversationIdFromPayload)
            .eq('user_id', user.id)
            .single();

          if (isParticipant) {
            // Refresh conversations to update last message
            loadConversations();
            
            // If this is the current conversation, handle the message
            if (conversationIdFromPayload === conversationId) {
              if (payload.eventType === 'INSERT' && payload.new?.id) {
                // Fetch complete message with profile data
                const { data } = await supabase
                  .from("direct_messages")
                  .select(`
                    *,
                    profiles:sender_id(id, username, avatar_url)
                  `)
                  .eq("id", payload.new.id)
                  .single();

                if (data) {
                  setMessages(prev => {
                    // Prevent duplicates
                    const exists = prev.some(msg => msg.id === data.id);
                    if (exists) return prev;
                    return [...prev, data];
                  });
                }
              }
            }
          }
        }
      )
      .subscribe();

    setConversationsChannel(conversationsChannel);

    return () => {
      conversationsChannel.unsubscribe();
    };
  }, [user, conversationId]);

  const loadCircleData = async (circleId: string) => {
    try {
      console.log("Loading circle data for:", circleId);
      
      // Fetch circle info
      const { data: circleData, error: circleError } = await supabase
        .from('circles')
        .select('id, name, description')
        .eq('id', circleId)
        .single();

      if (circleError) {
        console.error("Error fetching circle:", circleError);
        return;
      }

      console.log("Circle data:", circleData);
      setSelectedCircle(circleData);

      // Store in localStorage for persistence
      localStorage.setItem('currentCircleId', circleId);

      // Fetch circle members
      await loadCircleMembers(circleId);
    } catch (error) {
      console.error("Error in loadCircleData:", error);
    }
  };

  const loadCircleMembers = async (circleId: string) => {
    if (!user) return;
    
    setMembersLoading(true);
    console.log("Loading members for circle:", circleId);
    
    try {
      // Get all active members including the current user to verify membership
      const { data: allMembers, error: allMembersError } = await supabase
        .from("circle_members")
        .select(`
          profile_id,
          profiles:profile_id(
            id,
            username,
            avatar_url
          )
        `)
        .eq("circle_id", circleId)
        .eq("status", "active");

      console.log("All circle members query result:", { data: allMembers, error: allMembersError });

      if (allMembersError) {
        console.error("Error fetching circle members:", allMembersError);
        return;
      }

      if (allMembers && allMembers.length > 0) {
        // Separate current user from other members
        const otherMembers: Profile[] = [];
        let currentUserIsMember = false;

        allMembers.forEach((member: any) => {
          if (member.profiles) {
            if (member.profiles.id === user.id) {
              currentUserIsMember = true;
            } else {
              otherMembers.push({
                id: member.profiles.id,
                username: member.profiles.username,
                avatar_url: member.profiles.avatar_url,
              });
            }
          }
        });
        
        console.log("Current user is member:", currentUserIsMember);
        console.log("Other members:", otherMembers);
        
        if (!currentUserIsMember) {
          console.log("Current user is not a member of this circle");
          // You might want to redirect or show an error here
        }
        
        setAllCircleMembers(otherMembers);
        setCircleMembers(otherMembers);
      } else {
        console.log("No members found in circle");
        setAllCircleMembers([]);
        setCircleMembers([]);
      }
    } catch (error) {
      console.error("Error in loadCircleMembers:", error);
      setAllCircleMembers([]);
      setCircleMembers([]);
    } finally {
      setMembersLoading(false);
    }
  };

  // Filter members when search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setCircleMembers(allCircleMembers);
    } else {
      const filtered = allCircleMembers.filter(member =>
        member.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setCircleMembers(filtered);
    }
  }, [searchQuery, allCircleMembers]);

  const loadConversations = async () => {
    if (!user) return;

    console.log("Loading conversations for user:", user.id);
    
    try {
      // Get user's conversation IDs
      const { data: userConversations, error } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching user conversations:", error);
        return;
      }

      if (!userConversations || userConversations.length === 0) {
        console.log("No conversations found for user");
        setConversations([]);
        return;
      }

      const conversationIds = userConversations.map(uc => uc.conversation_id);
      console.log("User conversation IDs:", conversationIds);

      // Get conversation details
      const { data: convData, error: convError } = await supabase
        .from("conversations")
        .select("*")
        .in("id", conversationIds)
        .order("last_message_at", { ascending: false });

      if (convError) {
        console.error("Error fetching conversations:", convError);
        return;
      }

      // Build conversations with participants
      const conversationsWithParticipants: Conversation[] = [];

      for (const conv of convData || []) {
        try {
          // Get other participants (exclude current user)
          const { data: participants, error: partError } = await supabase
            .from("conversation_participants")
            .select(`
              user_id,
              profiles:user_id(id, username, avatar_url)
            `)
            .eq("conversation_id", conv.id)
            .neq("user_id", user.id);

          if (partError) {
            console.error("Error fetching participants for conv", conv.id, partError);
            continue;
          }

          // Get last message
          const { data: lastMessage } = await supabase
            .from("direct_messages")
            .select("content")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const otherParticipants = (participants || [])
            .filter((p: any) => p.profiles)
            .map((p: any) => ({
              id: p.profiles.id,
              username: p.profiles.username,
              avatar_url: p.profiles.avatar_url,
            }));

          conversationsWithParticipants.push({
            id: conv.id,
            last_message_at: conv.last_message_at,
            participants: otherParticipants,
            last_message_content: lastMessage?.content,
            unread_count: 0,
          });
        } catch (error) {
          console.error("Error processing conversation:", conv.id, error);
        }
      }

      console.log("Loaded conversations:", conversationsWithParticipants);
      setConversations(conversationsWithParticipants);
    } catch (error) {
      console.error("Error in loadConversations:", error);
    }
  };

  const handleConversationSelect = async (convId: string) => {
    console.log("Selecting conversation:", convId);
    
    // Clean up existing message subscription
    if (realtimeChannel) {
      await realtimeChannel.unsubscribe();
    }

    // Find conversation in current list
    const conversation = conversations.find(conv => conv.id === convId);
    setSelectedConversation(conversation || null);

    // Load messages
    await loadMessages(convId);

    // Set up conversation-specific realtime subscription
    const channel = setupConversationSubscription(convId);
    setRealtimeChannel(channel);
  };

  const loadMessages = async (convId: string) => {
    try {
      console.log("Loading messages for conversation:", convId);
      
      const { data, error } = await supabase
        .from("direct_messages")
        .select(`
          *,
          profiles:sender_id(id, username, avatar_url)
        `)
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        return;
      }

      console.log("Loaded messages:", data);
      setMessages(data || []);
    } catch (error) {
      console.error("Error in loadMessages:", error);
    }
  };

  const setupConversationSubscription = (convId: string) => {
    console.log("Setting up conversation subscription for:", convId);
    
    return supabase
      .channel(`conversation:${convId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `conversation_id=eq.${convId}`
        },
        async (payload: RealtimePayload) => {
          console.log("New message in conversation:", payload.new);
          
          if (!payload.new?.id) return;

          // Fetch complete message with profile data
          const { data } = await supabase
            .from("direct_messages")
            .select(`
              *,
              profiles:sender_id(id, username, avatar_url)
            `)
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setMessages(prev => {
              // Prevent duplicates
              const exists = prev.some(msg => msg.id === data.id);
              if (exists) return prev;
              return [...prev, data];
            });
          }
        }
      )
      .subscribe((status) => {
        console.log("Conversation subscription status:", status);
      });
  };

  const startConversation = async (targetUserId: string) => {
    if (!user) {
      console.error("No user found when trying to start conversation");
      return;
    }

    console.log("Starting conversation with user:", targetUserId);
    
    try {
      // Check for existing conversation
      const { data: myConversations, error: myConvError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (myConvError) {
        console.error("Error fetching user conversations:", myConvError);
        return;
      }

      console.log("User's existing conversations:", myConversations);

      if (myConversations && myConversations.length > 0) {
        for (const conv of myConversations) {
          const { data: participants, error: partError } = await supabase
            .from("conversation_participants")
            .select("user_id")
            .eq("conversation_id", conv.conversation_id);

          if (partError) {
            console.error("Error fetching participants:", partError);
            continue;
          }

          if (participants && participants.length === 2) {
            const userIds = participants.map(p => p.user_id);
            if (userIds.includes(targetUserId)) {
              console.log("Found existing conversation:", conv.conversation_id);
              navigate(`/messages/${conv.conversation_id}`);
              return;
            }
          }
        }
      }

      // Create new conversation
      console.log("Creating new conversation");
      const { data: newConv, error: convError } = await supabase
        .from("conversations")
        .insert({
          last_message_at: new Date().toISOString()
        })
        .select()
        .single();

      if (convError) {
        console.error("Error creating conversation:", convError);
        throw convError;
      }

      // Add participants
      const { error: partError } = await supabase
        .from("conversation_participants")
        .insert([
          { conversation_id: newConv.id, user_id: user.id },
          { conversation_id: newConv.id, user_id: targetUserId }
        ]);

      if (partError) {
        console.error("Error adding participants:", partError);
        throw partError;
      }

      console.log("Created new conversation:", newConv.id);
      
      // Navigate to new conversation
      navigate(`/messages/${newConv.id}`);
      
      // Refresh conversations list
      await loadConversations();
      
    } catch (error) {
      console.error("Error starting conversation:", error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId || !user) return;

    setIsLoading(true);
    try {
      console.log("Sending message:", newMessage.trim());
      
      const { data, error } = await supabase
        .from("direct_messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: newMessage.trim()
        })
        .select(`
          *,
          profiles:sender_id(id, username, avatar_url)
        `)
        .single();

      if (error) throw error;

      // Optimistically add to UI immediately
      setMessages(prev => [...prev, data]);
      
      // Update conversation timestamp
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);

      setNewMessage("");
      console.log("Message sent successfully");
      
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      if (realtimeChannel) {
        realtimeChannel.unsubscribe();
      }
      if (conversationsChannel) {
        conversationsChannel.unsubscribe();
      }
    };
  }, [realtimeChannel, conversationsChannel]);

  return (
    <div className="flex flex-col h-screen bg-white">
      <Navbar onLogout={() => {}} user={user} onPostClick={() => {}} />
      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="w-1/4 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b flex items-center">
            <button
              onClick={() => navigate("/home")}
              className="mr-4 p-2 rounded-full hover:bg-gray-100"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-semibold flex-1">
              {selectedCircle ? `${selectedCircle.name} Chat` : "Messages"}
            </h1>
            {!selectedCircle && userCircles.length > 0 && (
              <button
                onClick={() => setShowCircleSelector(!showCircleSelector)}
                className="ml-2 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Circles
              </button>
            )}
          </div>

          {/* Circle Selector */}
          {showCircleSelector && userCircles.length > 0 && (
            <div className="border-b bg-gray-50 p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Select a Circle:</h3>
              <div className="space-y-2">
                {userCircles.map((circle: Circle) => (
                  <button
                    key={circle.id}
                    onClick={() => {
                      loadCircleData(circle.id);
                      setShowCircleSelector(false);
                    }}
                    className="w-full text-left p-2 rounded hover:bg-blue-50 border text-sm"
                  >
                    <div className="font-medium">{circle.name}</div>
                    {circle.description && (
                      <div className="text-xs text-gray-500 truncate">{circle.description}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Circle Members View */}
          {selectedCircle && (
            <>
              <div className="p-4 border-b">
                <button
                  onClick={() => {
                    setSelectedCircle(null);
                    localStorage.removeItem('currentCircleId');
                    setSearchQuery('');
                    loadConversations();
                  }}
                  className="mb-3 text-sm text-blue-600 hover:text-blue-800"
                >
                  ← Back to all conversations
                </button>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search members..."
                    className="w-full pl-10 pr-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>

              <div className="overflow-y-auto flex-1">
                {membersLoading ? (
                  <div className="text-center p-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="text-gray-500 mt-2">Loading members...</p>
                  </div>
                ) : circleMembers.length > 0 ? (
                  <div className="space-y-1">
                    {circleMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center p-3 cursor-pointer hover:bg-gray-50 transition-colors border-l-4 border-transparent hover:border-blue-300"
                        onClick={() => {
                          console.log("Starting conversation with:", member.id, member.username);
                          startConversation(member.id);
                        }}
                      >
                        <div className="relative">
                          <img
                            src={member.avatar_url || "/default-avatar.png"}
                            alt={member.username}
                            className="w-12 h-12 rounded-full mr-3 object-cover border-2 border-gray-200"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/default-avatar.png";
                            }}
                          />
                          <div className="absolute bottom-0 right-2 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
                        </div>
                        <div className="flex-1">
                          <span className="font-medium text-sm block text-gray-900">
                            {member.username}
                          </span>
                          <span className="text-xs text-gray-500">
                            Click to start conversation
                          </span>
                        </div>
                        <UserIcon className="h-4 w-4 text-gray-400" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <UserIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">
                      {searchQuery ? "No members match your search." : 
                       allCircleMembers.length === 0 ? "No other members in this circle yet." : "Start typing to search members"}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Regular Conversations View */}
          {!selectedCircle && (
            <div className="overflow-y-auto flex-1">
              {conversations.length > 0 ? (
                <div className="space-y-1">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`flex items-center p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                        conversationId === conv.id ? 'bg-blue-50 border-r-4 border-blue-500' : 'border-r-4 border-transparent'
                      }`}
                      onClick={() => navigate(`/messages/${conv.id}`)}
                    >
                      <div className="relative">
                        <img
                          src={conv.participants[0]?.avatar_url || "/default-avatar.png"}
                          alt={conv.participants[0]?.username || "User"}
                          className="w-12 h-12 rounded-full mr-3 object-cover border-2 border-gray-200"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/default-avatar.png";
                          }}
                        />
                        {/* Online indicator */}
                        <div className="absolute bottom-0 right-2 w-4 h-4 bg-gray-300 border-2 border-white rounded-full"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-sm block truncate text-gray-900">
                            {conv.participants[0]?.username || "Unknown User"}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(conv.last_message_at).toLocaleDateString()}
                          </span>
                        </div>
                        {conv.last_message_content && (
                          <span className="text-xs text-gray-500 truncate block">
                            {conv.last_message_content}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8">
                  <PaperAirplaneIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No conversations yet.</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Start a conversation by messaging someone from your circles!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {conversationId && selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b flex items-center space-x-3 bg-white shadow-sm">
                {selectedConversation.participants[0]?.avatar_url && (
                  <div className="relative">
                    <img
                      src={selectedConversation.participants[0]?.avatar_url || "/default-avatar.png"}
                      alt={selectedConversation.participants[0]?.username}
                      className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/default-avatar.png";
                      }}
                    />
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-gray-900">
                      {selectedConversation.participants[0]?.username || "Unknown User"}
                    </span>
                    <span className="text-xs text-green-500">● Online</span>
                  </div>
                  {selectedCircle && (
                    <p className="text-xs text-gray-500">in {selectedCircle.name}</p>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                {messages.length > 0 ? (
                  messages.map((message, index) => {
                    const isCurrentUser = message.sender_id === user?.id;
                    const showAvatar = !isCurrentUser && (
                      index === 0 || 
                      messages[index - 1].sender_id !== message.sender_id
                    );
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} ${
                          !isCurrentUser && !showAvatar ? 'ml-12' : ''
                        }`}
                      >
                        {!isCurrentUser && showAvatar && (
                          <img
                            src={message.profiles.avatar_url || "/default-avatar.png"}
                            alt={message.profiles.username}
                            className="w-8 h-8 rounded-full mr-2 mt-1 object-cover border border-gray-200"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/default-avatar.png";
                            }}
                          />
                        )}
                        
                        <div className={`max-w-xs lg:max-w-md ${isCurrentUser ? '' : showAvatar ? '' : 'ml-10'}`}>
                          {!isCurrentUser && showAvatar && (
                            <div className="text-xs text-gray-500 mb-1 ml-1">
                              {message.profiles.username}
                            </div>
                          )}
                          
                          <div
                            className={`px-4 py-2 rounded-2xl relative ${
                              isCurrentUser
                                ? 'bg-blue-500 text-white rounded-br-md'
                                : 'bg-white text-gray-800 border rounded-bl-md shadow-sm'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                            <p className={`text-xs mt-1 ${
                              isCurrentUser ? 'text-blue-100' : 'text-gray-500'
                            }`}>
                              {new Date(message.created_at).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <PaperAirplaneIcon className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-lg font-medium mb-2">No messages yet</p>
                    <p className="text-sm">Start the conversation by sending a message!</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t bg-white">
                <div className="flex items-end space-x-3">
                  <div className="flex-1">
                    <textarea
                      ref={messageInputRef}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={`Message ${selectedConversation.participants[0]?.username || 'user'}...`}
                      className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      disabled={isLoading}
                      rows={1}
                      style={{ minHeight: '48px', maxHeight: '120px' }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                      }}
                    />
                  </div>
                  <button
                    onClick={sendMessage}
                    disabled={isLoading || !newMessage.trim()}
                    className="bg-blue-500 text-white p-3 rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <PaperAirplaneIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-400">
                    Press Enter to send, Shift+Enter for new line
                  </span>
                  <span className="text-xs text-gray-400">
                    {newMessage.length}/1000
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center text-gray-500 max-w-md">
                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <UserIcon className="h-12 w-12 text-gray-400" />
                </div>
                <h2 className="text-2xl font-semibold mb-3 text-gray-700">
                  {selectedCircle 
                    ? "Select a member to start chatting" 
                    : "Select a conversation"}
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                  {selectedCircle 
                    ? "Click on any member's name to begin a conversation" 
                    : "Pick a conversation from the sidebar or start a new one from your circles"}
                </p>
                {selectedCircle && circleMembers.length > 0 && (
                  <p className="text-xs text-blue-500">
                    💡 Tip: Click on any member above to start chatting
                  </p>
                )}
                {!selectedCircle && userCircles.length > 0 && (
                  <button
                    onClick={() => setShowCircleSelector(true)}
                    className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors mt-4"
                  >
                    Browse Circles
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;