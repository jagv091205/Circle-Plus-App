import React, { useState, useEffect } from "react";
import { supabase } from "../../services/supabaseClient";

interface Member {
  profile_id: string;
  role: string;
  status: string;
  is_admin: boolean;
  profiles: {
    username: string;
    email: string;
    avatar_url?: string;
  };
}

interface CircleInfo {
  id: string;
  name: string;
  description: string;
  creator_id: string;
  is_private: boolean;
}

interface CircleSettingsModalProps {
  circleId: string;
  onClose: () => void;
}

const CircleSettingsModal: React.FC<CircleSettingsModalProps> = ({ circleId, onClose }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [newMemberUsername, setNewMemberUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<Member[]>([]);
  const [circleInfo, setCircleInfo] = useState<CircleInfo | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [circleName, setCircleName] = useState("");
  const [circleDescription, setCircleDescription] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchCircleInfo();
    fetchMembers();
    fetchPendingRequests();
    checkUserPermissions();
  }, [circleId]);

  const checkUserPermissions = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // If we already determined owner status from circleInfo, return
  if (isOwner) return;

  // Check if user is admin (for non-owners)
  const { data: memberData } = await supabase
    .from("circle_members")
    .select("is_admin")
    .eq("circle_id", circleId)
    .eq("profile_id", user.id)
    .eq("status", "active")
    .single();

  if (memberData) {
    setIsAdmin(memberData.is_admin);
  }
};

  const fetchCircleInfo = async () => {
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) return;

  const { data, error } = await supabase
    .from("circles")
    .select("*")
    .eq("id", circleId)
    .single();

  if (!error && data) {
    setCircleInfo(data);
    setCircleName(data.name);
    setCircleDescription(data.description || "");
    
    // Check ownership here
    if (data.creator_id === currentUser.id) {
      setIsOwner(true);
      setIsAdmin(true);
    }
  }
};

  const fetchMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("circle_members")
      .select(`
        profile_id,
        role,
        status,
        is_admin,
        profiles (
          username,
          email,
          avatar_url
        )
      `)
      .eq("circle_id", circleId)
      .eq("status", "active");

    if (error) {
      console.error("Error fetching members:", error);
    } else if (data) {
      const formattedMembers: Member[] = data.map((member: any) => ({
        profile_id: member.profile_id,
        role: member.role,
        status: member.status,
        is_admin: member.is_admin,
        profiles: {
          username: member.profiles?.username || "",
          email: member.profiles?.email || "",
          avatar_url: member.profiles?.avatar_url || null,
        },
      }));
      setMembers(formattedMembers);
    }
    setLoading(false);
  };

  const fetchPendingRequests = async () => {
    const { data, error } = await supabase
      .from("circle_members")
      .select(`
        profile_id,
        role,
        status,
        is_admin,
        profiles (
          username,
          email,
          avatar_url
        )
      `)
      .eq("circle_id", circleId)
      .eq("status", "pending");

    if (error) {
      console.error("Error fetching pending requests:", error);
    } else if (data) {
      const formattedRequests: Member[] = data.map((request: any) => ({
        profile_id: request.profile_id,
        role: request.role,
        status: request.status,
        is_admin: request.is_admin,
        profiles: {
          username: request.profiles?.username || "",
          email: request.profiles?.email || "",
          avatar_url: request.profiles?.avatar_url || null,
        },
      }));
      setPendingRequests(formattedRequests);
    }
  };

  const handleAddMember = async () => {
    if (!newMemberUsername.trim()) return;
    
    try {
      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", newMemberUsername.trim())
        .single();

      if (userError || !userData) {
        alert("User not found. Please check the username.");
        return;
      }

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      // Check if user can add members (admin or owner)
      if (!isAdmin && !isOwner) {
        alert("You don't have permission to add members.");
        return;
      }

      const { data: existingMember } = await supabase
        .from("circle_members")
        .select("profile_id, status")
        .eq("circle_id", circleId)
        .eq("profile_id", userData.id)
        .single();

      if (existingMember) {
        if (existingMember.status === 'pending') {
          alert("User already has a pending invitation.");
        } else {
          alert("User is already a member of this circle.");
        }
        return;
      }

      const { error: memberError } = await supabase
        .from("circle_members")
        .insert({
          circle_id: circleId,
          profile_id: userData.id,
          status: "pending",
          role: "member",
          is_admin: false
        });

      if (memberError) {
        console.error("Error adding member:", memberError);
        alert("Error adding member. Please try again.");
        return;
      }

      // Send notification
      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          recipient_id: userData.id,
          from_user: currentUser.id,
          type: "invite",
          circle_id: circleId,
          response_status: "pending",
          read: false,
        });

      if (notifError) {
        console.error("Error sending notification:", notifError);
      }

      setNewMemberUsername("");
      fetchPendingRequests();
      alert("Invitation sent successfully!");
    } catch (error) {
      console.error("Error in handleAddMember:", error);
      alert("An error occurred. Please try again.");
    }
  };

  const handleRemoveMember = async (profileId: string) => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return;

    // Prevent removing yourself if you're the owner
    if (profileId === currentUser.id && circleInfo?.creator_id === currentUser.id) {
      alert("Owners cannot remove themselves. Transfer ownership first.");
      return;
    }

    const { error } = await supabase
      .from("circle_members")
      .delete()
      .eq("circle_id", circleId)
      .eq("profile_id", profileId);

    if (error) {
      console.error("Error removing member:", error);
      alert("Error removing member. You may not have permission.");
    } else {
      fetchMembers();
    }
  };

  const handleApproveRequest = async (profileId: string) => {
    if (!isAdmin && !isOwner) {
      alert("You don't have permission to approve requests.");
      return;
    }

    const { error } = await supabase
      .from("circle_members")
      .update({ status: "active" })
      .eq("circle_id", circleId)
      .eq("profile_id", profileId);

    if (error) {
      console.error("Error approving request:", error);
    } else {
      fetchMembers();
      fetchPendingRequests();
    }
  };

  const handleRejectRequest = async (profileId: string) => {
    if (!isAdmin && !isOwner) {
      alert("You don't have permission to reject requests.");
      return;
    }

    const { error } = await supabase
      .from("circle_members")
      .delete()
      .eq("circle_id", circleId)
      .eq("profile_id", profileId);

    if (error) {
      console.error("Error rejecting request:", error);
    } else {
      fetchPendingRequests();
    }
  };

  const handleUpdateCircle = async () => {
    if (!isOwner) {
      alert("Only the circle owner can update circle information.");
      return;
    }

    const { error } = await supabase
      .from("circles")
      .update({
        name: circleName,
        description: circleDescription
      })
      .eq("id", circleId);

    if (error) {
      console.error("Error updating circle:", error);
      alert("Error updating circle information.");
    } else {
      setEditMode(false);
      fetchCircleInfo();
      alert("Circle updated successfully!");
    }
  };

  const handleDeleteCircle = async () => {
    if (!isOwner) {
      alert("Only the circle owner can delete the circle.");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this circle? This action cannot be undone. All posts, stories, and member data will be permanently deleted.")) {
      return;
    }

    setIsDeleting(true);
    try {
      // Delete the circle - this will automatically delete all related circle_members
      // due to the ON DELETE CASCADE constraint
      const { error } = await supabase
        .from("circles")
        .delete()
        .eq("id", circleId);

      if (error) {
        console.error("Error deleting circle:", error);
        alert("Error deleting circle: " + error.message);
        setIsDeleting(false);
        return;
      }

      alert("Circle deleted successfully!");
      onClose();
      // Refresh the page to reflect changes
      window.location.reload();
    } catch (error) {
      console.error("Error in handleDeleteCircle:", error);
      alert("An error occurred while deleting the circle.");
      setIsDeleting(false);
    }
  };

  const handleMakeAdmin = async (profileId: string, makeAdmin: boolean) => {
    if (!isOwner) {
      alert("Only the circle owner can change admin status.");
      return;
    }

    const { error } = await supabase
      .from("circle_members")
      .update({ is_admin: makeAdmin })
      .eq("circle_id", circleId)
      .eq("profile_id", profileId);

    if (error) {
      console.error("Error updating admin status:", error);
    } else {
      fetchMembers();
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <div className="bg-white rounded-lg p-6 w-[90%] max-w-2xl shadow-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Circle Settings</h2>

        {/* Circle Information */}
        {circleInfo && (
          <div className="mb-6 p-4 border rounded-lg">
            <h3 className="text-lg font-medium mb-3">Circle Information</h3>
            {editMode ? (
              <>
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1">Circle Name</label>
                  <input
                    type="text"
                    className="border rounded px-3 py-2 w-full"
                    value={circleName}
                    onChange={(e) => setCircleName(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    className="border rounded px-3 py-2 w-full"
                    value={circleDescription}
                    onChange={(e) => setCircleDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdateCircle}
                    className="bg-blue-500 text-white px-4 py-2 rounded"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    className="bg-gray-300 text-gray-800 px-4 py-2 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mb-2"><strong>Name:</strong> {circleInfo.name}</p>
                <p className="mb-2"><strong>Description:</strong> {circleInfo.description || "No description"}</p>
                <p className="mb-4"><strong>Privacy:</strong> {circleInfo.is_private ? "Private" : "Public"}</p>
                {isOwner && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditMode(true)}
                      className="bg-blue-500 text-white px-4 py-2 rounded text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleDeleteCircle}
                      className="bg-red-500 text-white px-4 py-2 rounded text-sm"
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Deleting..." : "Delete Circle"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Add Member - Only for admins/owner */}
        {(isAdmin || isOwner) && (
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              placeholder="Enter username to invite"
              className="border rounded px-3 py-2 flex-1"
              value={newMemberUsername}
              onChange={(e) => setNewMemberUsername(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleAddMember();
              }}
            />
            <button
              onClick={handleAddMember}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
              disabled={!newMemberUsername.trim()}
            >
              Invite
            </button>
          </div>
        )}

        {/* Pending Requests - Only for admins/owner */}
        {(isAdmin || isOwner) && pendingRequests.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">Pending Join Requests</h3>
            <div className="space-y-3 max-h-[200px] overflow-y-auto">
              {pendingRequests.map((request) => (
                <div
                  key={request.profile_id}
                  className="flex justify-between items-center p-3 border rounded-lg"
                >
                  <div className="flex items-center">
                    <img
                      src={request.profiles.avatar_url || "/default-avatar.png"}
                      alt={request.profiles.username}
                      className="w-8 h-8 rounded-full mr-3"
                    />
                    <div>
                      <p className="font-medium">{request.profiles.username}</p>
                      <p className="text-sm text-gray-500">{request.profiles.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveRequest(request.profile_id)}
                      className="bg-green-500 text-white px-3 py-1 rounded text-sm"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectRequest(request.profile_id)}
                      className="bg-red-500 text-white px-3 py-1 rounded text-sm"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Member List */}
        <div>
          <h3 className="text-lg font-medium mb-3">Members ({members.length})</h3>
          {loading ? (
            <p>Loading members...</p>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {members.map((member) => (
                <div
                  key={member.profile_id}
                  className="flex justify-between items-center p-3 border rounded-lg"
                >
                  <div className="flex items-center">
                    <img
                      src={member.profiles.avatar_url || "/default-avatar.png"}
                      alt={member.profiles.username}
                      className="w-8 h-8 rounded-full mr-3"
                    />
                    <div>
                      <p className="font-medium">
                        {member.profiles.username}
                        {circleInfo?.creator_id === member.profile_id && " (Owner)"}
                        {member.is_admin && " (Admin)"}
                      </p>
                      <p className="text-sm text-gray-500">{member.profiles.email}</p>
                      <p className="text-xs text-gray-400">
                        Role: {member.role} | Status: {member.status}
                      </p>
                    </div>
                  </div>
                  
                  {/* Action buttons - Only show for admins/owner, but not for themselves unless they're not the owner */}
                  {(isAdmin || isOwner) && (
                    <div className="flex gap-2">
                      {isOwner && circleInfo?.creator_id !== member.profile_id && (
                        <button
                          onClick={() => handleMakeAdmin(member.profile_id, !member.is_admin)}
                          className={`px-3 py-1 rounded text-sm ${
                            member.is_admin 
                              ? "bg-yellow-500 text-white" 
                              : "bg-gray-500 text-white"
                          }`}
                        >
                          {member.is_admin ? "Remove Admin" : "Make Admin"}
                        </button>
                      )}
                      
                      {circleInfo?.creator_id !== member.profile_id && (
                        <button
                          onClick={() => handleRemoveMember(member.profile_id)}
                          className="bg-red-500 text-white px-3 py-1 rounded text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CircleSettingsModal;