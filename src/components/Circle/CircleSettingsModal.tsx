import React, { useState, useEffect } from "react";
import { supabase } from "../../services/supabaseClient";
import { sendCircleInvitation } from "../../services/notificationService"; // Import the function

interface Member {
  profile_id: string;
  role: string;
  status: string;
  is_admin: boolean;
  profiles: {
    username: string;
    email: string;
  };
}

interface CircleSettingsModalProps {
  circleId: string;
  onClose: () => void;
}

const CircleSettingsModal: React.FC<CircleSettingsModalProps> = ({
  circleId,
  onClose,
}) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [newMemberUsername, setNewMemberUsername] = useState(""); // Changed from newMemberIdentifier
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, [circleId]);

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
          email
        )
      `)
      .eq("circle_id", circleId);

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
        },
      }));
      setMembers(formattedMembers);
    }
    setLoading(false);
  };

  // Fixed handleAddMember function
  // In CircleSettingsModal.tsx, update handleAddMember
const handleAddMember = async () => {
  if (!newMemberUsername.trim()) return;

  try {
    // Find user by username
    const { data: userData, error: userError } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", newMemberUsername.trim())
      .single();

    if (userError || !userData) {
      console.error("User not found");
      alert("User not found. Please check the username.");
      return;
    }

    // Check if user is already a member
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

    // Add to circle_members with pending status
    const { error: memberError } = await supabase
      .from("circle_members")
      .insert({
        circle_id: circleId,
        profile_id: userData.id,
        status: "pending",
        role: "member"
      });

    if (memberError) {
      console.error("Error adding member:", memberError);
      alert("Error adding member. Please try again.");
      return;
    }

    // Send invitation notification
    await sendCircleInvitation(circleId, userData.id);
    
    // Clear input and refresh members list
    setNewMemberUsername("");
    fetchMembers();
    
    alert("Invitation sent successfully!");
  } catch (error) {
    console.error("Error in handleAddMember:", error);
    alert("An error occurred. Please try again.");
  }
};

  const handleRemoveMember = async (profileId: string) => {
    const { error } = await supabase
      .from("circle_members")
      .delete()
      .eq("circle_id", circleId)
      .eq("profile_id", profileId);

    if (error) {
      console.error("Error removing member:", error);
    } else {
      await fetchMembers();
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg p-6 w-[500px] shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Circle Settings</h2>

        {/* Add Member */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Enter username"
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
            Add
          </button>
        </div>

        {/* Member List */}
        {loading ? (
          <p>Loading members...</p>
        ) : (
          <ul className="space-y-2 max-h-[300px] overflow-y-auto">
            {members.map((member) => (
              <li
                key={member.profile_id}
                className="flex justify-between items-center border-b pb-2"
              >
                <div>
                  <p className="font-medium">{member.profiles.username}</p>
                  <p className="text-sm text-gray-500">
                    {member.profiles.email}
                  </p>
                  <p className="text-xs text-gray-400">
                    Role: {member.role} | Status: {member.status}
                  </p>
                </div>
                <button
                  onClick={() => handleRemoveMember(member.profile_id)}
                  className="text-red-500 text-sm hover:text-red-700"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Close Button */}
        <div className="mt-4 flex justify-end">
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