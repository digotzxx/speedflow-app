import AppLayout from "../components/AppLayout";

function Campaigns() {
  return (
    <AppLayout
      title="Campanhas"
      subtitle="Crie e organize campanhas de conteúdo."
      action={<button className="btn-primary">Nova campanha</button>}
    >
      <div className="card empty-state">
        <h3>Nenhuma campanha criada</h3>
        <p>Na próxima etapa vamos criar o CRUD completo de campanhas.</p>
      </div>
    </AppLayout>
  );
}

export default Campaigns;
