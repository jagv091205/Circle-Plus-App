import { FaRegCommentDots } from "react-icons/fa6";
import { ReactElement } from "react";

interface CommentButtonProps {
  onClick: () => void;
}

export default function CommentButton({ onClick }: CommentButtonProps): ReactElement {
  return (
    <button onClick={onClick}>
      {FaRegCommentDots({})}
    </button>
  );
}