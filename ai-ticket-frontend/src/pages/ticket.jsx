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

  let currentUser = null;
  try {
    const stored = localStorage.getItem("user");
    if (stored) currentUser = JSON.parse(stored);
  } catch (err) {
    console.error(err);
  }
  const isAdmin = currentUser?.role === "admin";
  const [deleting, setDeleting] = useState(false);

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
          setTicket(null);
        }
      } catch (err) {
        console.error(err);
        setTicket(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [id, token]);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to permanently delete this ticket?")) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/tickets/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();
      if (res.ok) {
        alert("Ticket deleted successfully");
        navigate("/");
      } else {
        alert(data.message || "Failed to delete ticket");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong deleting the ticket");
    } finally {
      setDeleting(false);
    }
  };

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
  if (!ticket)
    return (
      <div className="max-w-md mx-auto mt-16 p-6 card bg-gray-800 shadow-xl border text-center">
        <h2 className="text-xl font-bold mb-2">Ticket Not Found</h2>
        <p className="text-gray-400 text-sm mb-4">
          This ticket does not exist or has already been deleted.
        </p>
        <button
          onClick={() => navigate("/")}
          className="btn btn-primary btn-sm mx-auto"
        >
          ← Back to All Tickets
        </button>
      </div>
    );

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

            <div className="flex gap-2 items-center mt-3 pt-2">
              {ticket.status !== "RESOLVED" && (
                <button
                  onClick={handleResolve}
                  disabled={resolving}
                  className="btn btn-success btn-sm"
                >
                  {resolving ? "Resolving..." : "Mark as Resolved"}
                </button>
              )}

              {isAdmin && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="btn btn-error btn-sm"
                >
                  {deleting ? "Deleting..." : "Delete Ticket"}
                </button>
              )}
            </div>

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
