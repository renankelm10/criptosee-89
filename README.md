#Cripto See

Esta é uma plataforma de visualização de dados de criptomoedas, feita em Lovable, que foi migrada de uma solução baseada em Supabase para uma API própria rodando em Node.js, hospedada em uma VPS .

As principais características são:

Frontend Moderno: A interface do usuário é construída com React e Vite, o que a torna rápida e eficiente. Ela possui:

Uma página principal que exibe um painel com as criptomoedas mais voláteis, permitindo busca e filtros.

Uma página de detalhes para cada criptomoeda, com gráficos de preço, informações de mercado e um feed de notícias.

Backend Robusto em Node.js: O antigo backend do Supabase foi substituído por uma API própria para maior controle e performance. Essa API é responsável por:

Conectar-se a um banco de dados PostgreSQL.

Buscar e atualizar dados de criptomoedas da API da CoinGecko a cada 30 segundos.

Oferecer endpoints para o frontend consumir os dados (listar moedas, ver histórico, etc.).

Migração e Implantação: O projeto inclui scripts para migrar os dados do Supabase para o novo banco de dados local. Além disso, tanto o frontend quanto o backend estão preparados para serem implantados facilmente usando Docker, o que garante um ambiente consistente na VPS.
