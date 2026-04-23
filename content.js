const CONTENT = {
  categories: [
    {
      id: "oracle",
      name: "Oracle",
      color: "#C74634",
      topics: [
        {
          id: "archivelog",
          title: "Habilitar Archivelog",
          tags: ["archivelog", "backup", "rman"],
          description: "Ativa o modo de archivelog no banco para permitir backups online e recuperação point-in-time.",
          sections: [
            {
              type: "warning",
              text: "O banco precisa ser reiniciado. Planeje uma janela de manutenção."
            },
            {
              type: "steps",
              title: "Passo a passo",
              items: [
                {
                  label: "Conecte como SYSDBA",
                  command: "sqlplus / as sysdba"
                },
                {
                  label: "Verifique o status atual",
                  command: "SELECT LOG_MODE FROM V$DATABASE;"
                },
                {
                  label: "Desligue o banco de forma limpa",
                  command: "SHUTDOWN IMMEDIATE;"
                },
                {
                  label: "Suba em modo mount",
                  command: "STARTUP MOUNT;"
                },
                {
                  label: "Habilite o archivelog",
                  command: "ALTER DATABASE ARCHIVELOG;"
                },
                {
                  label: "Abra o banco",
                  command: "ALTER DATABASE OPEN;"
                },
                {
                  label: "Confirme que está ativo",
                  command: "SELECT LOG_MODE FROM V$DATABASE;"
                }
              ]
            },
            {
              type: "result",
              text: "O retorno esperado é: ARCHIVELOG"
            }
          ]
        },
        {
          id: "redolog-multiplexar",
          title: "Multiplexar Redo Logs",
          tags: ["redolog", "multiplexar", "segurança"],
          description: "Adiciona membros extras aos grupos de redo log para proteção contra perda de dados.",
          sections: [
            {
              type: "info",
              text: "Multiplexar redo logs é uma boa prática. Em caso de falha de disco, o Oracle continua usando os membros restantes."
            },
            {
              type: "steps",
              title: "Passo a passo",
              items: [
                {
                  label: "Liste os grupos e membros existentes",
                  command: "SELECT GROUP#, MEMBER FROM V$LOGFILE ORDER BY GROUP#;"
                },
                {
                  label: "Adicione um membro ao grupo 1",
                  command: "ALTER DATABASE ADD LOGFILE MEMBER '/u02/oradata/redo01b.log' TO GROUP 1;"
                },
                {
                  label: "Adicione um membro ao grupo 2",
                  command: "ALTER DATABASE ADD LOGFILE MEMBER '/u02/oradata/redo02b.log' TO GROUP 2;"
                },
                {
                  label: "Adicione um membro ao grupo 3",
                  command: "ALTER DATABASE ADD LOGFILE MEMBER '/u02/oradata/redo03b.log' TO GROUP 3;"
                },
                {
                  label: "Confirme a multiplexação",
                  command: "SELECT GROUP#, MEMBER, STATUS FROM V$LOGFILE ORDER BY GROUP#;"
                }
              ]
            },
            {
              type: "tip",
              text: "Coloque os membros em discos físicos diferentes para garantir redundância real."
            }
          ]
        },
        {
          id: "locks-oracle",
          title: "Verificar e Matar Locks",
          tags: ["lock", "bloqueio", "sessão", "kill session"],
          description: "Identifica sessões bloqueando outras e encerra o lock quando necessário.",
          sections: [
            {
              type: "steps",
              title: "Identificar locks",
              items: [
                {
                  label: "Liste sessões com lock",
                  command: `SELECT
  l.sid,
  l.serial#,
  l.username,
  l.osuser,
  l.machine,
  l.status,
  o.object_name,
  l.lockwait
FROM v$session l
JOIN v$locked_object lo ON lo.session_id = l.sid
JOIN dba_objects o ON o.object_id = lo.object_id
ORDER BY l.sid;`
                },
                {
                  label: "Veja quem está bloqueando quem",
                  command: `SELECT
  w.sid AS sessao_esperando,
  h.sid AS sessao_bloqueando,
  w.username,
  w.osuser,
  w.machine
FROM v$session w
JOIN v$session h ON h.sid = (
  SELECT blocking_session FROM v$session WHERE sid = w.sid
)
WHERE w.blocking_session IS NOT NULL;`
                },
                {
                  label: "Encerre a sessão bloqueadora (substitua SID e SERIAL#)",
                  command: "ALTER SYSTEM KILL SESSION 'SID,SERIAL#' IMMEDIATE;"
                }
              ]
            },
            {
              type: "warning",
              text: "Matar uma sessão faz rollback automático das transações pendentes. Confirme com o time de negócio antes."
            }
          ]
        },
        {
          id: "tablespace-espaco",
          title: "Verificar Espaço em Tablespaces",
          tags: ["tablespace", "espaço", "disco", "crescimento"],
          description: "Monitora o uso de espaço nas tablespaces para evitar surpresas em produção.",
          sections: [
            {
              type: "steps",
              title: "Queries úteis",
              items: [
                {
                  label: "Espaço livre por tablespace",
                  command: `SELECT
  df.tablespace_name,
  ROUND(df.bytes / 1024 / 1024, 2) AS total_mb,
  ROUND(NVL(fs.bytes, 0) / 1024 / 1024, 2) AS livre_mb,
  ROUND((df.bytes - NVL(fs.bytes, 0)) / df.bytes * 100, 2) AS pct_usado
FROM (
  SELECT tablespace_name, SUM(bytes) bytes
  FROM dba_data_files GROUP BY tablespace_name
) df
LEFT JOIN (
  SELECT tablespace_name, SUM(bytes) bytes
  FROM dba_free_space GROUP BY tablespace_name
) fs ON df.tablespace_name = fs.tablespace_name
ORDER BY pct_usado DESC;`
                },
                {
                  label: "Datafiles com autoextend",
                  command: `SELECT
  tablespace_name,
  file_name,
  ROUND(bytes/1024/1024) AS size_mb,
  autoextensible,
  ROUND(maxbytes/1024/1024) AS max_mb
FROM dba_data_files
ORDER BY tablespace_name;`
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: "sqlserver",
      name: "SQL Server",
      color: "#CC2927",
      topics: [
        {
          id: "locks-sqlserver",
          title: "Verificar e Matar Locks",
          tags: ["lock", "bloqueio", "sessão", "kill"],
          description: "Identifica sessões bloqueadas e encerra processos travados no SQL Server.",
          sections: [
            {
              type: "steps",
              title: "Identificar locks",
              items: [
                {
                  label: "Liste sessões bloqueadas",
                  command: `SELECT
  r.session_id AS sessao_bloqueada,
  r.blocking_session_id AS bloqueador,
  r.wait_type,
  r.wait_time / 1000 AS espera_seg,
  t.text AS sql_executado
FROM sys.dm_exec_requests r
CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) t
WHERE r.blocking_session_id > 0;`
                },
                {
                  label: "Detalhes da sessão bloqueadora",
                  command: `SELECT
  session_id,
  login_name,
  host_name,
  program_name,
  status,
  last_request_start_time
FROM sys.dm_exec_sessions
WHERE session_id = <BLOQUEADOR_ID>;`
                },
                {
                  label: "Encerre a sessão bloqueadora",
                  command: "KILL <SESSION_ID>;"
                }
              ]
            },
            {
              type: "tip",
              text: "Use sp_who2 para uma visão rápida de todas as sessões ativas e seus bloqueios."
            }
          ]
        },
        {
          id: "update-build",
          title: "Atualizar Build (Patch / CU)",
          tags: ["patch", "cumulative update", "cu", "atualização"],
          description: "Processo para aplicar Cumulative Updates (CU) ou Service Packs no SQL Server.",
          sections: [
            {
              type: "warning",
              text: "Sempre faça backup completo antes de aplicar patches. Teste em ambiente de homologação primeiro."
            },
            {
              type: "steps",
              title: "Pré-atualização",
              items: [
                {
                  label: "Verifique a versão atual",
                  command: "SELECT @@VERSION;"
                },
                {
                  label: "Faça backup de todos os bancos",
                  command: `EXEC sp_MSforeachdb
  'IF ''?'' NOT IN (''tempdb'')
   BACKUP DATABASE [?]
   TO DISK = ''C:\\Backup\\?_pre_patch.bak''
   WITH COMPRESSION, STATS = 10';`
                },
                {
                  label: "Verifique integridade antes do patch",
                  command: `EXEC sp_MSforeachdb
  'DBCC CHECKDB([?]) WITH NO_INFOMSGS';`
                }
              ]
            },
            {
              type: "steps",
              title: "Pós-atualização",
              items: [
                {
                  label: "Confirme a nova versão",
                  command: "SELECT @@VERSION;"
                },
                {
                  label: "Verifique o nível de compatibilidade dos bancos",
                  command: `SELECT name, compatibility_level
FROM sys.databases
ORDER BY name;`
                },
                {
                  label: "Atualize estatísticas",
                  command: `EXEC sp_MSforeachdb
  'USE [?]; EXEC sp_updatestats';`
                }
              ]
            },
            {
              type: "result",
              text: "O instalador do CU para serviços SQL durante a aplicação. O downtime varia entre 5 e 30 minutos dependendo do ambiente."
            }
          ]
        },
        {
          id: "backup-restore",
          title: "Backup e Restore",
          tags: ["backup", "restore", "recovery"],
          description: "Comandos essenciais de backup completo, diferencial e de log, e como restaurar.",
          sections: [
            {
              type: "steps",
              title: "Backup",
              items: [
                {
                  label: "Backup completo (FULL)",
                  command: `BACKUP DATABASE [NomeBanco]
TO DISK = 'C:\\Backup\\NomeBanco_FULL.bak'
WITH COMPRESSION, CHECKSUM, STATS = 10;`
                },
                {
                  label: "Backup diferencial",
                  command: `BACKUP DATABASE [NomeBanco]
TO DISK = 'C:\\Backup\\NomeBanco_DIFF.bak'
WITH DIFFERENTIAL, COMPRESSION, STATS = 10;`
                },
                {
                  label: "Backup de log de transações",
                  command: `BACKUP LOG [NomeBanco]
TO DISK = 'C:\\Backup\\NomeBanco_LOG.bak'
WITH COMPRESSION, STATS = 10;`
                }
              ]
            },
            {
              type: "steps",
              title: "Restore",
              items: [
                {
                  label: "Restaure o FULL (com NORECOVERY se houver DIFF/LOG depois)",
                  command: `RESTORE DATABASE [NomeBanco]
FROM DISK = 'C:\\Backup\\NomeBanco_FULL.bak'
WITH NORECOVERY, STATS = 10;`
                },
                {
                  label: "Aplique o diferencial",
                  command: `RESTORE DATABASE [NomeBanco]
FROM DISK = 'C:\\Backup\\NomeBanco_DIFF.bak'
WITH NORECOVERY, STATS = 10;`
                },
                {
                  label: "Aplique o log e finalize",
                  command: `RESTORE LOG [NomeBanco]
FROM DISK = 'C:\\Backup\\NomeBanco_LOG.bak'
WITH RECOVERY;`
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: "postgresql",
      name: "PostgreSQL",
      color: "#336791",
      topics: [
        {
          id: "locks-postgres",
          title: "Verificar e Matar Locks",
          tags: ["lock", "bloqueio", "pg_locks", "terminate"],
          description: "Identifica sessões com locks e encerra processos bloqueados no PostgreSQL.",
          sections: [
            {
              type: "steps",
              title: "Identificar locks",
              items: [
                {
                  label: "Liste todas as sessões bloqueadas",
                  command: `SELECT
  blocked.pid AS pid_bloqueado,
  blocked.usename AS usuario,
  blocked.query AS query_bloqueada,
  blocking.pid AS pid_bloqueador,
  blocking.query AS query_bloqueadora
FROM pg_stat_activity blocked
JOIN pg_stat_activity blocking
  ON blocking.pid = ANY(pg_blocking_pids(blocked.pid))
WHERE cardinality(pg_blocking_pids(blocked.pid)) > 0;`
                },
                {
                  label: "Cancele apenas a query (mantém a conexão)",
                  command: "SELECT pg_cancel_backend(<PID>);"
                },
                {
                  label: "Encerre a sessão inteira",
                  command: "SELECT pg_terminate_backend(<PID>);"
                }
              ]
            },
            {
              type: "tip",
              text: "Use pg_cancel_backend quando quiser apenas interromper a query sem derrubar a conexão do usuário."
            }
          ]
        },
        {
          id: "vacuum-analyze",
          title: "VACUUM e ANALYZE",
          tags: ["vacuum", "analyze", "bloat", "performance"],
          description: "Recupera espaço e atualiza estatísticas para o planner de queries.",
          sections: [
            {
              type: "info",
              text: "O autovacuum cuida disso automaticamente, mas em tabelas muito movimentadas pode ser necessário executar manualmente."
            },
            {
              type: "steps",
              title: "Comandos",
              items: [
                {
                  label: "VACUUM simples (libera espaço para reuso interno)",
                  command: "VACUUM NomeDaTabela;"
                },
                {
                  label: "VACUUM FULL (compacta o arquivo físico — tabela fica locked)",
                  command: "VACUUM FULL NomeDaTabela;"
                },
                {
                  label: "ANALYZE (atualiza estatísticas para o planner)",
                  command: "ANALYZE NomeDaTabela;"
                },
                {
                  label: "Os dois juntos",
                  command: "VACUUM ANALYZE NomeDaTabela;"
                },
                {
                  label: "Verifique tabelas com mais dead tuples",
                  command: `SELECT
  schemaname,
  relname AS tabela,
  n_dead_tup AS dead_tuples,
  n_live_tup AS live_tuples,
  last_autovacuum
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 20;`
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};
