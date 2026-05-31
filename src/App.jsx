import { Routes, Route } from "react-router-dom";

import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import SocialAccounts from "./pages/SocialAccounts";
import OAuthCallback from "./pages/OAuthCallback";
import TikTokCallback from "./pages/TikTokCallback";
import Library from "./pages/Library";
import Campaigns from "./pages/Campaigns";
import CalendarPage from "./pages/CalendarPage";
import Analytics from "./pages/Analytics";
import Team from "./pages/Team";
import Settings from "./pages/Settings";
import Logs from "./pages/Logs";
import Affiliates from "./pages/Affiliates";

export default function App() {
  function protectedPage(page) {
    return (
      <ProtectedRoute>
        <AppLayout>{page}</AppLayout>
      </ProtectedRoute>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/entrar" element={<Login />} />
      <Route path="/criar-conta" element={<Register />} />

      <Route path="/dashboard" element={protectedPage(<Dashboard />)} />

      <Route path="/contas-sociais" element={protectedPage(<SocialAccounts />)} />

      <Route path="/auth/callback/tiktok" element={<TikTokCallback />} />
      <Route path="/auth/callback/:provider" element={<OAuthCallback />} />

      <Route path="/biblioteca" element={protectedPage(<Library />)} />

      <Route path="/campanhas" element={protectedPage(<Campaigns />)} />

      <Route path="/calendario" element={protectedPage(<CalendarPage />)} />

      <Route path="/analytics" element={protectedPage(<Analytics />)} />

      <Route path="/equipe" element={protectedPage(<Team />)} />

      <Route path="/configuracoes" element={protectedPage(<Settings />)} />

      <Route path="/logs" element={protectedPage(<Logs />)} />

      <Route path="/afiliados" element={protectedPage(<Affiliates />)} />
    </Routes>
  );
}
