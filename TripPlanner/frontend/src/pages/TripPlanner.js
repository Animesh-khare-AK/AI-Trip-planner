import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getItinerary, saveItinerary } from "../services/api";
import { useAuth } from "../context/AuthContext";
import "./tripPlanner.css";

const TripPlanner = () => {
  const [city, setCity] = useState("");
  const [interests, setInterests] = useState("");
  const [days, setDays] = useState(1);
  const [itinerary, setItinerary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setItinerary(null);
    try {
      const response = await getItinerary(city, interests, days);
      setItinerary(response);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentUser) {
      alert("Please login to save itineraries");
      return;
    }
    setSaving(true);
    try {
      const token = await currentUser.getIdToken();
      await saveItinerary(token, {
        city,
        days,
        interests: interests.split(","),
        itinerary: itinerary.itinerary,
        recommendations: itinerary.recommendations,
        weather: itinerary.weather,
        budget: itinerary.budget,
      });
      alert("Itinerary saved to Dashboard!");
    } catch (error) {
      console.error("Error saving:", error);
      alert(
        `Failed to save itinerary: ${
          error.response?.data?.error || error.message
        }`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleBookHotels = () => {
    navigate("/hotels", { state: { city: city } });
  };

  return (
    <div className="planner-wrapper">
      <div className="planner-container">
        {/* Form Section */}
        <div className="form-section">
          <div className="form-card">
            <h2 className="form-title">Plan Your Trip</h2>
            <form onSubmit={handleSubmit} className="trip-form">
              <div className="form-group">
                <label>Destination City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g., Paris, Tokyo, New York"
                  required
                />
              </div>

              <div className="form-group">
                <label>Interests</label>
                <input
                  type="text"
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  placeholder="e.g., Food, History, Art, Nature"
                  required
                />
              </div>

              <div className="form-group">
                <label>Duration (Days)</label>
                <input
                  type="number"
                  min="1"
                  max="14"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? "Generating Plan..." : "Generate Itinerary"}
              </button>
            </form>
          </div>
        </div>

        {/* Results Section */}
        <div className="results-section">
          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Crafting your perfect itinerary...</p>
            </div>
          )}

          {itinerary && (
            <div className="itinerary-card">
              <h3 className="result-title">Your Trip to {city}</h3>

              <div className="itinerary-content">
                <h4>Itinerary</h4>
                <div className="itinerary-text">
                  {itinerary.itinerary.split("\n").map((point, index) => (
                    <p key={index}>{point}</p>
                  ))}
                </div>
              </div>

              {itinerary.recommendations && (
                <div className="recommendations-content">
                  <h4>Extra Recommendations</h4>
                  <div className="recommendations-text">
                    {itinerary.recommendations
                      .split("\n")
                      .map((point, index) => (
                        <p key={index}>{point}</p>
                      ))}
                  </div>
                </div>
              )}

              <div
                className="card-actions"
                style={{ marginTop: "2rem", display: "flex", gap: "1rem" }}
              >
                <button
                  className="submit-btn"
                  onClick={handleSave}
                  disabled={saving}
                  style={{ flex: 1, background: "#28a745" }}
                >
                  {saving ? "Saving..." : "Save to Dashboard"}
                </button>
                <button
                  className="submit-btn"
                  onClick={handleBookHotels}
                  style={{ flex: 1 }}
                >
                  Find Hotels in {city}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TripPlanner;
