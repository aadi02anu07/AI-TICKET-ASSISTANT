import { useState, useEffect, useRef } from "react";

export default function TicketChat({ ticketId, ticket, currentUser, token }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);

  // Normalize creator and assignedTo IDs and emails
  const creatorId =
    typeof ticket?.createdBy === "object"
      ? ticket?.createdBy?._id
      : ticket?.createdBy;

  const assignedModeratorId =
    typeof ticket?.assignedTo === "object"
      ? ticket?.assignedTo?._id
      : ticket?.assignedTo;

  const assignedModeratorEmail =
    typeof ticket?.assignedTo === "object"
      ? ticket?.assignedTo?.email
      : ticket?.assignedTo;

  const isCreator =
    currentUser?._id &&
    creatorId &&
    currentUser._id.toString() === creatorId.toString();

  const isAssignedModerator =
    (currentUser?._id &&
      assignedModeratorId &&
      currentUser._id.toString() === assignedModeratorId.toString()) ||
    (currentUser?.email &&
      assignedModeratorEmail &&
      currentUser.email.toLowerCase() ===
        assignedModeratorEmail.toString().toLowerCase());

  const isAdmin = currentUser?.role === "admin";

  // Check if Gemini analysis has completed and moderator is assigned
  const isGeminiReady = Boolean(ticket?.helpfulNotes && ticket?.assignedTo);

  // Chat is only visible to the creator, assigned moderator, or admin
  const canAccessChat = (isCreator || isAssignedModerator || isAdmin) && isGeminiReady;

  const fetchMessages = async () => {
    if (!token || !ticketId) return;
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/tickets/${ticketId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();
      if (res.ok) {
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  };

  // Poll for messages when chat drawer/modal is open
  useEffect(() => {
    if (!isOpen || !canAccessChat) return;

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [isOpen, ticketId, canAccessChat]);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    setSending(true);
    setError("");
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/tickets/${ticketId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text: inputText }),
        }
      );

      const data = await res.json();
      if (res.ok) {
        setInputText("");
        setMessages(data.messages || []);
      } else {
        setError(data.message || "Failed to send message");
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (!canAccessChat) {
    return null;
  }

  const otherRoleLabel = isCreator
    ? "Moderator"
    : isAssignedModerator
    ? "User"
    : "Participant";

  return (
    <div className="mt-4">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-primary btn-sm flex items-center gap-2 shadow-lg transition-transform active:scale-95"
        id="ticket-chat-toggle-btn"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <span>
          {isOpen
            ? "Close Chat"
            : isCreator
            ? "Chat with Moderator"
            : isAssignedModerator
            ? "Chat with User"
            : "Discussion Chat"}
        </span>
        {messages.length > 0 && (
          <span className="badge badge-xs badge-neutral">
            {messages.length}
          </span>
        )}
      </button>

      {/* Chat Window Panel */}
      {isOpen && (
        <div className="mt-3 card bg-gray-900 border border-gray-700 shadow-2xl rounded-xl overflow-hidden transition-all animate-in fade-in slide-in-from-top-2">
          {/* Header */}
          <div className="bg-gray-800/80 px-4 py-3 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
              <h4 className="font-bold text-sm text-gray-100">
                Ticket Discussion
              </h4>
              <span className="text-xs text-gray-400">
                (Talking with {otherRoleLabel})
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white text-xs font-bold px-2 py-1 rounded hover:bg-gray-700 transition-colors"
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>

          {/* Messages Stream */}
          <div className="p-4 h-72 overflow-y-auto space-y-3 bg-gray-950/60 flex flex-col">
            {messages.length === 0 ? (
              <div className="m-auto text-center p-6 text-gray-400 text-xs">
                <div className="text-2xl mb-2">💬</div>
                <p className="font-semibold">No messages yet.</p>
                <p className="text-gray-500 mt-1">
                  Start the conversation directly with the {otherRoleLabel.toLowerCase()}!
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isMe =
                  (currentUser?._id &&
                    msg.sender?.toString() === currentUser._id.toString()) ||
                  (currentUser?.email &&
                    msg.senderEmail?.toLowerCase() ===
                      currentUser.email.toLowerCase());

                const roleBadgeClass =
                  msg.senderRole === "moderator"
                    ? "badge-secondary"
                    : msg.senderRole === "admin"
                    ? "badge-warning"
                    : "badge-info";

                return (
                  <div
                    key={msg._id || idx}
                    className={`flex flex-col ${
                      isMe ? "items-end" : "items-start"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-gray-400">
                      <span className="font-medium text-gray-300">
                        {isMe ? "You" : msg.senderEmail}
                      </span>
                      <span className={`badge badge-xs ${roleBadgeClass}`}>
                        {msg.senderRole}
                      </span>
                      <span>•</span>
                      <span>
                        {msg.createdAt
                          ? new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </span>
                    </div>

                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm break-words shadow-sm ${
                        isMe
                          ? "bg-indigo-600 text-white rounded-tr-none"
                          : "bg-gray-800 text-gray-100 rounded-tl-none border border-gray-700"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Footer */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 bg-gray-900 border-t border-gray-800 flex gap-2 items-center"
          >
            <input
              type="text"
              placeholder={`Message the ${otherRoleLabel.toLowerCase()}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="input input-bordered input-sm flex-1 bg-gray-800 text-gray-100 text-sm focus:outline-none focus:border-indigo-500"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || sending}
              className="btn btn-primary btn-sm px-4 flex items-center gap-1"
            >
              {sending ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <>
                  <span>Send</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="px-4 py-1.5 bg-error/20 text-error text-xs border-t border-error/30">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
