# Spec — Multiempresa

## Objetivo

Criar uma estrutura SaaS onde cada empresa possui seus próprios dados isolados.

## Conceito principal

Cada empresa será representada por uma tabela `companies`.

Cada usuário terá um perfil na tabela `profiles`.

Cada registro futuro do sistema deverá conter `company_id`.

## Tabelas iniciais

### companies

- id
- name
- slug
- owner_id
- created_at

### profiles

- id
- company_id
- name
- email
- role
- created_at

## Regras

- Cada empresa possui dados próprios.
- Cada usuário pertence a uma empresa.
- Um owner pode administrar sua empresa.
- Futuramente cada tabela terá `company_id`.
- Nenhum usuário pode acessar dados de outra empresa.

## Roles

- owner
- manager
- professional
- receptionist

## Fluxo inicial

1. Usuário cria conta.
2. Usuário cria empresa.
3. Sistema cria profile com role owner.
4. Usuário acessa dashboard da empresa.