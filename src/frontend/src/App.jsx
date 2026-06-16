// App.jsx — Root component & router for the 3-step flow.
// "/" Trip Details -> "/optimize" Optimization -> "/booking" Booking Link.
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navigation from "./components/Navigation";
import HomePage from "./pages/HomePage";
import FlexibleDates from "./pages/FlexibleDates";
import Step2_Optimization from "./pages/Step2_Optimization";
import BookingPage from "./pages/BookingPage";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-cream text-ink">
        <Navigation />
        <main>
          {/* Each page owns its own vertical rhythm. */}
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/flexible" element={<FlexibleDates />} />
            <Route path="/optimize" element={<Step2_Optimization />} />
            <Route path="/booking" element={<BookingPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
