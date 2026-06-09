// App.jsx — Root component & router for the 3-step flow.
// "/" Trip Details -> "/optimize" Optimization -> "/booking" Booking Link.
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navigation from "./components/Navigation";
import Step1_TripDetails from "./pages/Step1_TripDetails";
import FlexibleDates from "./pages/FlexibleDates";
import Step2_Optimization from "./pages/Step2_Optimization";
import Step3_BookingLink from "./pages/Step3_BookingLink";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 text-slate-800">
        <Navigation />
        <main className="py-6">
          <Routes>
            <Route path="/" element={<Step1_TripDetails />} />
            <Route path="/flexible" element={<FlexibleDates />} />
            <Route path="/optimize" element={<Step2_Optimization />} />
            <Route path="/booking" element={<Step3_BookingLink />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
