import AppLayout from "../components/AppLayout";

function Analytics() {
  return (
    <AppLayout
      title="Analytics"
      subtitle="Acompanhe métricas internas do sistema."
    >
      <div className="card empty-state">
        <h3>Métricas em preparação</h3>
        <p>Na próxima etapa vamos criar cards e gráficos simples.</p>
      </div>
    </AppLayout>
  );
}

export default Analytics;
