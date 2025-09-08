// src/pages/ProfilePage.tsx
import React, { useState, useEffect, useRef, ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import Navbar from "../Layout/Navbar";

// Define types
interface Profile {
  id: string;
  username: string;
  full_name: string;
  bio: string;
  avatar_url: string | null;
  email: string;
}

interface Circle {
  id: string;
  name: string;
  description: string;
  is_private: boolean;
  role: string;
  is_admin: boolean;
}

interface FormData {
  full_name: string;
  username: string;
  bio: string;
}

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    full_name: "",
    username: "",
    bio: ""
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        navigate("/login");
        return;
      }

      setUser(user);

      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
      } else {
        setProfile(profileData);
        setFormData({
          full_name: profileData.full_name || "",
          username: profileData.username || "",
          bio: profileData.bio || ""
        });
        if (profileData.avatar_url) {
          setAvatarPreview(profileData.avatar_url);
        }
      }

      // Fetch user's circles
      const { data: circlesData, error: circlesError } = await supabase
        .from("circle_members")
        .select(`
          role,
          is_admin,
          status,
          circles:circle_id (
            id,
            name,
            description,
            is_private
          )
        `)
        .eq("profile_id", user.id)
        .eq("status", "active");

      if (circlesError) {
        console.error("Error fetching circles:", circlesError);
      } else {
        const formattedCircles = circlesData.map((item: any) => ({
          id: item.circles.id,
          name: item.circles.name,
          description: item.circles.description,
          is_private: item.circles.is_private,
          role: item.role,
          is_admin: item.is_admin
        }));
        setCircles(formattedCircles);
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleCancelEdit = () => {
    // Reset form data to original profile values
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        username: profile.username || "",
        bio: profile.bio || ""
      });
      setAvatarPreview(profile.avatar_url);
      setAvatarFile(null);
    }
    setEditMode(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      let avatarUrl: string | null = profile?.avatar_url || null;

      // Upload avatar if changed
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `avatar.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        // First, try to remove any existing avatar files for this user
        try {
          const { data: existingFiles } = await supabase.storage
            .from('avatars')
            .list(user.id);
          
          if (existingFiles && existingFiles.length > 0) {
            const filesToRemove = existingFiles.map(file => `${user.id}/${file.name}`);
            await supabase.storage
              .from('avatars')
              .remove(filesToRemove);
          }
        } catch (cleanupError) {
          console.log('No existing avatars to remove or cleanup failed:', cleanupError);
        }

        // Upload the new avatar
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, {
            upsert: true,
            cacheControl: '3600'
          });

        if (uploadError) {
          console.error('Avatar upload error:', uploadError);
          throw uploadError;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        avatarUrl = urlData.publicUrl;
      }

      // Prepare update data
      const updateData: any = {
        full_name: formData.full_name,
        bio: formData.bio,
        avatar_url: avatarUrl
      };

      // Only include username if it's different from current
      if (formData.username !== profile?.username) {
        updateData.username = formData.username;
      }

      console.log('Updating profile with data:', updateData);

      // Update profile in database
      const { data, error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user.id)
        .select() // Return the updated record
        .single();

      if (error) {
        console.error('Profile update error details:', error);
        
        // Handle specific error cases
        if (error.code === '23505') { // Unique violation
          if (error.message.includes('username')) {
            alert('Username already exists. Please choose a different one.');
          } else if (error.message.includes('email')) {
            alert('Email already exists. Please use a different email.');
          }
        } else if (error.code === '42501') { // Permission denied
          alert('Permission denied. Please check your RLS policies.');
        }
        
        throw error;
      }

      // Update local profile state with the returned data
      if (data) {
        setProfile(data);
        setAvatarPreview(data.avatar_url);
      }

      setEditMode(false);
      setAvatarFile(null); // Reset the file state
      
      // Show success message
      alert('Profile updated successfully!');
      
    } catch (error: any) {
      console.error("Error updating profile:", error);
      
      // More specific error messages
      if (error.message?.includes('duplicate key')) {
        alert("This username is already taken. Please choose another one.");
      } else {
        alert("Failed to update profile. Please try again.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleCircleClick = (circleId: string) => {
    // Navigate to home page with the circle ID as a state parameter
    navigate("/home", { state: { circleId } });
  };

  const handlePostClick = () => {
    // Navigate to create post page
    navigate("/create-post");
  };

  const handleCreatePostInCircle = (circleId?: string) => {
    if (circleId) {
      navigate("/create-post", { state: { circleId } });
    } else {
      navigate("/create-post");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <>
      <Navbar
        user={user}
        onLogout={handleLogout}
        onPostClick={handlePostClick}
      />
      <div className="max-w-4xl mx-auto p-6">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-center md:items-start mb-8">
          {/* Avatar Section */}
          <div className="relative mb-4 md:mb-0 md:mr-8">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <svg
                      className="w-16 h-16 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                )}
              </div>
              {editMode && (
                <button
                  onClick={handleAvatarClick}
                  className="absolute bottom-0 right-0 bg-blue-500 text-white p-2 rounded-full shadow-md"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </button>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <div className="flex items-center mb-2">
              <h1 className="text-2xl font-bold mr-4">{profile?.username}</h1>
              {editMode ? (
                <button
                  onClick={handleCancelEdit}
                  className="text-gray-500 mr-2"
                >
                  Cancel
                </button>
              ) : (
                <button
                  onClick={() => setEditMode(true)}
                  className="text-blue-500 font-medium mr-2"
                >
                  Edit Profile
                </button>
              )}
              {editMode && (
                <button
                  onClick={handleSubmit}
                  disabled={isUploading}
                  className="bg-blue-500 text-white px-4 py-1 rounded-md text-sm"
                >
                  {isUploading ? "Saving..." : "Save"}
                </button>
              )}
            </div>

            <div className="flex mb-4">
              <div className="mr-6">
                <span className="font-bold">{circles.length}</span> circles
              </div>
            </div>

            <div className="mb-2">
              <h2 className="font-bold">{profile?.full_name}</h2>
            </div>
            <p className="text-gray-600">{profile?.bio}</p>
          </div>
        </div>

        {editMode && (
          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Username</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Bio</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  rows={3}
                />
              </div>
            </form>
          </div>
        )}

        {/* Circles Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Your Circles</h2>
          {circles.length === 0 ? (
            <p className="text-gray-500">You haven't joined any circles yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {circles.map((circle) => (
                <div
                  key={circle.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer group relative"
                  onClick={() => handleCircleClick(circle.id)}
                >
                  <div className="flex items-center mb-2">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                      <span className="text-blue-600 font-medium">
                        {circle.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium">{circle.name}</h3>
                      <p className="text-sm text-gray-500">
                        {circle.is_private ? "Private" : "Public"} • {circle.role}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{circle.description}</p>
                  
                  {/* Create Post in Circle Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreatePostInCircle(circle.id);
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-green-500 text-white p-1 rounded-md text-xs"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Circle Button */}
        <div className="fixed bottom-8 right-8">
          <button
            onClick={() => navigate("/create-circle")}
            className="bg-blue-500 text-white p-4 rounded-full shadow-lg hover:bg-blue-600 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
};

export default ProfilePage;