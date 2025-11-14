import { AppScreen } from "@/components/layout/AppScreen";
import { ScreenMessage } from "@/components/common/ScreenMessage";

export default function ChatsScreen() {
  return (
    <AppScreen backgroundColor="#ffffff">
      <ScreenMessage
        title="Chats"
        subtitle="Conversations with buyers and sellers will appear here."
      />
    </AppScreen>
  );
}
