import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ApiVaultPage from "./pages/ApiVaultPage.jsx";
import MockServerPage from "./pages/MockServerPage.jsx";
import TestSpacePage from "./pages/TestSpacePage.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />

      <Route path="/api-vault" element={<ApiVaultPage />} />
      <Route path="/api-vault/:apiId" element={<ApiVaultPage />} />
      <Route path="/vault" element={<ApiVaultPage />} />

      <Route path="/mock-server" element={<MockServerPage />} />
      <Route path="/mock-api" element={<MockServerPage />} />
      <Route path="/mocks" element={<MockServerPage />} />

      <Route path="/testspace" element={<TestSpacePage />} />
      <Route path="/test-space" element={<TestSpacePage />} />
    </Routes>
  );
}