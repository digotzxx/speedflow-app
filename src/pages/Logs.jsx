import AppLayout from "../components/AppLayout";

function Logs() {
  return (
    <AppLayout
      title="Logs"
      subtitle="Acompanhe o histórico de ações e publicações."
    >
      <div className="card empty-state">
        <h3>Nenhum log disponível</h3>
        <p>Quando uma ação acontecer, o histórico aparecerá aqui.</p>
      </div>
    </AppLayout>
  );
}

export default Logs;
