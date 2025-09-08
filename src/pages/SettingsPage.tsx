import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";

// Custom Icon Component to replace react-icons
const Icon = ({ name, className = "" }: { name: string; className?: string }) => {
  const icons: Record<string, string> = {
    arrowLeft: "M10 19l-7-7m0 0l7-7m-7 7h18",
    user: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    bell: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
    moon: "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z",
    logOut: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
    lock: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
    helpCircle: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    camera: "M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z",
    save: "M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4",
    edit2: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
    trash2: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
    eye: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
    eyeOff: "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
  };

  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={icons[name]} />
    </svg>
  );
};

const SettingsPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      setUser(user);
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!profileError && data) {
        setUsername(data.username || "");
        setBio(data.bio || "");
        setAvatarUrl(data.avatar_url || "");
        setNotificationsEnabled(data.notifications_enabled || false);
        setDarkModeEnabled(data.dark_mode_enabled || false);
      }
    };
    fetchUserData();
  }, [navigate]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;
    
    const file = e.target.files[0];
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert("File size too large. Please choose an image under 5MB.");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload image to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      
      // Update profile in database
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;
      
      alert("Profile picture updated successfully!");
    } catch (error: any) {
      console.error("Error uploading avatar:", error.message);
      alert("Failed to upload profile picture. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          username,
          bio,
          avatar_url: avatarUrl,
          notifications_enabled: notificationsEnabled,
          dark_mode_enabled: darkModeEnabled,
        })
        .eq("id", user.id);

      if (error) {
        console.error("Update error:", error.message);
        alert("Failed to save settings. Please try again.");
      } else {
        alert("Settings saved successfully!");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords don't match");
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    setIsChangingPassword(true);
    setPasswordError("");
    setPasswordSuccess("");

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      
      setPasswordSuccess("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Password change error:", error.message);
      setPasswordError(error.message || "Failed to update password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    const confirmLogout = window.confirm("Are you sure you want to log out?");
    if (confirmLogout) {
      await supabase.auth.signOut();
      navigate("/login");
    }
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm(
      "Are you absolutely sure you want to delete your account? " +
      "This will permanently erase all your data and cannot be undone."
    );
    
    if (!confirmDelete) return;

    const password = prompt("Please enter your password to confirm account deletion:");
    if (!password) return;

    try {
      // Verify password first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      });

      if (signInError) {
        alert("Incorrect password. Account deletion cancelled.");
        return;
      }

      // First delete user data from profiles table
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Then delete the auth user
      const { error: authError } = await supabase.auth.admin.deleteUser(user.id);

      if (authError) throw authError;

      alert("Account deleted successfully");
      navigate("/login");
    } catch (error) {
      console.error("Delete account error:", error);
      alert("Failed to delete account. Please try again.");
    }
  };

  return (
    <div className={`min-h-screen ${darkModeEnabled ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
      {/* Header with back button */}
      <div className={`sticky top-0 ${darkModeEnabled ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b z-10`}>
        <div className="max-w-3xl mx-auto p-4">
          <div className="flex items-center">
            <button
              onClick={() => navigate("/profile")}
              className={`mr-4 p-2 -ml-2 rounded-full ${darkModeEnabled ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            >
              <Icon name="arrowLeft" className="text-2xl" />
            </button>
            <h1 className="text-xl font-bold">Settings</h1>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-3xl mx-auto pt-4 pb-20">
        {/* Profile Section */}
        <div className={`${darkModeEnabled ? 'bg-gray-800' : 'bg-white'} mb-4 rounded-lg shadow-sm`}>
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Profile</h2>

            {/* Avatar */}
            <div className="mb-6">
              <div className="flex items-center">
                <div className="relative">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Profile"
                      className="w-16 h-16 rounded-full object-cover mr-4"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mr-4">
                      <Icon name="user" className="text-gray-400 text-2xl" />
                    </div>
                  )}
                  <label 
                    htmlFor="avatar-upload"
                    className="absolute bottom-0 right-2 bg-blue-500 text-white p-1 rounded-full cursor-pointer hover:bg-blue-600"
                  >
                    <Icon name="camera" className="text-sm" />
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>
                </div>
                <div>
                  <h3 className="font-semibold">{username || "Username"}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {isUploading ? "Uploading..." : "Click camera to change photo"}
                  </p>
                </div>
              </div>
            </div>

            {/* Username */}
            <div className="border-t border-gray-200 py-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-600 text-sm">Username</p>
                  <p className="font-medium mt-1">{username}</p>
                </div>
                <button
                  onClick={() => {
                    const newUsername = prompt("Enter new username:", username);
                    if (newUsername !== null && newUsername.trim() !== "") {
                      setUsername(newUsername);
                    }
                  }}
                  className="text-blue-500 text-sm font-medium flex items-center"
                >
                  <Icon name="edit2" className="mr-1" /> Edit
                </button>
              </div>
            </div>

            {/* Bio */}
            <div className="border-t border-gray-200 py-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-600 text-sm">Bio</p>
                  <p className="font-medium mt-1">{bio || "Add a bio to tell people about yourself"}</p>
                </div>
                <button
                  onClick={() => {
                    const newBio = prompt("Enter new bio:", bio);
                    if (newBio !== null) setBio(newBio);
                  }}
                  className="text-blue-500 text-sm font-medium flex items-center"
                >
                  <Icon name="edit2" className="mr-1" /> Edit
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Password Change Section */}
        <div className={`${darkModeEnabled ? 'bg-gray-800' : 'bg-white'} mb-4 rounded-lg shadow-sm`}>
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Change Password</h2>
            
            <div className="space-y-4">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`w-full p-3 border rounded-lg ${darkModeEnabled ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-500"
                >
                  {showPassword ? <Icon name="eyeOff" /> : <Icon name="eye" />}
                </button>
              </div>
              
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full p-3 border rounded-lg ${darkModeEnabled ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              />
              
              {passwordError && <div className="text-red-500 text-sm">{passwordError}</div>}
              {passwordSuccess && <div className="text-green-500 text-sm">{passwordSuccess}</div>}
              
              <button
                onClick={handlePasswordChange}
                disabled={isChangingPassword || !newPassword || !confirmPassword}
                className={`w-full py-2 rounded-lg font-medium ${isChangingPassword || !newPassword || !confirmPassword ? 'bg-blue-300' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
              >
                {isChangingPassword ? 'Updating Password...' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>

        {/* Account Section */}
        <div className={`${darkModeEnabled ? 'bg-gray-800' : 'bg-white'} mb-4 rounded-lg shadow-sm`}>
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Preferences</h2>

            {/* Notifications */}
            <div className="flex items-center justify-between py-3 border-t border-gray-200">
              <div className="flex items-center">
                <Icon name="bell" className="mr-3 text-lg" />
                <span>Notifications</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={() => setNotificationsEnabled(!notificationsEnabled)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Dark Mode */}
            <div className="flex items-center justify-between py-3 border-t border-gray-200">
              <div className="flex items-center">
                <Icon name="moon" className="mr-3 text-lg" />
                <span>Dark Mode</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={darkModeEnabled}
                  onChange={() => setDarkModeEnabled(!darkModeEnabled)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Privacy */}
            <button 
              onClick={() => navigate("/privacy")}
              className="flex items-center justify-between w-full py-3 border-t border-gray-200"
            >
              <div className="flex items-center">
                <Icon name="lock" className="mr-3 text-lg" />
                <span>Privacy</span>
              </div>
              <Icon name="arrowLeft" className="transform rotate-180 text-gray-400" />
            </button>

            {/* Help */}
            <button 
              onClick={() => navigate("/help")}
              className="flex items-center justify-between w-full py-3 border-t border-gray-200"
            >
              <div className="flex items-center">
                <Icon name="helpCircle" className="mr-3 text-lg" />
                <span>Help</span>
              </div>
              <Icon name="arrowLeft" className="transform rotate-180 text-gray-400" />
            </button>

            {/* About */}
            <button 
              onClick={() => navigate("/about")}
              className="flex items-center justify-between w-full py-3 border-t border-gray-200"
            >
              <div className="flex items-center">
                <Icon name="info" className="mr-3 text-lg" />
                <span>About</span>
              </div>
              <Icon name="arrowLeft" className="transform rotate-180 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Actions Section */}
        <div className={`${darkModeEnabled ? 'bg-gray-800' : 'bg-white'} mb-4 rounded-lg shadow-sm`}>
          <div className="p-4">
            {/* Log Out */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-between py-3 text-red-600 font-medium"
            >
              <div className="flex items-center">
                <Icon name="logOut" className="mr-3 text-lg" />
                <span>Log Out</span>
              </div>
            </button>

            {/* Delete Account */}
            <button
              onClick={handleDeleteAccount}
              className="w-full flex items-center justify-between py-3 border-t border-gray-200 text-red-600 font-medium"
            >
              <div className="flex items-center">
                <Icon name="trash2" className="mr-3 text-lg" />
                <span>Delete Account</span>
              </div>
            </button>
          </div>
        </div>

        {/* Save Button - Fixed at bottom */}
        <div className={`fixed bottom-0 left-0 right-0 ${darkModeEnabled ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t p-4`}>
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className={`w-full py-3 rounded-lg font-medium flex items-center justify-center ${isSaving ? 'bg-blue-300' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Icon name="save" className="mr-2" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;