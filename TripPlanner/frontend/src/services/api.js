import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000"; // Backend URL

// Get AI-generated itinerary
export const getItinerary = async (city, interests, days) => {
  try {
    const response = await axios.post(`${API_URL}/plan-trip`, {
      city,
      interests: interests.split(",").map((i) => i.trim()),
      days,
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching itinerary:", error);
    return { itinerary: "Error fetching itinerary", recommendations: "" };
  }
};

// Save Itinerary
export const saveItinerary = async (token, itineraryData) => {
  try {
    const response = await axios.post(
      `${API_URL}/save-itinerary`,
      itineraryData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error saving itinerary:", error);
    throw error;
  }
};

// User Signup
export const signupUser = async (email, password) => {
  try {
    const response = await axios.post(`${API_URL}/signup`, { email, password });
    return response.data;
  } catch (error) {
    console.error("Error signing up:", error);
    return { error: "Signup failed" };
  }
};
