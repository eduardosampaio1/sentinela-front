# Sentinela — AI Interaction Observability Platform

Sentinela é uma plataforma de **observabilidade para sistemas de IA conversacional**.
Ela analisa interações entre usuários e modelos de linguagem (LLMs) para identificar:

* inconsistências de resposta
* desperdício de tokens
* deriva de intenção
* baixa cobertura de intents
* riscos operacionais em assistentes de IA

O objetivo é fornecer **visibilidade operacional sobre sistemas de IA**, da mesma forma que ferramentas como Datadog ou New Relic fazem para software tradicional.

---

# Arquitetura

O projeto é dividido em três componentes principais:

### Frontend

Interface web para upload e análise de datasets.

Tecnologias:

* React
* TypeScript
* Vite
* TailwindCSS
* shadcn/ui

Responsabilidades:

* upload de datasets JSONL
* visualização de métricas
* exibição de alertas
* histórico de análises
* comparação entre execuções

---

### Engine (Backend)

Motor analítico responsável pelos cálculos do Sentinela.

Responsabilidades:

* ingestão de datasets
* análise semântica
* clustering de respostas
* cálculo de métricas operacionais
* geração de alertas

Tecnologias:

* Python
* FastAPI
* FAISS (similaridade vetorial)
* Numpy

Deploy:

* Render

---

### Banco de dados

Utilizado para persistência de execuções e histórico.

Tecnologia:

* Supabase (PostgreSQL)

Dados armazenados:

* execuções de análise
* resultados
* datasets
* métricas

---

# Infraestrutura

| Componente    | Tecnologia    |
| ------------- | ------------- |
| Frontend      | Vercel        |
| Engine        | Render        |
| Database      | Supabase      |
| Vector Search | FAISS         |
| Runtime       | Python + Node |

---

# Métricas analisadas pelo Sentinela

O motor calcula diversas métricas operacionais de IA:

### Consistency Score

Mede se o modelo responde de forma consistente para uma mesma intenção.

### Token Waste Estimate

Estimativa de desperdício de tokens por redundância de respostas.

### Cross-Intent Similarity

Detecta quando diferentes intenções produzem respostas semelhantes.

### Intent Coverage

Avalia distribuição de intents no dataset.

### Response Variance

Mede a variabilidade das respostas para uma mesma pergunta.

### Global Confidence

Score agregado da qualidade da IA analisada.

---

# Como rodar o frontend localmente

Pré-requisitos:

* Node.js 18+
* npm

Clone o repositório:

```bash
git clone <repo_url>
```

Entre no diretório:

```bash
cd sentinela-frontend
```

Instale dependências:

```bash
npm install
```

Execute o projeto:

```bash
npm run dev
```

O servidor de desenvolvimento será iniciado em:

```
http://localhost:5173
```

---

# Estrutura do projeto

```
src/

components/
UI e componentes da interface

pages/
Páginas da aplicação

contexts/
Gerenciamento de estado global

services/
Integração com APIs

types/
Definições de tipos TypeScript
```

---

# Fluxo de uso da plataforma

1. Usuário faz upload de um dataset JSONL
2. Frontend envia o dataset para a Engine
3. Engine executa a análise
4. Métricas e alertas são gerados
5. Resultados são exibidos no dashboard

---

# Exemplo de dataset aceito

Formato JSONL:

```
{"conversation_id": "1", "intent": "saldo", "response": "Seu saldo é R$1200"}
{"conversation_id": "2", "intent": "saldo", "response": "Você possui R$1200 em conta"}
{"conversation_id": "3", "intent": "transferencia", "response": "Para transferir escolha o destinatário"}
```

---

# Roadmap do Sentinela

Versões planejadas:

### V1 — Observe & Point

Observabilidade e detecção de problemas.

### V2 — Observe, Point & Block

Capacidade de bloquear respostas problemáticas.

### V3 — Observe, Point, Block & Correct

Correção automática de respostas.

### V4 — Observe, Point, Block, Correct & Auto-Adapt

IA auto-adaptativa baseada nas análises.

---

# Licença

MIT License

---

# Autor

Eduardo Sampaio

AI Product Leader
Especialista em produtos de IA e observabilidade de LLMs.
