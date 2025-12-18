import React from "react";
import { useAuth } from "../context/AuthContext";
import "./Home.css";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleStartPlanning = () => {
    navigate(currentUser ? "/planner" : "/login");
  };

  return (
    <div className="home-container">
      <div className="hero-content">
        <h1 className="hero-title">Discover Your Next Adventure</h1>
        <p className="hero-subtitle">
          Plan your perfect trip with our AI-powered itinerary generator.
          Personalized recommendations, optimized routes, and budget estimates.
        </p>
        <button onClick={handleStartPlanning} className="home-button">
          Start Planning Now
        </button>
      </div>
    </div>
  );
};

export default Home;
