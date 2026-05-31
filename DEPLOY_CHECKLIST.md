# Deploy Checklist

Use este checklist quando publicar o projeto na Vercel e configurar o TikTok OAuth.

## Dominio

- [ ] O dominio `compra-garantida.store` esta cadastrado em Vercel > Project > Settings > Domains.
- [ ] O dominio esta apontando para a Vercel, nao para GitHub Pages.
- [ ] Remova DNS antigo do GitHub Pages:
  - `A 185.199.108.153`
  - `A 185.199.109.153`
  - `A 185.199.110.153`
  - `A 185.199.111.153`
- [ ] Configure DNS da Vercel conforme o painel indicar. Normalmente:
  - apex/root: `A 76.76.21.21`
  - `www`: `CNAME cname.vercel-dns.com`
- [ ] O dominio principal do projeto certo na Vercel e `compra-garantida.store`.

## Projeto

- [ ] `vercel.json` esta na raiz do projeto.
- [ ] `/api/auth/tiktok/callback` chama a Vercel Function.
- [ ] `/api/social-accounts` chama a Vercel Function.
- [ ] `/auth/callback/tiktok` carrega o React sem 404.
- [ ] `/contas-sociais` carrega o React sem 404.

## TikTok

- [ ] `TIKTOK_REDIRECT_URI` na Vercel esta exatamente:
  `https://compra-garantida.store/auth/callback/tiktok`
- [ ] O painel TikTok tem exatamente:
  `https://compra-garantida.store/auth/callback/tiktok`
- [ ] Nao existe barra final no redirect URI.
- [ ] `VITE_APP_URL`, se usado, esta como:
  `https://compra-garantida.store`

## Testes Pos-Deploy

- [ ] Abrir `https://compra-garantida.store/auth/callback/tiktok`
  - Esperado: React carrega e mostra mensagem amigavel. Nao pode aparecer GitHub Pages 404.
- [ ] Abrir `https://compra-garantida.store/api/auth/tiktok/callback`
  - Esperado: JSON `405 Method Not Allowed`. Nao pode aparecer GitHub Pages 404.
- [ ] Abrir `https://compra-garantida.store/contas-sociais`
  - Esperado: React carrega e redireciona para login se nao houver sessao.
