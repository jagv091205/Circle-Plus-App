// src/components/Story/StoryModal.tsx
import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../../services/supabaseClient";

interface Profile {
  username: string;
  avatar_url: string | null;
}

interface Story {
  id: string;
  profile_id: string;
  circle_id: string;
  image_url: string | null;
  video_url: string | null;
  created_at: string;
  expires_at: string;   // 👈 NEW
  profiles: Profile;
}

interface StoryModalProps {
  circleId: string;
  userId: string;
  onClose: () => void;
  onStoryDeleted: () => void;
  onStoryUpdated: () => void;
  initialStoryIndex: number;
}

const StoryModal: React.FC<StoryModalProps> = ({
  circleId,
  userId,
  onClose,
  onStoryDeleted,
  onStoryUpdated,
  initialStoryIndex
}) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialStoryIndex);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch only non-expired stories
  useEffect(() => {
    const fetchStories = async () => {
      const { data, error } = await supabase
        .from("stories")
        .select("*, profiles:profile_id(username, avatar_url)")
        .eq("circle_id", circleId)
        .gt("expires_at", new Date().toISOString()) // 👈 only active stories
        .order("created_at", { ascending: false });

      if (!error && data) {
        setStories(data as Story[]);
      }
    };

    fetchStories();
  }, [circleId]);

  // In StoryModal.tsx, add this useEffect to check expiration
