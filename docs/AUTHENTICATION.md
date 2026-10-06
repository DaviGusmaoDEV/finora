# Autenticação e autorização

O Finora usa sessões stateful armazenadas no PostgreSQL.

- O navegador recebe somente um token aleatório em cookie `HttpOnly`.
- O banco armazena apenas o hash SHA-256 do token.
- O cookie usa `SameSite=Lax`, `Secure` em produção, `Path=/` e expiração de 30 dias.
- Logout revoga a sessão no banco e limpa o cookie.
- O usuário de cada request é derivado da sessão; nenhum endpoint privado aceita `userId` do cliente.
- Senhas são armazenadas com Argon2id.
- Rate limiting é aplicado globalmente e com limites mais restritivos em login/cadastro.
- Requests mutáveis com `Origin` diferente da origem configurada são rejeitados.

Em produção, configure `WEB_ORIGIN`, `COOKIE_NAME`, `DATABASE_URL` e `SESSION_SECRET` por secret
manager. Nunca use o seed demo ou senhas demo em produção.
