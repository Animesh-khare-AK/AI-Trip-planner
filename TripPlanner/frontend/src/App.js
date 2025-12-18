import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
} from "react-router-dom";
import TripPlanner from "./pages/TripPlanner";
import Dashboard from "./pages/Dashboard";
import Hotels from "./pages/Hotels";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import { AuthProvider, useAuth } from "./context/AuthContext";
import "./Style.css";

// PrivateRoute component to protect routes
function PrivateRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" />;
}

// Navigation component with conditional rendering
function Navigation({ updateBackground }) {
  const { currentUser, logout } = useAuth();

  return (
    <nav className="app-nav">
      <ul className="nav-list">
        <li>
          <Link
            to="/"
            className="nav-link"
            onClick={() => updateBackground("/")}
          >
            Home
          </Link>
        </li>
        {currentUser && (
          <>
            <li>
              <Link
                to="/planner"
                className="nav-link"
                onClick={() => updateBackground("/planner")}
              >
                Plan a Trip
              </Link>
            </li>
            <li>
              <Link
                to="/hotels"
                className="nav-link"
                onClick={() => updateBackground("/hotels")}
              >
                Hotels
              </Link>
            </li>
            <li>
              <Link
                to="/dashboard"
                className="nav-link"
                onClick={() => updateBackground("/dashboard")}
              >
                Dashboard
              </Link>
            </li>
          </>
        )}

        {/* Auth links - change based on login status */}
        {currentUser ? (
          <li>
            <button
              className="nav-link logout-btn"
              onClick={() => {
                logout();
                updateBackground("/login");
              }}
            >
              Logout
            </button>
          </li>
        ) : (
          <>
            <li>
              <Link
                to="/login"
                className="nav-link"
                onClick={() => updateBackground("/login")}
              >
                Login
              </Link>
            </li>
            <li>
              <Link
                to="/signup"
                className="nav-link"
                onClick={() => updateBackground("/signup")}
              >
                Signup
              </Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}

function App() {
  const [backgroundImage, setBackgroundImage] = useState(
    "url('./images/home-bg.jpg')" // Default to home background
  );

  // Update background based on route
  const updateBackground = (route) => {
    switch (route) {
      case "/":
        setBackgroundImage("url('./images/home-bg.jpg')");
        break;
      case "/planner":
        setBackgroundImage("url('./images/planner-bg.jpg')");
        break;
      case "/hotels":
        setBackgroundImage("url('./images/pexels-pixabay-271639.jpg')");
        break;
      case "/dashboard":
        setBackgroundImage("url('./images/planner-bg.jpg')");
        break;
      case "/login":
        setBackgroundImage("url('./images/home-bg.jpg')");
        break;
      case "/signup":
        setBackgroundImage("url('./images/home-bg.jpg')");
        break;
      default:
        setBackgroundImage("");
    }
  };

  useEffect(() => {
    updateBackground(window.location.pathname);
  }, []);

  return (
    <Router>
      <AuthProvider>
        <div
          className="app-container"
          style={{ backgroundImage: backgroundImage, backgroundSize: "cover" }}
        >
          <header className="app-header">
            <div className="header-content">
              <h1 className="app-title">AI Travel Planner</h1>
              <Navigation updateBackground={updateBackground} />
            </div>
          </header>

          <main className="app-main">
            <Routes>
              {/* Home is the default route */}
              <Route path="/" element={<Home />} />

              {/* Protected routes */}
              <Route
                path="/planner"
                element={
                  <PrivateRoute>
                    <TripPlanner />
                  </PrivateRoute>
                }
              />
              <Route
                path="/hotels"
                element={
                  <PrivateRoute>
                    <Hotels />
                  </PrivateRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />

              {/* Auth routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              {/* Redirect any unknown paths to home */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>

          <footer className="app-footer">
            <p>&copy; 2025 AI Travel Planner. All rights reserved.</p>
          </footer>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
