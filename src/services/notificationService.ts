import { supabase } from "./supabaseClient";

export const sendCircleInvitation = async (circleId: string, invitedUserId: string) => {
  const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !currentUser) {
    console.error("Error getting current user:", userError);
    return;
  }

  // Create invitation notification
  const { error } = await supabase.from("notifications").insert({
    recipient_id: invitedUserId,
    from_user: currentUser.id,
    type: "invite",
    circle_id: circleId,
    response_status: "pending",
    read: false
  });

  if (error) {
    console.error("Error sending invitation:", error);
  }
};

export const checkCircleMembership = async (circleId: string, userId: string) => {
  const { data, error } = await supabase
    .from("circle_members")
    .select("status")
    .eq("circle_id", circleId)
    .eq("profile_id", userId)
    .single();

  if (error) return null;
  return data?.status;
};