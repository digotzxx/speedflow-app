import { Link } from "react-router-dom";
import { Zap, Calendar, ShieldCheck, Upload, BarChart3 } from "lucide-react";

function Home() {
  return (
    <div className="app-bg">
      <header className="home-header">
        <Link to="/" className="home-logo">
          <div>
            <Zap size={22} />
          </div>
          <strong>SpeedPost</strong>
        </Link>

        <nav>
          <a href="#recursos">Recursos</a>
          <a href="#planos">Planos</a>
          <Link to="/entrar">Entrar</Link>
          <Link to="/criar-conta" className="home-btn">
            Criar conta
          </Link>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-badge">
          <Zap size={14} />
          API oficial da Meta
        </div>

        <h1>
          Planeje. Prepare.
          <br />
          <span>Publique em ponto.</span>
        </h1>

        <p>
          Agende Reels, Feed, Carrosséis e campanhas usando uma plataforma
          profissional para gerenciamento de redes sociais.
        </p>

        <div className="hero-actions">
          <Link to="/criar-conta" className="btn-primary">
            Criar conta
          </Link>
          <Link to="/entrar" className="btn-secondary">
            Já tenho conta
          </Link>
        </div>
      </section>

      <section id="recursos" className="home-section">
        <h2>Tudo que você precisa em um só lugar</h2>
        <p>Gerencie suas publicações com praticidade, segurança e organização.</p>

        <div className="home-cards">
          <div className="home-card card">
            <Calendar />
            <h3>Calendário inteligente</h3>
            <p>Veja todos os posts agendados em uma visualização organizada.</p>
          </div>

          <div className="home-card card">
            <Upload />
            <h3>Biblioteca de mídia</h3>
            <p>Envie imagens e vídeos para usar nos seus conteúdos.</p>
          </div>

          <div className="home-card card">
            <BarChart3 />
            <h3>Analytics</h3>
            <p>Acompanhe posts, campanhas, contas conectadas e agendamentos.</p>
          </div>

          <div className="home-card card">
            <ShieldCheck />
            <h3>Conexões seguras</h3>
            <p>Estrutura preparada para OAuth real com Instagram e TikTok.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;