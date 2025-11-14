import { AppScreen } from "@/components/layout/AppScreen";
import { ScreenMessage } from "@/components/common/ScreenMessage";

export default function MeScreen() {
  return (
    <AppScreen backgroundColor="#ffffff">
      <ScreenMessage
        title="Me"
        subtitle="Manage your profile, listings, and account settings."
      />
    </AppScreen>
  );
}
