import { useNavigate } from "react-router-dom";
import { ReactElement } from "react";
import NotificationsPage from "./NotificationsPage";

export default function NotificationBell(): ReactElement {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/NotificationsPage")}
      className="btn btn-light position-relative"
    >
      <i className="bi bi-bell-fill text-dark fs-5" />
    </button>
  );
}
