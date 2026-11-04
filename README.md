# GS Gestão Clínica

CRM e gestão comercial para clínicas: funil, ficha do lead, painel de números, marketing e visão da agência.
Stack: Next.js 15 + Supabase (banco, login e permissões) + Vercel (hospedagem).

## 1. Banco (Supabase)

1. Crie o projeto (região São Paulo).
2. SQL Editor → New query → cole `supabase/schema.sql` → Run.
3. Authentication → Users → Add user (seu e-mail e senha, marque "Auto confirm").
4. No SQL Editor, rode (trocando o e-mail):

```sql
update profiles set is_agency = true where id = (select id from auth.users where email = 'SEU_EMAIL');
```

## 2. Variáveis de ambiente

| Variável | Onde achar | Pública? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | Sim |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public | Sim |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role | **Não. Só na Vercel.** |

## 3. Publicar (Vercel)

1. Vercel → Add New → Project → importe o repositório `gs-gestao-clinica`.
2. Em Environment Variables, cole as três variáveis acima.
3. Deploy.
4. Settings → Domains → adicione `app.seudominio.com.br` e crie no seu provedor de DNS o registro CNAME que a Vercel mostrar.
5. No Supabase → Authentication → URL Configuration, coloque o domínio em Site URL.

## 4. Primeiro uso

1. Entre com seu e-mail (perfil agência).
2. Visão da agência → Nova clínica.
3. Criar acesso → dono e secretária da clínica.

## Perfis

| Perfil | Vê |
| --- | --- |
| Secretária | Funil, leads, ficha, tarefas |
| Dono | Tudo da própria clínica, incluindo painel e faturamento |
| Agência | Todas as clínicas, painel, marketing e visão da agência |

## Rodar localmente

```bash
cp .env.example .env.local   # preencha as variáveis
npm install
npm run dev
```
