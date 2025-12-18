import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Hotels.css";

const Hotels = () => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useState({
    city: "",
    checkIn: "",
    checkOut: "",
    guests: 1,
  });
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bookingStatus, setBookingStatus] = useState(null);

  useEffect(() => {
    if (location.state && location.state.city) {
      setSearchParams((prev) => ({ ...prev, city: location.state.city }));
      // Automatically trigger search if city is provided
      fetchHotels(location.state.city);
    }
  }, [location.state]);

  const fetchHotels = async (city) => {
    setLoading(true);
    setError("");
    setHotels([]);

    try {
      const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
      const response = await fetch(`${API_URL}/find-hotels`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ city }),
      });

      const data = await response.json();

      if (data.success) {
        setHotels(data.hotels);
      } else {
        setError(data.error || "Failed to find hotels");
      }
    } catch (err) {
      setError("Failed to connect to server");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    fetchHotels(searchParams.city);
  };

  const handleBook = async (hotel) => {
    if (!currentUser) {
      alert("Please login to book a hotel");
      return;
    }

    if (!searchParams.checkIn || !searchParams.checkOut) {
      alert("Please select check-in and check-out dates");
      return;
    }

    try {
      const token = await currentUser.getIdToken();
      const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
      const response = await fetch(`${API_URL}/book-hotel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          bookingDetails: {
            ...hotel,
            checkIn: searchParams.checkIn,
            checkOut: searchParams.checkOut,
            guests: searchParams.guests,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(
          `Booking confirmed for ${hotel.name}! Booking ID: ${data.bookingId}`
        );
        setBookingStatus("success");
      } else {
        alert("Booking failed: " + data.error);
      }
    } catch (err) {
      console.error("Booking error:", err);
      alert("Failed to process booking");
    }
  };

  // Helper to get a random image if none provided (or use placeholders)
  const getHotelImage = (type) => {
    const types = {
      luxury:
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
      resort:
        "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80",
      city: "https://images.unsplash.com/photo-1590073242678-cfea53377bab?auto=format&fit=crop&w=800&q=80",
      boutique:
        "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80",
      default:
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
    };
    return types[type?.toLowerCase()] || types.default;
  };

  return (
    <div className="hotels-container">
      <div className="hotels-header">
        <h2>Find Your Perfect Stay</h2>
        <p>Discover top-rated hotels and resorts for your next adventure</p>
      </div>

      <div className="search-section">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-group">
            <label>Destination</label>
            <input
              type="text"
              placeholder="Where are you going?"
              value={searchParams.city}
              onChange={(e) =>
                setSearchParams({ ...searchParams, city: e.target.value })
              }
              required
            />
          </div>
          <div className="search-group">
            <label>Check-in</label>
            <input
              type="date"
              value={searchParams.checkIn}
              onChange={(e) =>
                setSearchParams({ ...searchParams, checkIn: e.target.value })
              }
              required
            />
          </div>
          <div className="search-group">
            <label>Check-out</label>
            <input
              type="date"
              value={searchParams.checkOut}
              onChange={(e) =>
                setSearchParams({ ...searchParams, checkOut: e.target.value })
              }
              required
            />
          </div>
          <button type="submit" className="search-btn" disabled={loading}>
            {loading ? "Searching..." : "Search Hotels"}
          </button>
        </form>
      </div>

      {error && <div className="dashboard-error">{error}</div>}

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Finding the best deals for you...</p>
        </div>
      ) : (
        <div className="hotels-grid">
          {hotels.map((hotel) => (
            <div key={hotel.id} className="hotel-card">
              <div
                className="hotel-image"
                style={{
                  backgroundImage: `url(${getHotelImage(hotel.image)})`,
                }}
              >
                <div className="hotel-price-tag">${hotel.price}/night</div>
              </div>
              <div className="hotel-content">
                <div className="hotel-header">
                  <h3>{hotel.name}</h3>
                  <span className="hotel-rating">★ {hotel.rating}</span>
                </div>
                <div className="hotel-address">
                  <span>📍</span> {hotel.address}
                </div>
                <div className="hotel-amenities">
                  {hotel.amenities.map((amenity, index) => (
                    <span key={index} className="amenity-tag">
                      {amenity}
                    </span>
                  ))}
                </div>
                <p className="hotel-description">{hotel.description}</p>
                <button className="book-btn" onClick={() => handleBook(hotel)}>
                  Book Now
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Hotels;
