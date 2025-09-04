// src/pages/Messages.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { User } from "@supabase/supabase-js";
import { ArrowLeftIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import Navbar from "../Layout/Navbar";

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface CircleMember {
  profile_id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

interface ConversationParticipant {
  user_id: string;
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
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

const Messages = () => {
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [circleMembers, setCircleMembers] = useState<Profile[]>([]);
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate("/login");
      else setUser(data.user);
    });
  }, [navigate]);

  // Extract circleId from URL if present
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const circleId = searchParams.get('circleId');
    if (circleId) {
      setSelectedCircleId(circleId);
      fetchCircleMembers(circleId);
    }
  }, [location.search]);

  useEffect(() => {
    if (user) {
      fetchConversations();
      if (conversationId) {
        fetchConversationDetails(conversationId);
        fetchMessages(conversationId);
        setupRealtimeSubscription(conversationId);
      }
    }
  }, [user, conversationId]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const startWithUserId = searchParams.get('startWith');
    if (startWithUserId && user) {
      startConversation(startWithUserId);
    }
  }, [user, location.search]);

  const fetchCircleMembers = async (circleId: string) => {
    try {
      const { data, error } = await supabase
        .from("circle_members")
        .select("profile_id, profiles:profile_id(username, avatar_url)")
        .eq("circle_id", circleId)
        .neq("profile_id", user?.id);

      if (!error && data) {
        const members = data.map((member: any) => ({
          id: member.profile_id,
          username: member.profiles.username,
          avatar_url: member.profiles.avatar_url
        }));
        setCircleMembers(members);
      }
    } catch (error) {
      console.error("Error fetching circle members:", error);
    }
  };

  const fetchConversations = async () => {
    // First get all conversations user is part of
    const { data: userConversations, error } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user?.id);
    if (error || !userConversations) return;
    const conversationIds = userConversations.map(uc => uc.conversation_id);

    // Get conversation details
    const { data: convData, error: convError } = await supabase
      .from("conversations")
      .select("*")
      .in("id", conversationIds)
      .order("last_message_at", { ascending: false });
    if (convError || !convData) return;

    // Get participants for each conversation
    const conversationsWithParticipants: Conversation[] = [];

    for (const conv of convData) {
      const { data: participants, error: partError } = await supabase
        .from("conversation_participants")
        .select(`
          user_id,
          profiles:profiles (
            id,
            username,
            avatar_url
          )
        `)
        .eq("conversation_id", conv.id);
      if (partError) continue;

      // Get last message
      const { data: lastMessage, error: msgError } = await supabase
        .from("direct_messages")
        .select("content")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const otherParticipants = participants
        .filter((p: any) => p.user_id !== user?.id)
        .map((p: any) => p.profiles);

      conversationsWithParticipants.push({
        id: conv.id,
        last_message_at: conv.last_message_at,
        participants: otherParticipants,
        last_message_content: lastMessage?.content,
        unread_count: 0 // Simplified for now
      });
    }
    setConversations(conversationsWithParticipants);
  };

  const fetchConversationDetails = async (convId: string) => {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", convId)
      .single();
    if (error || !data) return;

    const { data: participants, error: partError } = await supabase
      .from("conversation_participants")
      .select(`
        user_id,
        profiles:profiles (
          id,
          username,
          avatar_url
        )
      `)
      .eq("conversation_id", convId);
    if (partError) return;

    const otherParticipants = participants
      .filter((p: any) => p.user_id !== user?.id)
      .map((p: any) => p.profiles);

    setSelectedConversation({
      id: data.id,
      last_message_at: data.last_message_at,
      participants: otherParticipants,
      unread_count: 0
    });
  };

  const fetchMessages = async (convId: string) => {
    const { data, error } = await supabase
      .from("direct_messages")
      .select(`
        *,
        profiles:sender_id (
          username,
          avatar_url
        )
      `)
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
  };

  const setupRealtimeSubscription = (convId: string) => {
    const subscription = supabase
      .channel(`messages:${convId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `conversation_id=eq.${convId}`
        },
        (payload) => {
          fetchMessages(convId);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("direct_messages")
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          content: newMessage.trim()
        });

      if (error) throw error;

      // Update conversation last message time
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", selectedConversation.id);

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const startConversation = async (userId: string) => {
    // Check if conversation already exists
    const { data: existingConvs, error } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user?.id);

    if (error) {
      console.error("Error checking existing conversations:", error);
      return;
    }

    // For each conversation, check if the other user is also a participant
    for (const conv of existingConvs) {
      const { data: participants, error: partError } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conv.conversation_id);

      if (partError) continue;

      if (participants.some((p: any) => p.user_id === userId)) {
        navigate(`/messages/${conv.conversation_id}`);
        return;
      }
    }

    // Create new conversation if none exists
    const { data: newConv, error: convError } = await supabase
      .from("conversations")
      .insert({})
      .select()
      .single();

    if (convError) {
      console.error("Error creating conversation:", convError);
      return;
    }

    // Add participants
    await supabase
      .from("conversation_participants")
      .insert([
        { conversation_id: newConv.id, user_id: user?.id },
        { conversation_id: newConv.id, user_id: userId }
      ]);

    navigate(`/messages/${newConv.id}`);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col h-screen bg-white">
      <Navbar onLogout={() => {}} user={user} onPostClick={() => {}} />
      <div className="flex flex-1">
        {/* Circle Members List (when viewing circle messages) */}
        {selectedCircleId && (
          <div className="w-1/4 border-r border-gray-200 p-4">
            <h2 className="text-lg font-semibold mb-4">Circle Members</h2>
            <div className="space-y-3">
              {circleMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center p-2 cursor-pointer hover:bg-gray-100 rounded"
                  onClick={() => navigate(`/messages?startWith=${member.id}`)}
                >
                  <img
                    src={member.avatar_url || "/default-avatar.png"}
                    alt={member.username}
                    className="w-10 h-10 rounded-full mr-3"
                  />
                  <span className="font-medium text-sm">{member.username}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conversations List */}
        <div className={`${selectedCircleId ? 'w-1/4' : 'w-1/3'} border-r border-gray-200`}>
          <div className="p-4 border-b">
            <h1 className="text-xl font-semibold">Messages</h1>
          </div>
          <div className="overflow-y-auto h-[calc(100vh-120px)]">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                  conversationId === conversation.id ? 'bg-blue-50' : ''
                }`}
                onClick={() => navigate(`/messages/${conversation.id}`)}
              >
                <div className="flex items-center space-x-3">
                  <img
                    src={conversation.participants[0]?.avatar_url || "/default-avatar.png"}
                    alt={conversation.participants[0]?.username}
                    className="w-12 h-12 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {conversation.participants[0]?.username}
                    </p>
                    <p className="text-gray-500 text-sm truncate">
                      {conversation.last_message_content || 'Start a conversation...'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              <div className="p-4 border-b flex items-center space-x-3">
                <button
                  onClick={() => navigate('/messages')}
                  className="lg:hidden"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                </button>
                <img
                  src={selectedConversation.participants[0]?.avatar_url || "/default-avatar.png"}
                  alt={selectedConversation.participants[0]?.username}
                  className="w-8 h-8 rounded-full"
                />
                <span className="font-medium">
                  {selectedConversation.participants[0]?.username}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs p-3 rounded-lg ${
                        message.sender_id === user.id
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(message.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Message..."
                    className="flex-1 p-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={isLoading || !newMessage.trim()}
                    className="bg-blue-500 text-white p-3 rounded-full hover:bg-blue-600 disabled:opacity-50"
                  >
                    <PaperAirplaneIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              {selectedCircleId ? (
                <div className="text-center text-gray-500">
                  <p className="text-lg">Select a member to start messaging</p>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <p className="text-lg">Your messages</p>
                  <p className="text-sm">Send private messages to a friend.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
