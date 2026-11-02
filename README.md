# DOBRA — 2048 Edição Completa

O **DOBRA** é uma evolução completa, moderna e competitiva do clássico jogo 2048, construído com **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS v4** e banco de dados serverless **Neon PostgreSQL**.

Repositório oficial: [https://github.com/GadiegoN/dobra](https://github.com/GadiegoN/dobra)

---

## 🎮 Funcionalidades Principais

### 1. Cinco Modos de Jogo
- **Modo Clássico**: Jogabilidade tradicional sem limites de tempo ou movimentos, até não restarem movimentos válidos.
- **Contra o Relógio**: 60 segundos com timer regressivo no HUD para obter a maior pontuação possível.
- **Movimentos Limitados**: Alcance o máximo de pontos com um teto de 80 lances.
- **Sobrevivência**: Uma nova peça aleatória surge a cada 3 segundos, desafiando o jogador a agir sob pressão contínua.
- **Modo Alvo**: Desafio com meta de alcançar o bloco 1024 no menor número de movimentos, com vitória instantânea ao atingir o objetivo.

### 2. Desafio Diário Determinístico
- Todos os jogadores no mundo recebem o mesmo tabuleiro inicial e a mesma sequência de peças a cada dia.
- Semente calculada com base na data UTC (`YYYY-MM-DD`).
- Limite estrito de uma tentativa diária validada no servidor.
- Ranking diário dedicado com desempate por tempo e menor número de movimentos.

### 3. Temporadas Competitivas
- Sistema de temporadas semanais (segunda a domingo UTC).
- Contagem regressiva em tempo real no Salão dos Recordes.
- Separação clara entre o ranking da temporada e o ranking histórico (All-Time).
- Histórico navegável de temporadas anteriores.

### 4. Desafios Entre Amigos
- Gere links ou códigos compartilháveis com a semente exata da sua partida.
- Permite que qualquer amigo jogue com as mesmas peças sem necessidade de login prévio.
- Comparação direta entre o resultado do autor e as tentativas dos desafiantes.

### 5. Área de Estatísticas Pessoais
- Painel de métricas completas com persistência local e sincronização automática na nuvem Neon para usuários logados.
- Gráfico de barras da evolução recente (últimas 10 partidas).
- Distribuição de frequência das maiores peças alcançadas (64 a 8192).
- Sequência atual e melhor sequência histórica de vitórias.
- Histórico detalhado com data, hora, modalidade, movimentos e duração.

### 6. Temas Desbloqueáveis & Conquistas
- 6 temas cromáticos completos desenvolvidos com design tokens:
  - **Clássico** (Tons quentes e acolhedores)
  - **Cyberpunk** (Neon magenta e ciano)
  - **Retrô 8-bit** (Estilo Game Boy arcade)
  - **Midnight** (Dark slate moderno)
  - **Sunset** 🔒 (Desbloqueado ao atingir a peça 1024)
  - **Esmeralda** 🔒 (Desbloqueado ao alcançar 10.000 pontos)

### 7. Cartão de Resultado Compartilhável
- Renderização visual e exportação em alta resolução via HTML5 Canvas.
- Download direto em imagem PNG (`dobra-resultado.png`).
- Suporte nativo à API Web Share (`navigator.share`) em smartphones e computadores.
- Cópia instantânea do texto e link com validação do ranking confirmado.

### 8. Motor de Jogo Determinístico & Anti-Cheat
- Algoritmo Mulberry32 PRNG de 32 bits garantindo repetibilidade de sequências em qualquer plataforma.
- Regra estrita de fusão única por movimento (impede fusões duplas no mesmo lance).
- Validação no servidor via replay determinístico (`replayGame`): verifica cada movimento do jogador antes de salvar no ranking.
- Tokens HMAC-SHA256 e proteção contra ataques de repetição (replay attack).

---

## 🛠️ Tecnologias Utilizadas

- **Framework**: [Next.js 16 (App Router + Turbopack)](https://nextjs.org/)
- **UI & Reatividade**: [React 19](https://react.dev/)
- **Estilização**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Banco de Dados**: [Neon Serverless PostgreSQL](https://neon.tech/)
- **Autenticação**: [GitHub OAuth API](https://docs.github.com/en/apps/oauth-apps)
- **Ícones**: [Lucide React](https://lucide.dev/)
- **Testes Automatizados**: [Vitest](https://vitest.dev/)
- **Animações**: [Canvas Confetti](https://www.npmjs.com/package/canvas-confetti)

---

## 🧪 Testes Automatizados

Para executar a suíte completa de testes unitários e de integração:

```bash
npm test
```

Para executar em modo interativo contínuo (watch):

```bash
npm run test:watch
```

---

## ⚙️ Configuração do Ambiente

Crie o arquivo `.env.local` na raiz do projeto com base nas seguintes chaves:

```env
# Banco de Dados Neon (PostgreSQL)
DATABASE_URL="postgresql://usuario:senha@ep-xyz.sa-east-1.aws.neon.tech/neondb?sslmode=require"

# GitHub OAuth App
GITHUB_CLIENT_ID="seu_client_id"
GITHUB_CLIENT_SECRET="seu_client_secret"

# URL da Aplicação
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Segredo para assinatura de tokens de partida e sessões
AUTH_SECRET="uma_chave_secreta_longa_e_aleatoria"
```

---

## 💻 Como Executar Localmente

```bash
# 1. Instalar as dependências
npm install

# 2. Executar os testes
npm test

# 3. Iniciar o servidor de desenvolvimento
npm run dev
```

Acesse o jogo no seu navegador em: **[http://localhost:3000](http://localhost:3000)**
