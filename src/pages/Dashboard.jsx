import {
  Share2,
  FolderOpen,
  CalendarDays,
  CheckCircle2,
  TrendingUp,
  Camera,
  Music2,
  Send,
  Eye,
  Heart,
  MessageCircle,
  AlertCircle,
  Upload,
  Layers,
} from "lucide-react";

export default function Dashboard() {
  const stats = [
    {
      title: "Contas conectadas",
      value: "2",
      description: "Instagram e TikTok ativos",
      icon: Share2,
      change: "+1 esta semana",
      type: "purple",
    },
    {
      title: "Mídias na biblioteca",
      value: "24",
      description: "Imagens e vídeos enviados",
      icon: FolderOpen,
      change: "+6 hoje",
      type: "blue",
    },
    {
      title: "Posts agendados",
      value: "12",
      description: "Publicações programadas",
      icon: CalendarDays,
      change: "+4 hoje",
      type: "orange",
    },
    {
      title: "Posts publicados",
      value: "18",
      description: "Conteúdos já enviados",
      icon: CheckCircle2,
      change: "+5 hoje",
      type: "green",
    },
  ];

  const scheduledPosts = [
    {
      title: "Post de lançamento da nova oferta",
      account: "@minhaempresa",
      platform: "Instagram",
      date: "Hoje às 18:00",
      status: "Agendado",
    },
    {
      title: "Reels mostrando o produto",
      account: "@minhatiktok",
      platform: "TikTok",
      date: "Amanhã às 12:30",
      status: "Pendente",
    },
    {
      title: "Campanha promocional de fim de semana",
      account: "@minhaempresa",
      platform: "Instagram",
      date: "01/06 às 09:00",
      status: "Agendado",
    },
  ];

  const connections = [
    {
      name: "Instagram Business",
      description: "Conta conectada e pronta para publicar",
      status: "Conectado",
      icon: Camera,
    },
    {
      name: "TikTok Business",
      description: "Aguardando reconexão com a API oficial",
      status: "Pendente",
      icon: Music2,
    },
  ];

  const performance = [
    {
      title: "Alcance total",
      value: "48.2k",
      description: "Visualizações nos últimos 30 dias",
      icon: Eye,
      type: "purple",
    },
    {
      title: "Curtidas",
      value: "7.8k",
      description: "Engajamentos recebidos",
      icon: Heart,
      type: "green",
    },
    {
      title: "Comentários",
      value: "932",
      description: "Interações nos posts",
      icon: MessageCircle,
      type: "blue",
    },
    {
      title: "Taxa de sucesso",
      value: "92%",
      description: "Posts publicados sem erro",
      icon: TrendingUp,
      type: "orange",
    },
  ];

  const bestContents = [
    {
      title: "Reels de demonstração do produto",
      platform: "Instagram",
      reach: "18.4k",
      engagement: "12.8%",
      status: "Melhor alcance",
    },
    {
      title: "Vídeo curto com oferta relâmpago",
      platform: "TikTok",
      reach: "14.1k",
      engagement: "10.3%",
      status: "Mais engajamento",
    },
    {
      title: "Post carrossel explicando benefícios",
      platform: "Instagram",
      reach: "9.7k",
      engagement: "8.6%",
      status: "Boa retenção",
    },
    {
      title: "Stories com chamada para compra",
      platform: "Instagram",
      reach: "6.2k",
      engagement: "6.4%",
      status: "Conversão alta",
    },
  ];

  const activities = [
    {
      icon: Upload,
      title: "Nova mídia enviada para a biblioteca",
      time: "há 12 minutos",
    },
    {
      icon: CalendarDays,
      title: "Post agendado para hoje às 18:00",
      time: "há 35 minutos",
    },
    {
      icon: Share2,
      title: "Conta Instagram conectada com sucesso",
      time: "há 1 hora",
    },
    {
      icon: AlertCircle,
      title: "TikTok precisa ser reconectado",
      time: "há 2 horas",
    },
  ];

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>Acompanhe suas publicações, contas conectadas e desempenho geral.</p>
        </div>

        <button className="send-content-button">
          <Send size={18} />
          Enviar Conteúdo
        </button>
      </div>

      <div className="dashboard-stats-grid">
        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <div className="dashboard-stat-card" key={item.title}>
              <div className={`dashboard-icon ${item.type}`}>
                <Icon size={23} />
              </div>

              <span className="dashboard-change">{item.change}</span>

              <p>{item.title}</p>
              <h2>{item.value}</h2>
              <small>{item.description}</small>
            </div>
          );
        })}
      </div>

      <div className="dashboard-main-grid">
        <div className="dashboard-panel large">
          <div className="panel-title">
            <h2>Próximos posts agendados</h2>
            <p>Conteúdos que serão publicados automaticamente.</p>
          </div>

          <div className="scheduled-list">
            {scheduledPosts.map((post) => (
              <div className="scheduled-item" key={post.title}>
                <div>
                  <h3>{post.title}</h3>
                  <p>
                    {post.account} • {post.platform} • {post.date}
                  </p>
                </div>

                <span
                  className={
                    post.status === "Agendado"
                      ? "post-status scheduled"
                      : "post-status pending"
                  }
                >
                  {post.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-panel">
          <div className="panel-title">
            <h2>Status das conexões</h2>
            <p>Situação das redes sociais conectadas.</p>
          </div>

          <div className="connection-list">
            {connections.map((connection) => {
              const Icon = connection.icon;

              return (
                <div className="connection-item" key={connection.name}>
                  <div className="connection-icon">
                    <Icon size={22} />
                  </div>

                  <div>
                    <h3>{connection.name}</h3>
                    <p>{connection.description}</p>
                    <span
                      className={
                        connection.status === "Conectado"
                          ? "connection-status connected"
                          : "connection-status pending"
                      }
                    >
                      {connection.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="performance-grid">
        {performance.map((item) => {
          const Icon = item.icon;

          return (
            <div className="performance-card" key={item.title}>
              <div className={`dashboard-icon ${item.type}`}>
                <Icon size={23} />
              </div>

              <h2>{item.value}</h2>
              <p>{item.title}</p>
              <small>{item.description}</small>
            </div>
          );
        })}
      </div>

      <div className="dashboard-bottom-grid">
        <div className="ranking-card">
          <div className="ranking-header">
            <div>
              <div className="ranking-title-row">
                <Layers size={18} />
                <h2>Melhores conteúdos</h2>
              </div>
              <p>Posts com melhor desempenho no período</p>
            </div>
          </div>

          <div className="content-list">
            {bestContents.map((content, index) => (
              <div className="content-item" key={content.title}>
                <div className="content-position">{index + 1}</div>

                <div className="content-info">
                  <h3>{content.title}</h3>
                  <p>{content.platform}</p>
                </div>

                <div className="content-metric">
                  <span>Alcance</span>
                  <strong>{content.reach}</strong>
                </div>

                <div className="content-metric">
                  <span>Engaj.</span>
                  <strong>{content.engagement}</strong>
                </div>

                <div className="content-status">{content.status}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-panel">
          <div className="panel-title">
            <h2>Atividades recentes</h2>
            <p>Últimas ações realizadas no workspace.</p>
          </div>

          <div className="activity-list">
            {activities.map((activity) => {
              const Icon = activity.icon;

              return (
                <div className="activity-item" key={activity.title}>
                  <div className="activity-icon">
                    <Icon size={18} />
                  </div>

                  <div>
                    <h3>{activity.title}</h3>
                    <p>{activity.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="dashboard-final-grid">
        <div className="dashboard-panel">
          <div className="panel-title">
            <h2>Resumo do funil</h2>
            <p>Fluxo atual de criação e publicação.</p>
          </div>

          <div className="funnel-list">
            <div>
              <span>Na biblioteca</span>
              <strong>24</strong>
            </div>

            <div>
              <span>Em campanha</span>
              <strong>8</strong>
            </div>

            <div>
              <span>Agendados</span>
              <strong>12</strong>
            </div>

            <div>
              <span>Publicados</span>
              <strong>18</strong>
            </div>
          </div>
        </div>

        <div className="dashboard-panel">
          <div className="panel-title">
            <h2>Insights rápidos</h2>
            <p>Sugestões para melhorar seus próximos posts.</p>
          </div>

          <div className="insight-list">
            <div className="insight-item">
              <span>Melhor horário para postar</span>
              <strong>18:00 - 21:00</strong>
            </div>

            <div className="insight-item">
              <span>Rede com mais alcance</span>
              <strong>Instagram</strong>
            </div>

            <div className="insight-item">
              <span>Formato recomendado</span>
              <strong>Reels curto</strong>
            </div>

            <div className="insight-item">
              <span>Próxima ação sugerida</span>
              <strong>Agendar conteúdo</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}