import AppLayout from "../components/AppLayout";

function Settings() {
  return (
    <AppLayout
      title="Configurações"
      subtitle="Gerencie preferências da sua conta e workspace."
    >
      <div className="card empty-state">
        <h3>Configurações</h3>
        <p>Em breve vamos adicionar preferências e dados da conta.</p>
      </div>
    </AppLayout>
  );
}

export default Settings;