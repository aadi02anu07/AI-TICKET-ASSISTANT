import { useEffect, useState } from "react";

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ role: "", skills: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    email: "",
    password: "",
    role: "moderator",
    skills: "",
  });
  const [addLoading, setAddLoading] = useState(false);

  const token = localStorage.getItem("token");
  let currentUser = null;
  try {
    const stored = localStorage.getItem("user");
    if (stored) currentUser = JSON.parse(stored);
  } catch (err) {
    console.error("Failed to parse user from localStorage", err);
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/auth/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data);
        setFilteredUsers(data);
      } else {
        console.error(data.error);
      }
    } catch (err) {
      console.error("Error fetching users", err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddModerator = async (e) => {
    e.preventDefault();
    if (!addForm.email.trim()) {
      alert("Email is required");
      return;
    }

    setAddLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/auth/create-moderator`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: addForm.email.trim(),
            password: addForm.password.trim() || undefined,
            role: addForm.role,
            skills: addForm.skills,
          }),
        }
      );

      const data = await res.json();
      if (res.ok) {
        alert("Moderator added successfully!");
        setAddForm({
          email: "",
          password: "",
          role: "moderator",
          skills: "",
        });
        setShowAddForm(false);
        fetchUsers();
      } else {
        alert(data.error || "Failed to add moderator");
      }
    } catch (err) {
      console.error("Error creating moderator:", err);
      alert("Something went wrong while adding moderator");
    } finally {
      setAddLoading(false);
    }
  };

  const handleEditClick = (user) => {
    setEditingUser(user.email);
    setFormData({
      role: user.role,
      skills: user.skills?.join(", "),
    });
  };

  const handleDelete = async (user) => {
    if (
      !window.confirm(
        `Are you sure you want to delete user "${user.email}"? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/auth/users/${user._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
      if (res.ok) {
        fetchUsers();
      } else {
        alert(data.error || "Failed to delete user");
      }
    } catch (err) {
      console.error("Delete failed", err);
      alert("Something went wrong while deleting user");
    }
  };

  const handleUpdate = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/auth/update-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: editingUser,
            role: formData.role,
            skills: formData.skills
              .split(",")
              .map((skill) => skill.trim())
              .filter(Boolean),
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        console.error(data.error || "Failed to update user");
        return;
      }

      setEditingUser(null);
      setFormData({ role: "", skills: "" });
      fetchUsers();
    } catch (err) {
      console.error("Update failed", err);
    }
  };

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    setFilteredUsers(
      users.filter((user) => user.email.toLowerCase().includes(query))
    );
  };

  return (
    <div className="max-w-4xl mx-auto mt-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Panel - Manage Users</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn btn-primary btn-sm"
        >
          {showAddForm ? "✕ Close" : "+ Add Moderator"}
        </button>
      </div>

      {showAddForm && (
        <div className="card bg-base-100 shadow rounded p-5 mb-6 border">
          <h2 className="text-lg font-bold mb-3">Add Moderator</h2>
          <form onSubmit={handleAddModerator} className="space-y-3">
            <div>
              <label className="text-sm font-medium block mb-1">
                Email Address <span className="text-error">*</span>
              </label>
              <input
                type="email"
                placeholder="moderator@example.com"
                className="input input-bordered w-full"
                value={addForm.email}
                onChange={(e) =>
                  setAddForm({ ...addForm, email: e.target.value })
                }
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">
                Password{" "}
                <span className="text-xs text-gray-500 font-normal">
                  (Optional - defaults to moderator123)
                </span>
              </label>
              <input
                type="password"
                placeholder="Leave blank for default (moderator123)"
                className="input input-bordered w-full"
                value={addForm.password}
                onChange={(e) =>
                  setAddForm({ ...addForm, password: e.target.value })
                }
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Role</label>
              <select
                className="select select-bordered w-full"
                value={addForm.role}
                onChange={(e) =>
                  setAddForm({ ...addForm, role: e.target.value })
                }
              >
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">
                Skills{" "}
                <span className="text-xs text-gray-500 font-normal">
                  (Comma-separated, e.g. react, nodejs, support)
                </span>
              </label>
              <input
                type="text"
                placeholder="react, nodejs, mongodb"
                className="input input-bordered w-full"
                value={addForm.skills}
                onChange={(e) =>
                  setAddForm({ ...addForm, skills: e.target.value })
                }
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="btn btn-success btn-sm"
                disabled={addLoading}
              >
                {addLoading ? "Creating..." : "Create Moderator"}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <input
        type="text"
        className="input input-bordered w-full mb-6"
        placeholder="Search by email"
        value={searchQuery}
        onChange={handleSearch}
      />
      {filteredUsers.map((user) => (
        <div
          key={user._id}
          className="bg-base-100 shadow rounded p-4 mb-4 border"
        >
          <div className="flex items-center gap-2">
            <p>
              <strong>Email:</strong> {user.email}
            </p>
            {currentUser?.email === user.email && (
              <span className="badge badge-neutral text-xs">You</span>
            )}
          </div>
          <p>
            <strong>Current Role:</strong> {user.role}
          </p>
          <p>
            <strong>Skills:</strong>{" "}
            {user.skills && user.skills.length > 0
              ? user.skills.join(", ")
              : "N/A"}
          </p>

          {editingUser === user.email ? (
            <div className="mt-4 space-y-2">
              <select
                className="select select-bordered w-full"
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
              >
                <option value="user">User</option>
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
              </select>

              <input
                type="text"
                placeholder="Comma-separated skills"
                className="input input-bordered w-full"
                value={formData.skills}
                onChange={(e) =>
                  setFormData({ ...formData, skills: e.target.value })
                }
              />

              <div className="flex gap-2">
                <button
                  className="btn btn-success btn-sm"
                  onClick={handleUpdate}
                >
                  Save
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setEditingUser(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 mt-2">
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleEditClick(user)}
              >
                Edit
              </button>
              {currentUser?.email !== user.email && (
                <button
                  className="btn btn-error btn-sm"
                  onClick={() => handleDelete(user)}
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
