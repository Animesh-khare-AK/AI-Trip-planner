import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
const firebaseConfig = {
  apiKey: "AIzaSyB2U-axp-_XGlK2vsvfNA5CktsYd8jbkNI",
  authDomain: "ai-trip-planner-da0a7.firebaseapp.com",
  projectId: "ai-trip-planner-da0a7",
  storageBucket: "ai-trip-planner-da0a7.firebasestorage.app",
  messagingSenderId: "354851432040",
  appId: "1:354851432040:web:1f155bdc3288945bfe3ddd",
  measurementId: "G-29S6BPTYCD",
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
