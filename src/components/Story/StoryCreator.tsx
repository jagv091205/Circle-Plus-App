// src/components/Story/StoryCreator.tsx
import React, { useState, useRef } from "react";
import { supabase } from "../../services/supabaseClient";

interface StoryCreatorProps {
  circleId: string;
  userId: string;
  userAvatar: string | null;
  onStoryCreated: () => void;
}

const StoryCreator: React.FC<StoryCreatorProps> = ({ 
  circleId, 
  userId, 
  userAvatar, 
  onStoryCreated 
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    setIsUploading(true);

    try {
      // Create a unique path for the story
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('stories')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('stories')
        .getPublicUrl(filePath);

      // Create story record with expiration
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      
      const { error: dbError } = await supabase
        .from('stories')
        .insert({
          circle_id: circleId,
          profile_id: userId,
          image_url: file.type.startsWith('image/') ? urlData.publicUrl : null,
          video_url: file.type.startsWith('video/') ? urlData.publicUrl : null,
          expires_at: expiresAt
        });

      if (dbError) throw dbError;

      onStoryCreated();
    } catch (error) {
      console.error("Error creating story:", error);
      alert("Error creating story.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex-shrink-0 relative">
      <div
        className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 to-pink-600 cursor-pointer"
        onClick={handleClick}
      >
        <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center relative">
          {userAvatar ? (
            <img
              src={userAvatar}
              alt="Your story"
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500 text-xl">+</span>
            </div>
          )}
          {isUploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            </div>
          )}
        </div>
      </div>
      <p className="text-xs text-center mt-1 truncate w-16">Your Story</p>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,video/*"
        className="hidden"
        disabled={isUploading}
      />
    </div>
  );
};

export default StoryCreator;