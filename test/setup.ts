// O resultado da API depende do fuso horário do servidor (ver docs/01-diagnostico.md, item 5.1).
// Os testes fixam UTC para darem o mesmo resultado em qualquer máquina.
process.env.TZ = 'UTC'
