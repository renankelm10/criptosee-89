# CriptoSee Node.js API

API Node.js para substituir o Supabase no projeto CriptoSee, mantendo total compatibilidade com o frontend React existente.

## 🚀 Características

- **API REST completa** equivalente ao Supabase
- **Migração automática** de dados do Supabase existente
- **Atualização periódica** via CoinGecko API (30 segundos)
- **Docker pronto** para deploy no Easypanel
- **Zero mudanças** no frontend - compatibilidade total
- **Performance otimizada** com PostgreSQL

## 📊 Dados Migrados

- ✅ 524 moedas (coins)
- ✅ 524 mercados atuais (latest_markets)
- ✅ 236k+ registros históricos (markets_history)
- ✅ Notificações por email (email_notifications)

## 🛠️ Tecnologias

- **Node.js 18+** com Express
- **PostgreSQL** como banco principal
- **Docker** para containerização
- **Axios** para requisições HTTP
- **node-cron** para atualizações automáticas

## 🚀 Deploy no Easypanel

### 1. Configurar Variáveis de Ambiente

```env
DB_HOST=phpmyadmin_postgrescriptosee
DB_PORT=5432
DB_NAME=Criptosee
DB_USER=postgres
DB_PASSWORD=cc6a9fc71e5636beabe7
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://seu-frontend.lovableproject.com
```

### 2. Deploy Docker

```bash
# Build da imagem
docker build -t crypto-api .

# Run com Docker Compose
docker-compose up -d
```

### 3. Migrar Dados do Supabase

```bash
# Instalar dependências
npm install

# Executar migração
npm run migrate
```

## 📋 Endpoints da API

### Moedas
- `GET /api/coins` - Lista todas as moedas
- `GET /api/coins/:id` - Detalhes de uma moeda
- `GET /api/coins?search=bitcoin` - Buscar moedas

### Mercados
- `GET /api/markets` - Dados atuais (paginado)
- `GET /api/markets?page=1&limit=100` - Com paginação
- `GET /api/markets/history/:coinId` - Histórico de preços

### Estatísticas
- `GET /api/global` - Dados globais do mercado
- `GET /api/stats` - Estatísticas detalhadas
- `GET /api/movers?type=gainers` - Top gainers/losers

### Sistema
- `GET /health` - Status da API
- `POST /api/refresh-markets` - Atualizar dados manualmente

## 🔄 Atualizações Automáticas

A API atualiza os dados automaticamente a cada 30 segundos via cron job, equivalente à Edge Function do Supabase:

```javascript
// Executa a cada 30 segundos
cron.schedule('*/30 * * * * *', async () => {
  await marketUpdater.updateMarkets();
});
```

## 📈 Performance

- **Conexão em pool** para PostgreSQL
- **Batch processing** para inserções em massa
- **Transações** para consistência de dados
- **Logging estruturado** para monitoramento
- **Healthcheck** para uptime

## 🔧 Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env

# Executar em modo desenvolvimento
npm run dev

# Executar migração de dados
npm run migrate
```

## 📱 Compatibilidade Frontend

A API mantém **100% de compatibilidade** com o frontend React existente. Apenas uma mudança na URL da API é necessária:

```typescript
// Antes (Supabase)
const SUPABASE_URL = "https://ztpbtbtaxqgndwvvzacs.supabase.co"

// Depois (Node.js API)
const API_URL = "https://crypto-api.seu-easypanel.com"
```

## 🛡️ Segurança

- **CORS** configurado para domínios específicos
- **Helmet** para headers de segurança
- **Rate limiting** para proteção contra abuse
- **Validação** de entrada em todos os endpoints
- **Logs** de segurança e auditoria

## 🔍 Monitoramento

- **Logs estruturados** em JSON
- **Healthcheck** endpoints
- **Métricas** de performance
- **Error tracking** detalhado

## 🚦 Status

- ✅ **Desenvolvimento**: Completo
- ✅ **Migração de dados**: Testado
- ✅ **Docker**: Configurado
- ⏳ **Deploy**: Aguardando configuração no Easypanel
- ⏳ **Frontend**: Aguardando adaptação das URLs

## 📞 Suporte

Para dúvidas ou problemas:
1. Verificar logs: `docker logs crypto-api`
2. Healthcheck: `GET /health`
3. Reiniciar: `docker-compose restart`

---

**Resultado**: API Node.js completa para substituir Supabase mantendo mesma funcionalidade e performance! 🚀