import { supabase } from './supabaseClient';

export type Circle = {
  id: string;
  name: string;
  description: string;
  is_private: boolean;
  is_admin?: boolean;
  status?: string;
};

export const fetchUserCircles = async (userId: string): Promise<Circle[]> => {
  console.log(`Fetching circles for user: ${userId}`);
  const { data, error } = await supabase
    .from('circle_members')
    .select(`
      is_admin,
      status,
      circles (
        id,
        name,
        description,
        is_private
      )
    `)
    .eq('profile_id', userId)
    .in('status', ['active', 'pending']); // Fetch both active AND pending circles

  if (error) {
    console.error('Error fetching user circles:', error);
    return [];
  }

  console.log('Fetched circles:', data);
  return data.map((item: any) => ({
    id: item.circles.id,
    name: item.circles.name,
    description: item.circles.description,
    is_private: item.circles.is_private,
    is_admin: item.is_admin,
    status: item.status,
  }));
};