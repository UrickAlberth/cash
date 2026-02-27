# Manual de Uso — RosaCash

## 1) Visão geral
O **RosaCash** é um sistema web de gestão financeira pessoal com:
- cadastro/login por e-mail (Supabase Auth);
- lançamentos de entradas, saídas, cartão, poupança e resgate;
- contas fixas mensais (recorrências);
- controle de cartões e faturas;
- checklist de contas a pagar;
- previsão de saldo futuro;
- assistente financeiro com IA.

---

## 2) Pré-requisitos (para instalar e rodar)
Antes de usar localmente, você precisa de:
- Node.js 18+ (recomendado LTS);
- conta e projeto no Supabase;
- chave de API do Google AI Studio (Gemini) para o assistente IA.

### 2.1 Variáveis de ambiente
Crie o arquivo `.env.local` na raiz do projeto com:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_ANON
GOOGLE_API_KEY=SUA_CHAVE_GOOGLE_AI
```

### 2.2 Banco de dados
No Supabase SQL Editor, execute o conteúdo de:
- `supabase/schema.sql`

Isso cria as tabelas:
- `categories`
- `cards`
- `transactions`
- `recurring`

E aplica as políticas de segurança (RLS) por usuário.

### 2.3 Rodar o sistema
No terminal:

```bash
npm install
npm run dev
```

Acesse: `http://localhost:9002`

---

## 3) Primeiro acesso
1. Abra o sistema.
2. Na tela inicial, escolha:
   - **Criar conta** (cadastro), ou
   - **Entrar** (login).
3. Após autenticar, você cai no painel principal.

> Observação: no primeiro acesso, categorias padrão são criadas automaticamente no seu usuário.

---

## 4) Navegação principal (abas)
No topo do app existem 8 abas:
- **Dashboard**
- **Lançar**
- **Extrato**
- **Pagar**
- **Cartões**
- **Previsão**
- **Fixas**
- **Ajustes**

---

## 5) Como usar cada área

## 5.1 Dashboard
Mostra os indicadores principais:
- **Entradas**;
- **Saídas Totais**;
- **Lucro / Saldo**;
- gráfico de **distribuição por categoria**;
- gráfico de **gastos recentes**.

Use o Dashboard para visão rápida da saúde financeira.

## 5.2 Lançar (novo lançamento)
Use para registrar movimentações.

### Tipos disponíveis
- **Entrada**: dinheiro que entra;
- **Saída**: despesa comum;
- **Cartão**: compra no cartão de crédito;
- **Guardar**: aporte em poupança/investimento;
- **Resgatar**: retirada da poupança/investimento.

### Campos principais
- Data
- Valor
- Descrição
- Categoria
- (Cartão) seleção do cartão
- (Cartão) número de parcelas
- **Conta Fixa?** (ativa recorrência mensal)

### Regras importantes
- Em lançamento de **cartão**, é obrigatório escolher um cartão.
- Em compra parcelada no cartão, o sistema cria automaticamente as parcelas futuras.
- Ao marcar **Conta Fixa**, o sistema cria também uma recorrência mensal.
- Você pode criar nova categoria na hora (botão **Nova**).

## 5.3 Extrato
Permite consultar e manter os lançamentos.

### Recursos
- Busca por texto.
- Filtro por mês e ano.
- Alternância entre:
  - **Fluxo de Caixa** (não inclui lançamentos individuais de cartão; mostra fatura consolidada),
  - **Lançamentos Cartão** (detalhe das compras no cartão).
- Filtro por cartão (quando em “Lançamentos Cartão”).
- Edição de lançamento.
- Exclusão com duas opções:
  - **Excluir apenas este lançamento**;
  - **Excluir tudo (Geral)**: remove série relacionada (ex.: parcelamento/recorrência).
- Limpeza de período (ícone de exclusão em lote) para apagar todos os lançamentos reais do mês/ano selecionado.

### Itens “virtuais” no extrato
No Fluxo de Caixa, o sistema também exibe projeções:
- contas fixas futuras ainda não lançadas;
- faturas consolidadas por vencimento.

