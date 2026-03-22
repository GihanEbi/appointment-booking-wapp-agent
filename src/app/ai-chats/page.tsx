import { AppShell } from "@/components/layout/AppShell";
import { MessageCircle, Bot, User, Send } from "lucide-react";

const conversations = [
  {
    id: 1,
    name: "Sarah Jenkins",
    phone: "+1 234 567 8900",
    lastMessage: "Great! I'll be there at 10 AM tomorrow.",
    time: "2m ago",
    unread: 0,
    avatar: "SJ",
    status: "resolved",
  },
  {
    id: 2,
    name: "Mark Thompson",
    phone: "+1 456 789 0123",
    lastMessage: "What are your prices for a full package?",
    time: "15m ago",
    unread: 2,
    avatar: "MT",
    status: "active",
  },
  {
    id: 3,
    name: "Elena Rodriguez",
    phone: "+1 987 654 3210",
    lastMessage: "Can I reschedule my Friday appointment?",
    time: "1h ago",
    unread: 1,
    avatar: "ER",
    status: "active",
  },
  {
    id: 4,
    name: "James Carter",
    phone: "+1 321 654 9870",
    lastMessage: "Thanks for the holiday offer! Booking for Dec 24.",
    time: "3h ago",
    unread: 0,
    avatar: "JC",
    status: "resolved",
  },
];

const activeChat = conversations[1];
const chatMessages = [
  { role: "ai", text: "Hi Mark! Welcome to Studio Pulse. How can I help you today? 😊", time: "2:30 PM" },
  { role: "user", text: "Hi! I'd like to know about your full package pricing.", time: "2:31 PM" },
  { role: "ai", text: "Great! Our Full Package includes a haircut, beard trim, and scalp massage. It's priced at $75. Would you like to book a slot?", time: "2:31 PM" },
  { role: "user", text: "That sounds good. What times are available this week?", time: "2:32 PM" },
  { role: "ai", text: "We have availability on: Thursday at 2 PM, Friday at 11 AM, and Saturday at 9 AM. Which works best for you?", time: "2:32 PM" },
  { role: "user", text: "What are your prices for a full package?", time: "2:45 PM" },
];

export default function AIChatsPage() {
  return (
    <AppShell>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--on-surface)" }}>
            AI Interaction Monitor
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--on-surface-variant)" }}>
            Monitor and manage all AI-handled WhatsApp conversations in real time.
          </p>
        </div>

        <div
          className="grid grid-cols-1 lg:grid-cols-3 gap-4 rounded-2xl overflow-hidden"
          style={{ height: "calc(100vh - 220px)", minHeight: 500 }}
        >
          {/* Conversation list */}
          <div
            className="overflow-y-auto p-2 space-y-1"
            style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 12px 32px rgba(20,29,36,0.06)", borderRadius: "1.5rem" }}
          >
            <div className="px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--on-surface-variant)" }}>
                {conversations.length} Conversations
              </p>
            </div>
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.01]"
                style={{
                  background: conv.id === activeChat.id ? "var(--surface-container-low)" : "transparent",
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{
                    background: "linear-gradient(135deg, var(--primary), var(--primary-container))",
                    color: "var(--on-primary)",
                  }}
                >
                  {conv.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--on-surface)" }}>
                      {conv.name}
                    </p>
                    <span className="text-xs flex-shrink-0 ml-1" style={{ color: "var(--on-surface-variant)" }}>
                      {conv.time}
                    </span>
                  </div>
                  <p className="text-xs truncate mt-0.5" style={{ color: "var(--on-surface-variant)" }}>
                    {conv.lastMessage}
                  </p>
                </div>
                {conv.unread > 0 && (
                  <span
                    className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 text-white"
                    style={{ background: "var(--primary)" }}
                  >
                    {conv.unread}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Chat window */}
          <div
            className="lg:col-span-2 flex flex-col rounded-2xl overflow-hidden"
            style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 12px 32px rgba(20,29,36,0.06)" }}
          >
            {/* Chat header */}
            <div
              className="flex items-center gap-3 px-5 py-4"
              style={{ borderBottom: "1px solid var(--outline-variant)" }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold"
                style={{
                  background: "linear-gradient(135deg, var(--primary), var(--primary-container))",
                  color: "var(--on-primary)",
                }}
              >
                {activeChat.avatar}
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>
                  {activeChat.name}
                </p>
                <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>
                  {activeChat.phone} · AI Handling
                </p>
              </div>
              <div
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ background: "var(--primary-container)", color: "var(--on-primary-container)" }}
              >
                <Bot className="w-3 h-3" />
                AI Active
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: msg.role === "ai"
                        ? "linear-gradient(135deg, var(--primary), var(--primary-container))"
                        : "var(--surface-container-high)",
                    }}
                  >
                    {msg.role === "ai"
                      ? <Bot className="w-4 h-4 text-white" />
                      : <User className="w-4 h-4" style={{ color: "var(--on-surface-variant)" }} />
                    }
                  </div>
                  <div
                    className={`max-w-[75%] px-3 py-2 rounded-2xl ${msg.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm"}`}
                    style={{
                      background: msg.role === "user"
                        ? "var(--secondary-container)"
                        : "var(--surface-container-low)",
                      color: "var(--on-surface)",
                    }}
                  >
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                    <p className="text-xs mt-1" style={{ color: "var(--on-surface-variant)" }}>
                      {msg.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div
              className="flex gap-2 items-center p-4"
              style={{ borderTop: "1px solid var(--outline-variant)" }}
            >
              <input
                type="text"
                placeholder="Send a manual message..."
                className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{
                  background: "var(--surface-container-low)",
                  color: "var(--on-surface)",
                }}
              />
              <button
                className="btn-primary w-10 h-10 flex items-center justify-center flex-shrink-0 rounded-xl"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="h-16 lg:hidden" />
      </div>
    </AppShell>
  );
}
