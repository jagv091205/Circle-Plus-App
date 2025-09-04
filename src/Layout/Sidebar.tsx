// import { useEffect, useState } from 'react';
// import { fetchUserCircles } from '../services/circleService';
// import { useAuth } from '../context/AuthContext';

// type Circle = {
//   id: string;
//   name: string;
//   is_private: boolean;
// };

// export default function Sidebar({ onCircleSelect }: { onCircleSelect: (circleId: string) => void }) {
//   const { user } = useAuth();
//   const [circles, setCircles] = useState<Circle[]>([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     if (!user) return;

//     const loadCircles = async () => {
//       try {
//         const data = await fetchUserCircles(user.id);
//         setCircles(data);
//       } catch (error) {
//         console.error("Error loading circles:", error);
//       } finally {
//         setLoading(false);
//       }
//     };

//     loadCircles();
//   }, [user]);

//   return (
//     <aside className="w-60 bg-gray-100 h-full p-4 shadow-md">
//       <h2 className="text-lg font-semibold mb-4">My Circles</h2>
//       {loading ? (
//         <p className="text-sm text-gray-500">Loading...</p>
//       ) : circles.length === 0 ? (
//         <p className="text-sm text-gray-500">No circles joined.</p>
//       ) : (
//         <ul className="space-y-2">
//           {circles.map((circle) => (
//             <li key={circle.id}>
//               <button
//                 onClick={() => onCircleSelect(circle.id)}
//                 className="w-full text-left px-4 py-2 bg-white rounded shadow hover:bg-blue-100 transition"
//               >
//                 {circle.name}
//                 <span className="text-xs text-gray-500 ml-2">
//                   ({circle.is_private ? 'private' : 'public'})
//                 </span>
//               </button>
//             </li>
//           ))}
//         </ul>
//       )}
//     </aside>
//   );
// }



import { useEffect, useState } from 'react';
import { fetchUserCircles, Circle } from '../services/circleService';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ onCircleSelect }: { onCircleSelect: (circleId: string) => void }) {
  const { user } = useAuth();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadCircles = async () => {
      try {
        const data = await fetchUserCircles(user.id);
        setCircles(data);
      } catch (error) {
        console.error("Error loading circles:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCircles();
  }, [user]);

  // Separate active and pending circles
  const activeCircles = circles.filter(circle => circle.status === 'active');
  const pendingCircles = circles.filter(circle => circle.status === 'pending');

  return (
    <aside className="w-60 bg-gray-100 h-full p-4 shadow-md">
      <h2 className="text-lg font-semibold mb-4">My Circles</h2>
      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : circles.length === 0 ? (
        <p className="text-sm text-gray-500">No circles joined.</p>
      ) : (
        <>
          {/* Active Circles */}
          {activeCircles.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Active Circles</h3>
              <ul className="space-y-2">
                {activeCircles.map((circle) => (
                  <li key={circle.id}>
                    <button
                      onClick={() => onCircleSelect(circle.id)}
                      className="w-full text-left px-4 py-2 bg-white rounded shadow hover:bg-blue-100 transition"
                    >
                      {circle.name}
                      <span className="text-xs text-gray-500 ml-2">
                        ({circle.is_private ? 'private' : 'public'})
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Pending Circles */}
          {pendingCircles.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Pending Invitations</h3>
              <ul className="space-y-2">
                {pendingCircles.map((circle) => (
                  <li key={circle.id}>
                    <div className="w-full text-left px-4 py-2 bg-yellow-100 rounded shadow cursor-not-allowed">
                      {circle.name}
                      <span className="text-xs text-yellow-600 ml-2">
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
    </aside>
  );
}