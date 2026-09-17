import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function Tickets() {
  const [form, setForm] = useState({ title: "", description: "" });
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  let currentUser = null;
  try {
    const stored = localStorage.getItem("user");
    if (stored) currentUser = JSON.parse(stored);
  } catch (err) {
    console.error(err);
  }
  const isAdmin = currentUser?.role === "admin";

  const fetchTickets = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/tickets`, {
        headers: { Authorization: `Bearer ${token}` },
        method: "GET",
      });
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (err) {
      console.error("Failed to fetch tickets:", err);
    }
  };

  const handleDeleteTicket = async (e, ticketId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to permanently delete this ticket?")) return;
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/tickets/${ticketId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();
      if (res.ok) {
        fetchTickets();
      } else {
        alert(data.message || "Failed to delete ticket");
      }
    } catch (err) {
      console.error("Error deleting ticket:", err);
      alert("Failed to delete ticket");
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        setForm({ title: "", description: "" });
        fetchTickets(); // Refresh list
      } else {
        alert(data.message || "Ticket creation failed");
      }
    } catch (err) {
      alert("Error creating ticket");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Create Ticket</h2>

      <form onSubmit={handleSubmit} className="space-y-3 mb-8">
        <input
          name="title"
          value={form.title}
          onChange={handleChange}
          placeholder="Ticket Title"
          className="input input-bordered w-full"
          required
        />
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Ticket Description"
          className="textarea textarea-bordered w-full"
          required
        ></textarea>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Submitting..." : "Submit Ticket"}
        </button>
      </form>

      <h2 className="text-xl font-semibold mb-2">All Tickets</h2>
      <div className="space-y-3">
        {tickets.map((ticket) => (
          <div
            key={ticket._id}
            className="card shadow-md p-4 bg-gray-800 flex flex-row items-center justify-between"
          >
            <Link
              to={`/tickets/${ticket._id}`}
              className="flex-1 pr-4"
            >
              <h3 className="font-bold text-lg">{ticket.title}</h3>
              <p className="text-sm">{ticket.description}</p>
              <p className="text-sm text-gray-500">
                Created At: {new Date(ticket.createdAt).toLocaleString()}
              </p>
            </Link>
            {isAdmin && (
              <button
                onClick={(e) => handleDeleteTicket(e, ticket._id)}
                className="btn btn-error btn-xs"
              >
                Delete
              </button>
            )}
          </div>
        ))}
        {tickets.length === 0 && <p>No tickets submitted yet.</p>}
      </div>
    </div>
  );
}
