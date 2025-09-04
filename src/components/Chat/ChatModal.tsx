// src/components/Chat/ChatModal.tsx
import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../../services/supabaseClient";
import { User } from "@supabase/supabase-js";

interface Message {
  id: string;
  circle_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

interface ChatModalProps {
  circleId: string;
  circleName: string;
  userId: string;
  onClose: () => void;
  isOpen: boolean;
}

const ChatModal: React.FC<ChatModalProps> = ({ circleId, circleName, userId, onClose, isOpen }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
      setupRealtimeSubscription();
    }
  }, [isOpen, circleId]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("messages")
      .select(`
        *,
        profiles: sender_id (
          username,
          avatar_url
        )
      `)
      .eq("circle_id", circleId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMessages(data);
      scrollToBottom();
    }
  };

  const setupRealtimeSubscription = () => {
    const subscription = supabase
      .channel(`messages:circle_id=eq.${circleId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `circle_id=eq.${circleId}`
        },
        (payload) => {
          fetchMessageDetails(payload.new.id);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const fetchMessageDetails = async (messageId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select(`
        *,
        profiles: sender_id (
          username,
          avatar_url
        )
      `)
      .eq("id", messageId)
      .single();

    if (!error && data) {
      setMessages(prev => [...prev, data]);
      scrollToBottom();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("messages")
        .insert({
          circle_id: circleId,
          sender_id: userId,
          content: newMessage.trim()
        });

      if (error) throw error;

      setNewMessage("");
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg w-96 h-96 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Chat - {circleName}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ×
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender_id === userId ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs p-3 rounded-lg ${
                  message.sender_id === userId
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <img
                    src={message.profiles.avatar_url || "/default-avatar.png"}
                    alt={message.profiles.username}
                    className="w-6 h-6 rounded-full"
                  />
                  <span className="text-sm font-medium">{message.profiles.username}</span>
                </div>
                <p className="text-sm">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(message.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !newMessage.trim()}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;