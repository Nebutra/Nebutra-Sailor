import type { NotificationMessage } from "@nebutra/ui/primitives";
import { NotificationMessageList } from "@nebutra/ui/primitives";

const messages: NotificationMessage[] = [
  {
    title: "New deployment",
    time: "2m ago",
    content: "Production deploy succeeded in 42s",
    gradientColor: "from-green-400 to-emerald-600",
  },
  {
    title: "Security alert",
    time: "15m ago",
    content: "New login from Berlin, Germany",
    gradientColor: "from-red-400 to-pink-600",
  },
  {
    title: "Usage limit",
    time: "1h ago",
    content: "You've used 80% of your monthly API quota",
    gradientColor: "from-amber-400 to-orange-500",
  },
];

export function NotificationMessageListDemo() {
  return (
    <div className="max-w-md px-4 py-8 w-full">
      <NotificationMessageList messages={messages} />
    </div>
  );
}
