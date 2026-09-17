import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Navbar from "./components/navbar.jsx";
import CheckAuth from "./components/check-auth.jsx";
import Tickets from "./pages/tickets.jsx";
import TicketDetailsPage from "./pages/ticket.jsx";
import Login from "./pages/login.jsx";
import Signup from "./pages/signup.jsx";
import Admin from "./pages/admin.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route
              path="/"
              element={
                <CheckAuth protected={true}>
                  <Tickets />
                </CheckAuth>
              }
            />
            <Route
              path="/tickets/:id"
              element={
                <CheckAuth protected={true}>
                  <TicketDetailsPage />
                </CheckAuth>
              }
            />
            <Route
              path="/login"
              element={
                <CheckAuth protected={false}>
                  <Login />
                </CheckAuth>
              }
            />
            <Route
              path="/signup"
              element={
                <CheckAuth protected={false}>
                  <Signup />
                </CheckAuth>
              }
            />
            <Route
              path="/admin"
              element={
                <CheckAuth protected={true}>
                  <Admin />
                </CheckAuth>
              }
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  </StrictMode>
);
