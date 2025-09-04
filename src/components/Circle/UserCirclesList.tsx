import { useEffect, useState } from 'react';
import { fetchUserCircles } from '../../services/circleService';

type Circle = {
  id: string;
  name: string;
  description: string;
  is_private: boolean;
  is_admin?: boolean;
  status?: string;
};

const UserCirclesList = ({ userId }: { userId: string }) => {
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCircles = async () => {
      const data = await fetchUserCircles(userId);
      setCircles(data);
      setLoading(false);
    };

    loadCircles();
  }, [userId]);

  if (loading) return <div>Loading circles...</div>;

  return (
    <div className="space-y-2">
      {circles.map((circle) => (
        <div
          key={circle.id}
          className="border rounded-xl p-3 shadow-sm hover:bg-gray-50 transition"
        >
          <div className="flex justify-between">
            <div>
              <h3 className="font-semibold">{circle.name}</h3>
              <p className="text-sm text-gray-600">{circle.description}</p>
            </div>
            <span className="text-xs bg-gray-200 rounded px-2 py-1">
              {circle.is_private ? 'Private' : 'Public'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default UserCirclesList;
