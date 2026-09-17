import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";

export default function TicketDetailsPage() {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);

  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SERVER_URL}/tickets/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const data = await res.json();
        if (res.ok) {
          setTicket(data.ticket);
        } else {
          alert(data.message || "Failed to fetch ticket");
        }
      } catch (err) {
        console.error(err);
        alert("Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [id]);

  const handleResolve = async () => {
    if (!window.confirm("Mark this ticket as resolved?")) return;
    setResolving(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/tickets/${id}/resolve`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();
      if (res.ok) {
        setTicket((prev) => ({ ...prev, status: "RESOLVED" }));
      } else {
        alert(data.message || "Failed to resolve ticket");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    } finally {
      setResolving(false);
    }
  };

  if (loading)
    return <div className="text-center mt-10">Loading ticket details...</div>;
  if (!ticket) return <div className="text-center mt-10">Ticket not found</div>;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="mb-4">
        <button
          onClick={() => navigate("/")}
          className="text-gray-400 hover:text-white transition-colors text-lg"
          aria-label="Back to tickets"
        >
          ← Back
        </button>
      </div>
      <h2 className="text-2xl font-bold mb-4">Ticket Details</h2>

      <div className="card bg-gray-800 shadow p-4 space-y-4">
        <h3 className="text-xl font-semibold">{ticket.title}</h3>
        <p>{ticket.description}</p>

        {/* Conditionally render extended details */}
        {ticket.status && (
          <>
            <div className="divider">Metadata</div>
            <p>
              <strong>Status:</strong>{" "}
              <span
                className={
                  ticket.status === "RESOLVED"
                    ? "text-green-400 font-semibold"
                    : ticket.status === "IN_PROGRESS"
                    ? "text-yellow-400 font-semibold"
                    : "text-gray-300"
                }
              >
                {ticket.status}
              </span>
            </p>
            {ticket.priority && (
              <p>
                <strong>Priority:</strong> {ticket.priority}
              </p>
            )}

            {ticket.relatedSkills?.length > 0 && (
              <p>
                <strong>Related Skills:</strong>{" "}
                {ticket.relatedSkills.join(", ")}
              </p>
            )}

            {ticket.helpfulNotes && (
              <div>
                <strong>Helpful Notes:</strong>
                <div className="prose max-w-none rounded mt-2">
                  <ReactMarkdown>{ticket.helpfulNotes}</ReactMarkdown>
                </div>
              </div>
            )}

            <p>
              <strong>Assigned To:</strong>{" "}
              {typeof ticket.assignedTo === "object"
                ? ticket.assignedTo?.email || "Unassigned"
                : ticket.assignedTo || "Unassigned"}
            </p>

            {ticket.createdAt && (
              <p className="text-sm text-gray-500 mt-2">
                Created At: {new Date(ticket.createdAt).toLocaleString()}
              </p>
            )}

            {ticket.status !== "RESOLVED" && (
              <button
                onClick={handleResolve}
                disabled={resolving}
                className="btn btn-success btn-sm mt-2"
              >
                {resolving ? "Resolving..." : "Mark as Resolved"}
              </button>
            )}

            {ticket.status === "RESOLVED" && (
              <p className="text-green-400 font-semibold mt-2">
                This ticket has been resolved.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
