import { useLocation } from "react-router-dom";
import ChatWithUsButton from "../home/ChatWithUsButton";

function FloatingCornerActions() {
  const { pathname } = useLocation();
  const showChat = pathname === "/";

  if (!showChat) return null;

  return (
    <div className="pointer-events-none fixed bottom-24 right-4 z-[140] lg:bottom-8 lg:right-6">
      <div className="pointer-events-auto">
        <ChatWithUsButton placement="inline" />
      </div>
    </div>
  );
}

export default FloatingCornerActions;
