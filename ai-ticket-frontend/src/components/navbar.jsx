import { Link, useNavigate, useLocation } from "react-router-dom";

export default function Navbar() {
  useLocation();
  const token = localStorage.getItem("token");
  let user = null;
  try {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      user = JSON.parse(storedUser);
    }
  } catch (err) {
    console.error("Failed to parse user from localStorage:", err);
  }
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };
  return (
    <div className="navbar bg-base-200">
      <div className="flex-1">
        <Link to="/" className="btn btn-ghost text-xl">
          IntelliDesk
        </Link>
      </div>
      <div className="flex gap-2 items-center">
        {!token ? (
          <>
            <Link to="/signup" className="btn btn-sm">
              Signup
            </Link>
            <Link to="/login" className="btn btn-sm">
              Login
            </Link>
          </>
        ) : (
          <>
            <p>Hi, {user?.email}</p>
            {user && user?.role === "admin" ? (
              <Link to="/admin" className="btn btn-sm">
                Admin
              </Link>
            ) : null}
            <button onClick={logout} className="btn btn-sm">
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
}