Esses itens são apenas de previsão e não podem ser editados diretamente.

## 5.4 Pagar (contas a pagar)
Tela de checklist mensal com:
- despesas do mês atual;
- faturas de cartão consolidadas do mês;
- total do mês, valor pago, pendente e percentual quitado.

### Como usar
- Marque/desmarque o checkbox para alterar status **PAGO/PENDENTE**.
- Se o item for fatura de cartão, a alteração aplica-se aos lançamentos daquela fatura.

## 5.5 Cartões
Mostra até 6 faturas futuras por cartão, com:
- valor da fatura;
- % do limite usado;
- limite disponível;
- botão para abrir os lançamentos da fatura.

## 5.6 Previsão
Apresenta projeções financeiras:
- gráfico de evolução de saldo para os próximos 12 meses;
- tabela diária do mês selecionado com entrada, saída, lucro do dia e saldo acumulado;
- clique em um dia para ver detalhamento dos itens.

A projeção considera:
- transações já registradas;
- recorrências mensais;
- vencimentos de faturas de cartão (por fechamento e vencimento de cada cartão).

## 5.7 Fixas
Lista contas fixas mensais (recorrências):
- descrição, valor, dia do mês e categoria;
- editar recorrência;
- excluir recorrência.

## 5.8 Ajustes
Inclui:
- personalização da cor (tema) por slider/paleta;
- botão de sair da conta;
- **Meus Cartões** (cadastro/edição/exclusão):
  - nome do cartão,
  - limite,
  - dia de fechamento,
  - dia de vencimento,
  - cor de identificação.

---

## 6) Assistente Financeiro (IA)
O botão flutuante no canto inferior direito abre o chat.

### Formas de uso
1. **Blocos de pergunta pronta** (guiado):
   - valor da fatura;
   - saldo projetado em data alvo;
   - resumo mensal;
   - maior despesa do mês;
   - saúde financeira do mês.
2. **Pergunta livre**: digite qualquer pergunta sobre suas finanças.

### Requisitos
- `GOOGLE_API_KEY` configurada.
- Dados financeiros cadastrados (transações/recorrências/cartões).

Sem dados, o assistente informa que ainda não há base para análise.

---

## 7) Fluxo recomendado de uso (dia a dia)
1. Cadastre seus cartões em **Ajustes > Meus Cartões**.
2. Crie categorias personalizadas (se necessário) em **Lançar**.
3. Lance entradas, saídas e compras no cartão diariamente.
4. Marque contas fixas no lançamento quando aplicável.
5. Revise o **Extrato** por mês para corrigir/limpar inconsistências.
6. Use **Pagar** para acompanhar quitação de contas e faturas.
7. Consulte **Previsão** para antecipar sobras/faltas de caixa.
8. Use o **Assistente IA** para análises e resumos rápidos.

---

## 8) Solução de problemas

### Não consigo entrar/criar conta
- Verifique se `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` estão corretos.
- Confira se o projeto Supabase está ativo.

### Erro ao salvar dados
- Confirme se executou `supabase/schema.sql` no Supabase.
- Verifique se as tabelas e políticas RLS foram criadas.

### Assistente IA não responde
- Confira `GOOGLE_API_KEY`.
- Verifique se há dados financeiros cadastrados.

### App não abre localmente
- Rode `npm install` novamente.
- Rode `npm run dev` e acesse `http://localhost:9002`.

---

## 9) Comandos úteis
```bash
npm run dev         # desenvolvimento (porta 9002)
npm run build       # build de produção
npm run start       # inicia app após build
npm run lint        # lint
npm run typecheck   # checagem de tipos TS
```

---

## 10) Observações finais
- Cada usuário vê e altera apenas seus próprios dados (RLS no Supabase).
- O status de pago nas faturas/contas é operacional (controle de quitação).
- A projeção financeira usa regras de cartão (fechamento/vencimento), recorrências e histórico atual.