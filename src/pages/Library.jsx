import AppLayout from "../components/AppLayout";

function Library() {
  return (
    <AppLayout
      title="Biblioteca"
      subtitle="Envie imagens e vídeos para usar nas publicações."
      action={<button className="btn-primary">Enviar mídia</button>}
    >
      <div className="card empty-state">
        <h3>Nenhuma mídia enviada ainda</h3>
        <p>Na próxima etapa vamos criar upload, preview e exclusão de mídia.</p>
      </div>
    </AppLayout>
  );
}

export default Library;
