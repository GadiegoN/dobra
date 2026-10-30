# DOBRA — 2048 Arcade Edition

Jogo 2048 com tabuleiro 4×4, identidade visual personalizável com 4 temas, controles por teclado (setas/WASD) e deslize no celular, máquina de estados com 3 cenas (Menu, Play e Fim de Jogo) e sistema duplo de ranking: **Global (Nuvem com Neon PostgreSQL e GitHub OAuth)** e **Local (Dispositivo)** com validações de segurança anti-cheat.

## 🚀 Funcionalidades

- **3 Cenas de Jogo**:
  - **Menu**: Apresentação arcade, recorde pessoal, acesso aos rankings e escolha de tema.
  - **Play**: HUD limpo com pontuação e animações de ganho de pontos. O ranking fica oculto durante a partida para foco total no jogo.
  - **Fim de Jogo**: Resumo da pontuação final, maior bloco alcançado, sincronização automática no ranking global e opção de salvar no Top 10 local.
- **Identidade Visual Tokenizada**:
  - 4 temas completos via CSS variables e Tailwind CSS v4: **Clássico**, **Cyberpunk**, **Retrô 8-bit** e **Midnight**.
- **Dois Rankings (Global & Local)**:
  - **Ranking Global**: Persistido no **Neon (PostgreSQL)** com autenticação **GitHub OAuth** (exibe avatar, `@username`, maior bloco e link para o perfil do dev).
  - **Ranking Local**: Top 10 armazenado no `localStorage` do navegador com 3 iniciais de arcade e suporte offline.
- **Segurança e Anti-Cheat**:
  - Verificação de sanidade matemática da pontuação (múltiplos de 4, tetos coerentes por bloco alcançado).
  - Tokens de partida assinados via **HMAC-SHA256** com proteção contra adulteração e replay attacks.
  - Validação de duração mínima e contagem de movimentos por pontuação.
  - Rate limiting no banco de dados.

## 🛠️ Tecnologias

- [Next.js 16 (App Router)](https://nextjs.org/)
- [React 19](https://react.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Neon Serverless PostgreSQL](https://neon.tech/)
- [GitHub OAuth API](https://docs.github.com/en/apps/oauth-apps)
- [Lucide Icons](https://lucide.dev/)

## ⚙️ Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto com base no `.env.example`:

```env
# Banco de Dados Neon (PostgreSQL)
DATABASE_URL="postgresql://usuario:senha@ep-xyz.sa-east-1.aws.neon.tech/neondb?sslmode=require"

# GitHub OAuth App
GITHUB_CLIENT_ID="seu_client_id"
GITHUB_CLIENT_SECRET="seu_client_secret"

# URL da Aplicação
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Segredo de Sessão e Criptografia HMAC
AUTH_SECRET="uma_chave_secreta_aleatoria_longa"
```

## 💻 Como Rodar

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no seu navegador.