useEffect(() => {
  // Check if current story is expired
  if (stories.length > 0 && currentStoryIndex < stories.length) {
    const currentStory = stories[currentStoryIndex];
    if (new Date(currentStory.expires_at) < new Date()) {
      // Skip to next story if current is expired
      handleNextStory();
    }
  }
}, [currentStoryIndex, stories]);

  // Auto-play timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    let interval: NodeJS.Timeout;

    if (!isPaused && !isEditing && stories.length > 0) {
      const currentStory = stories[currentStoryIndex];

      // 👇 Skip expired stories immediately
      if (new Date(currentStory.expires_at) < new Date()) {
        handleNextStory();
        return;
      }

      const isVideo = currentStory.video_url !== null;
      const duration = isVideo ? 10000 : 5000;

      timer = setTimeout(() => {
        if (currentStoryIndex < stories.length - 1) {
          setCurrentStoryIndex(currentStoryIndex + 1);
          setCurrentTime(0);
        } else {
          onClose();
        }
      }, duration);

      interval = setInterval(() => {
        if (!isPaused && !isEditing) {
          setCurrentTime(prev => {
            if (prev >= duration) {
              clearInterval(interval);
              return duration;
            }
            return prev + 100;
          });
        }
      }, 100);
    }

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [currentStoryIndex, isPaused, isEditing, stories]);

  const handleNextStory = () => {
    if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
      setCurrentTime(0);
      setIsEditing(false);
    } else {
      onClose();
    }
  };

  const handlePrevStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
      setCurrentTime(0);
      setIsEditing(false);
    } else {
      onClose();
    }
  };

  const handleDeleteStory = async () => {
    try {
      const story = stories[currentStoryIndex];
      const { error } = await supabase.from("stories").delete().eq("id", story.id);

      if (error) throw error;

      const updatedStories = stories.filter(s => s.id !== story.id);
      setStories(updatedStories);

      if (updatedStories.length === 0) {
        onClose();
      } else if (currentStoryIndex >= updatedStories.length) {
        setCurrentStoryIndex(updatedStories.length - 1);
      }

      onStoryDeleted();
    } catch (error) {
      console.error("Error deleting story:", error);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setIsPaused(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setEditFile(e.target.files[0]);
    }
  };

  const handleUpdateStory = async () => {
    if (!editFile) return;

    setIsUploading(true);
    try {
      const currentStory = stories[currentStoryIndex];
      const fileExt = editFile.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // Upload new file
      const { error: uploadError } = await supabase.storage
        .from("stories")
        .upload(filePath, editFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("stories")
        .getPublicUrl(filePath);

      // Update story record (reset expiry for new file)
      const { error: updateError } = await supabase
        .from("stories")
        .update({
          image_url: editFile.type.startsWith("image/") ? urlData.publicUrl : null,
          video_url: editFile.type.startsWith("video/") ? urlData.publicUrl : null,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 👈 reset expiry
        })
        .eq("id", currentStory.id);

      if (updateError) throw updateError;

      // Update local state
      const updatedStories = [...stories];
      updatedStories[currentStoryIndex] = {
        ...currentStory,
        image_url: editFile.type.startsWith("image/") ? urlData.publicUrl : currentStory.image_url,
        video_url: editFile.type.startsWith("video/") ? urlData.publicUrl : currentStory.video_url,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
      setStories(updatedStories);
      setIsEditing(false);
      setIsPaused(false);
      onStoryUpdated();
    } catch (error) {
      console.error("Error updating story:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setIsPaused(false);
    setEditFile(null);
  };

  if (stories.length === 0) return null;

  const currentStory = stories[currentStoryIndex];
  const isVideo = currentStory.video_url !== null;
  const duration = isVideo ? 10000 : 5000;
  const progress = (currentTime / duration) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-95">
      <div className="relative w-full max-w-md h-[80vh]">
        {/* Story progress bar */}
        <div className="absolute top-2 left-0 right-0 flex space-x-1 px-4">
          {stories.map((_, index) => (
            <div key={index} className="h-1 flex-1 bg-gray-600 rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  index < currentStoryIndex
                    ? "bg-white"
                    : index === currentStoryIndex
                    ? "bg-white"
                    : "bg-gray-600"
                }`}
                style={{ width: index === currentStoryIndex ? `${progress}%` : "100%" }}
              />
            </div>
          ))}
        </div>

        {/* Story content */}
        <div className="relative w-full h-full">
          {currentStory.image_url && !isEditing && (
            <img
              src={currentStory.image_url}
              alt="Story"
              className="w-full h-full object-contain"
              onClick={handleNextStory}
            />
          )}
          {currentStory.video_url && !isEditing && (
            <video
              src={currentStory.video_url}
              autoPlay={!isPaused}
              loop
              muted
              className="w-full h-full object-contain"
              onClick={handleNextStory}
            />
          )}

          {/* Edit mode preview */}
          {isEditing && editFile && (
            <div className="w-full h-full flex items-center justify-center">
              {editFile.type.startsWith("image/") ? (
                <img
                  src={URL.createObjectURL(editFile)}
                  alt="Preview"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <video
                  src={URL.createObjectURL(editFile)}
                  autoPlay
                  loop
                  muted
                  className="max-w-full max-h-full object-contain"
                />
              )}
            </div>
          )}

          {/* User info */}
          <div className="absolute top-4 left-4 z-10 flex items-center">
            <img
              src={currentStory.profiles.avatar_url || "/default-avatar.png"}
              alt={currentStory.profiles.username}
              className="w-10 h-10 rounded-full"
            />
            <span className="ml-2 text-white font-medium">
              {currentStory.profiles.username}
            </span>
            <span className="ml-2 text-gray-300 text-sm">
              {new Date(currentStory.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white z-10 text-2xl"
          >
            ×
          </button>

          {/* Navigation buttons */}
          {!isEditing && (
            <>
              <div className="absolute top-0 left-0 w-1/3 h-full" onClick={handlePrevStory} />
              <div className="absolute top-0 right-0 w-1/3 h-full" onClick={handleNextStory} />
            </>
          )}

          {/* Edit/Delete buttons (only for user's own stories) */}
          {currentStory.profile_id === userId && (
            <div className="absolute bottom-4 right-4 flex space-x-2">
              {!isEditing ? (
                <>
                  <button
                    onClick={handleEditClick}
                    className="p-2 bg-gray-800 rounded-full text-white"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={handleDeleteStory}
                    className="p-2 bg-gray-800 rounded-full text-white"
                  >
                    🗑️
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleCancelEdit}
                    className="p-2 bg-gray-800 rounded-full text-white"
                  >
                    ❌
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 bg-gray-800 rounded-full text-white"
                  >
                    📁
                  </button>
                  <button
                    onClick={handleUpdateStory}
                    className="p-2 bg-blue-500 rounded-full text-white"
                    disabled={isUploading}
                  >
                    {isUploading ? "⏳" : "✅"}
                  </button>
                </>
              )}
            </div>
          )}

          {/* File input for edit mode */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,video/*"
            className="hidden"
          />

          {/* Pause button */}
          {!isEditing && (
            <button
              onClick={togglePause}
              className="absolute bottom-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-opacity-70 hover:text-opacity-100"
            >
              {isPaused ? <span className="text-3xl">▶️</span> : <span className="text-3xl">⏸️</span>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoryModal;
