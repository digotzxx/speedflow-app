export const initTikTokSDK = () => {
  if (typeof window === "undefined") return;

  if (window.tiktok) {
    console.log("TikTok SDK ja carregado");
    return;
  }

  console.log("Inicializando TikTok SDK...");

  const script = document.createElement("script");
  script.src = "https://www.tiktok.com/embed.js";
  script.async = true;
  script.charset = "utf-8";

  script.onload = () => {
    console.log("TikTok SDK carregado com sucesso");
    if (window.tiktok?.Embed?.lib?.render) {
      window.tiktok.Embed.lib.render(document.body);
    }
  };

  script.onerror = () => {
    console.error("Erro ao carregar TikTok SDK");
  };

  document.head.appendChild(script);
};
