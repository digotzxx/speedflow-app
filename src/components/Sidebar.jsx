import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Calendar,
  FolderOpen,
  Gauge,
  HandCoins,
  Layers,
  LogOut,
  ScrollText,
  Settings,
  Share2,
  Users,
  Zap,
} from "lucide-react";
import { useAuth } from "../contexts/useAuth";

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const userEmail = user?.email || "usuario@speedpost.com";

  const menuItems = [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: <Gauge size={22} />,
    },
    {
      label: "Contas Sociais",
      path: "/contas-sociais",
      icon: <Share2 size={22} />,
    },
    {
      label: "Biblioteca",
      path: "/biblioteca",
      icon: <FolderOpen size={22} />,
    },
    {
      label: "Campanhas",
      path: "/campanhas",
      icon: <Layers size={22} />,
    },
    {
      label: "Calendario",
      path: "/calendario",
      icon: <Calendar size={22} />,
    },
    {
      label: "Analytics",
      path: "/analytics",
      icon: <BarChart3 size={22} />,
    },
    {
      label: "Equipe",
      path: "/equipe",
      icon: <Users size={22} />,
    },
    {
      label: "Logs",
      path: "/logs",
      icon: <ScrollText size={22} />,
    },
    {
      label: "Afiliados",
      path: "/afiliados",
      icon: <HandCoins size={22} />,
    },
    {
      label: "Configuracoes",
      path: "/configuracoes",
      icon: <Settings size={22} />,
    },
  ];

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <aside className="sidebar">
      <Link to="/dashboard" className="sidebar-logo">
        <div>
          <Zap size={24} />
        </div>
        <strong>SpeedPost</strong>
      </Link>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const active = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-link ${active ? "active" : ""}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="workspace-box">
          <span>Workspace</span>
          <strong>Meu negocio</strong>
        </div>

        <button className="user-box" type="button" onClick={handleSignOut}>
          <div className="avatar">{userEmail.slice(0, 1).toUpperCase()}</div>
          <div>
            <strong>Usuario</strong>
            <span>{userEmail}</span>
          </div>
          <LogOut size={20} />
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
