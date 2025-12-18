import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";

const Dashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [itineraries, setItineraries] = useState([]);
  const [selectedItinerary, setSelectedItinerary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleDelete = async (itineraryId) => {
    if (!window.confirm("Are you sure you want to delete this itinerary?"))
      return;

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(
        `http://localhost:5000/delete-itinerary/${itineraryId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setItineraries(itineraries.filter((item) => item.id !== itineraryId));
      } else {
        alert("Failed to delete itinerary");
      }
    } catch (err) {
      console.error("Error deleting itinerary:", err);
      alert("Error deleting itinerary");
    }
  };

  useEffect(() => {
    const fetchItineraries = async () => {
      try {
        if (!currentUser) {
          setError("Please log in to view your itineraries");
          setLoading(false);
          return;
        }

        const token = await currentUser.getIdToken();
        const response = await fetch("http://localhost:5000/get-itineraries", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include", // This is crucial for cookies/sessions
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to fetch itineraries");
        }

        const data = await response.json();
        setItineraries(data.itineraries);
      } catch (err) {
        console.error("Fetch itineraries error:", err);
        setError(
          err.message.includes("Failed to fetch")
            ? "Network error. Please check your connection."
            : err.message
        );
      } finally {
        setLoading(false);
      }
    };

    fetchItineraries();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading your itineraries...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <h2>Your Saved Itineraries</h2>

      {itineraries.length === 0 ? (
        <div className="empty-state">
          <p>You haven't saved any itineraries yet.</p>
          <p>Plan a trip to get started!</p>
        </div>
      ) : (
        <div className="itineraries-grid">
          {itineraries.map((itinerary) => (
            <div key={itinerary.id} className="itinerary-card">
              <h3>{itinerary.title}</h3>
              <p className="destination">{itinerary.city}</p>
              <p className="duration">
                {itinerary.days} day{itinerary.days !== 1 ? "s" : ""}
              </p>

              <div className="card-actions">
                <button
                  className="view-button"
                  onClick={() => setSelectedItinerary(itinerary)}
                >
                  View Details
                </button>
                <button
                  className="view-button"
                  style={{ backgroundColor: "#28a745" }}
                  onClick={() =>
                    navigate("/hotels", { state: { city: itinerary.city } })
                  }
                >
                  Book Hotels
                </button>
                <button
                  className="delete-button"
                  onClick={() => handleDelete(itinerary.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedItinerary && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedItinerary(null)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setSelectedItinerary(null)}
            >
              ×
            </button>

            <h2>{selectedItinerary.title}</h2>
            <p className="destination">
              <strong>Destination:</strong> {selectedItinerary.city}
            </p>
            <p className="duration">
              <strong>Duration:</strong> {selectedItinerary.days} days
            </p>

            <div className="modal-body">
              <h3>Itinerary</h3>
              <div className="modal-text">{selectedItinerary.itinerary}</div>

              {selectedItinerary.recommendations && (
                <>
                  <h3>Recommendations</h3>
                  <div className="modal-text">
                    {selectedItinerary.recommendations}
                  </div>
                </>
              )}

              {selectedItinerary.budget && (
                <>
                  <h3>Estimated Budget</h3>
                  <div className="modal-text">
                    <p>
                      <strong>Flights:</strong> $
                      {selectedItinerary.budget.flights}
                    </p>
                    <p>
                      <strong>Accommodation:</strong> $
                      {selectedItinerary.budget.accommodation}
                    </p>
                    <p>
                      <strong>Food:</strong> ${selectedItinerary.budget.food}
                    </p>
                    <p>
                      <strong>Total:</strong> ${selectedItinerary.budget.total}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
