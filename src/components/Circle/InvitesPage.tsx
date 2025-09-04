import InvitesPanel from "../../components/Circle/InvitesPanel";
import { useAuth } from "../../context/AuthContext";

export default function InvitesPage() {
  const { user } = useAuth();

  if (!user) return <p>Loading...</p>;

  return (
    <div className="max-w-xl mx-auto mt-10">
      <InvitesPanel userId={user.id} />
    </div>
  );
}
