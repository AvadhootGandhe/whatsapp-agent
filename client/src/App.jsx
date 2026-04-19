import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Services from "./pages/Services";
import Setup from "./pages/Setup";
import Dashboard from "./pages/Dashboard";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Terms from "./pages/Terms";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login — no navbar */}
        <Route path="/login" element={<Login />} />

        {/* Authenticated routes — with navbar */}
        <Route
          path="/services"
          element={
            <>
              <Navbar />
              <Services />
            </>
          }
        />
        <Route
          path="/setup/:serviceId"
          element={
            <>
              <Navbar />
              <Setup />
            </>
          }
        />
        <Route
          path="/dashboard"
          element={
            <>
              <Navbar />
              <Dashboard />
            </>
          }
        />

        {/* Default redirect */}
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
