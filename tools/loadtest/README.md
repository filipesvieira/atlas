# Load test pré-multiplayer (k6)

O servidor permite apenas uma sessão por personagem, portanto **cada VU precisa de um character_id exclusivo**.

Exemplo de smoke test:

```bash
AUTH_TOKEN='...' \
CHARACTER_IDS='uuid1,uuid2,uuid3' \
CCU_1=3 CCU_2=3 CCU_3=3 CCU_4=3 CCU_5=3 HOLD=20s \
k6 run tools/loadtest/k6_ws.js
```

Para a rampa completa, forneça uma lista com até 5.000 personagens de QA. Monitore `/api/v1/admin/telemetry`, CPU, RAM, PostgreSQL e latência de disco. As métricas `ws_bytes_out_total`, `ws_frames_out_total`, `ws_slow_write_over_50ms_total` e contadores da fila de persistência foram adicionados na Performance V2.