import { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom'; // Add this import
import { ChevronLeft, ChevronRight } from 'lucide-react'; // for collapse button icons

type Circle = {
  id: string;
  name: string;
  is_private: boolean;
  status: 'active' | 'pending' | 'none';
  is_owner: boolean;
};

interface SidebarProps {
  onCircleSelect: (circleId: string) => void;
  darkMode?: boolean;
}

export default function Sidebar({ onCircleSelect, darkMode = false }: SidebarProps) {
  const { user } = useAuth();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false); // 👈 collapse state
  const navigate = useNavigate(); // Add this

  useEffect(() => {
    if (!user) return;
    loadCircles();
  }, [user]);

  const loadCircles = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .rpc('get_user_circles', { user_id: user.id });
      if (error) {
        console.error("Error calling get_user_circles:", error);
        await loadCirclesManual();
        return;
      }
      const formattedCircles: Circle[] = (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        is_private: item.is_private,
        status: item.status as 'active' | 'pending' | 'none',
        is_owner: Boolean(item.is_owner)
      }));
      const uniqueCircles = formattedCircles.filter((circle, index, self) =>
        index === self.findIndex(c => c.id === circle.id)
      );
      setCircles(uniqueCircles);
    } catch (error) {
      console.error("Error loading circles:", error);
      await loadCirclesManual();
    } finally {
      setLoading(false);
    }
  };

  const loadCirclesManual = async () => {
    try {
      if (!user) return;

      const { data: ownedCircles, error: ownedError } = await supabase
        .from('circles')
        .select('*')
        .eq('creator_id', user.id);
      if (ownedError) console.error("Error fetching owned circles:", ownedError);

      const { data: memberships, error: membersError } = await supabase
        .from('circle_members')
        .select('circle_id, status')
        .eq('profile_id', user.id);
      if (membersError) console.error("Error fetching memberships:", membersError);

      const memberCircleIds = memberships?.map(m => m.circle_id) || [];
      let memberCircles: any[] = [];
      if (memberCircleIds.length > 0) {
        const { data: circleData, error: circleError } = await supabase
          .from('circles')
          .select('*')
          .in('id', memberCircleIds);
        if (circleError) console.error("Error fetching member circles:", circleError);
        memberCircles = circleData || [];
      }

      const validMemberCircles = memberCircles
        .map(circle => {
          const membership = memberships?.find(m => m.circle_id === circle.id);
          const isOwned = ownedCircles?.some(oc => oc.id === circle.id);
          if (isOwned) return null;

          return {
            id: circle.id,
            name: circle.name,
            is_private: circle.is_private,
            status: (membership?.status as 'active' | 'pending' | 'none') || 'none',
            is_owner: false
          };
        })
        .filter((circle): circle is Circle => circle !== null);

      const formattedCircles: Circle[] = [
        ...(ownedCircles?.map(circle => ({
          id: circle.id,
          name: circle.name,
          is_private: circle.is_private,
          status: 'active' as const,
          is_owner: true
        })) || []),
        ...validMemberCircles
      ];
      
      setCircles(formattedCircles);
    } catch (error) {
      console.error("Error in manual circle loading:", error);
    }
  };

  const handleCircleSelect = (circleId: string) => {
    onCircleSelect(circleId);
  };

  const activeCircles = circles.filter((circle) => circle.status === 'active');
  const pendingCircles = circles.filter((circle) => circle.status === 'pending');

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside
        className={`transition-all duration-300 ${
          collapsed ? 'w-0 p-0 overflow-hidden' : 'w-60 p-4'
        } h-screen overflow-y-auto shadow-md ${
          darkMode ? 'bg-gray-800 text-gray-100' : 'bg-gray-100 text-gray-900'
        }`}
      >
        {!collapsed && (
          <>
            <h2 className="text-lg font-semibold mb-4">My Circles</h2>
            {loading ? (
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Loading...
              </p>
            ) : circles.length === 0 ? (
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                No circles joined.
              </p>
            ) : (
              <>
                {activeCircles.length > 0 && (
                  <div className="mb-4">
                    <h3
                      className={`text-sm font-medium mb-2 ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      Active Circles
                    </h3>
                    <ul className="space-y-2">
                      {activeCircles.map((circle) => (
                        <li key={circle.id}>
                          <button
                            onClick={() => handleCircleSelect(circle.id)}
                            className={`w-full text-left px-4 py-2 rounded shadow transition ${
                              darkMode
                                ? 'bg-gray-700 hover:bg-gray-600 text-gray-100'
                                : 'bg-white hover:bg-blue-100 text-gray-900'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{circle.name}</span>
                              {circle.is_owner && (
                                <span className="text-xs bg-blue-500 text-white px-1 rounded">
                                  Owner
                                </span>
                              )}
                            </div>
                            <span
                              className={`text-xs ml-2 ${
                                darkMode ? 'text-gray-400' : 'text-gray-500'
                              }`}
                            >
                              ({circle.is_private ? 'private' : 'public'})
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {pendingCircles.length > 0 && (
                  <div>
                    <h3
                      className={`text-sm font-medium mb-2 ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      Pending Invitations
                    </h3>
                    <ul className="space-y-2">
                      {pendingCircles.map((circle) => (
                        <li key={circle.id}>
                          <div
                            className={`w-full text-left px-4 py-2 rounded shadow cursor-not-allowed ${
                              darkMode
                                ? 'bg-yellow-900 text-yellow-200'
                                : 'bg-yellow-100 text-gray-900'
                            }`}
                          >
                            {circle.name}
                            <span
                              className={`text-xs ml-2 ${
                                darkMode ? 'text-yellow-300' : 'text-yellow-600'
                              }`}
                            >
                              (Pending Approval)
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </aside>

      {/* Collapse/Expand Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={`flex items-center justify-center w-6 h-20 mt-4 rounded-r-md shadow-md transition-colors ${
          darkMode
            ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </div>
  );
}
