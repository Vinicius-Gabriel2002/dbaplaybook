const CONTENT = {
  "categories": [
    {
      "id": "oracle",
      "name": "Oracle",
      "color": "#C74634",
      "topics": [
        {
          "id": "archivelog",
          "title": "Habilitar Archivelog",
          "tags": [
            "archivelog",
            "backup",
            "rman"
          ],
          "description": "Ativa o modo de archivelog no banco para permitir backups online e recuperação point-in-time.",
          "sections": [
            {
              "type": "warning",
              "text": "O banco precisa ser reiniciado. Planeje uma janela de manutenção."
            },
            {
              "type": "steps",
              "title": "Passo a passo",
              "items": [
                {
                  "label": "Conecte como SYSDBA",
                  "command": "sqlplus / as sysdba"
                },
                {
                  "label": "Verifique o status atual",
                  "command": "SELECT LOG_MODE FROM V$DATABASE;"
                },
                {
                  "label": "Defina um diretório para os archives",
                  "command": "ALTER SYSTEM SET log_archive_dest_1='location=<LOCAL ARCHIVES>' SCOPE=spfile;"
                },
                {
                  "label": "Configurar nomenclatura dos archives",
                  "command": "ALTER SYSTEM SET log_archive_format='<INSTANCIA>_%t_%s_%r.arc' scope=spfile;"
                },
                {
                  "label": "Desligue o banco de forma limpa",
                  "command": "SHUTDOWN IMMEDIATE;"
                },
                {
                  "label": "Suba em modo mount",
                  "command": "STARTUP MOUNT;"
                },
                {
                  "label": "Habilite o archivelog",
                  "command": "ALTER DATABASE ARCHIVELOG;"
                },
                {
                  "label": "Abra o banco",
                  "command": "ALTER DATABASE OPEN;"
                },
                {
                  "label": "Confirme que está ativo",
                  "command": "SELECT LOG_MODE FROM V$DATABASE;"
                }
              ]
            }
          ]
        },
        {
          "id": "redolog-multiplexar",
          "title": "Multiplexar Redo Logs",
          "tags": [
            "redolog",
            "multiplexar",
            "segurança"
          ],
          "description": "Adiciona membros extras aos grupos de redo log para proteção contra perda de dados.",
          "sections": [
            {
              "type": "info",
              "text": "Multiplexar redo logs é uma boa prática. Em caso de falha de disco, o Oracle continua usando os membros restantes."
            },
            {
              "type": "steps",
              "title": "Passo a passo",
              "items": [
                {
                  "label": "Liste os grupos e membros existentes",
                  "command": "SELECT GROUP#, MEMBER FROM V$LOGFILE ORDER BY GROUP#;"
                },
                {
                  "label": "Adicione um membro ao grupo 1",
                  "command": "ALTER DATABASE ADD LOGFILE MEMBER '/u02/oradata/redo01b.log' TO GROUP 1;"
                },
                {
                  "label": "Adicione um membro ao grupo 2",
                  "command": "ALTER DATABASE ADD LOGFILE MEMBER '/u02/oradata/redo02b.log' TO GROUP 2;"
                },
                {
                  "label": "Adicione um membro ao grupo 3",
                  "command": "ALTER DATABASE ADD LOGFILE MEMBER '/u02/oradata/redo03b.log' TO GROUP 3;"
                },
                {
                  "label": "Confirme a multiplexação",
                  "command": "SELECT GROUP#, MEMBER, STATUS FROM V$LOGFILE ORDER BY GROUP#;"
                }
              ]
            },
            {
              "type": "tip",
              "text": "Coloque os membros em discos físicos diferentes para garantir redundância real."
            }
          ]
        },
        {
          "id": "locks-oracle",
          "title": "Verificar e Matar Locks",
          "tags": [
            "lock",
            "bloqueio",
            "sessão",
            "kill session"
          ],
          "description": "Identifica sessões bloqueando outras e encerra o lock quando necessário.",
          "sections": [
            {
              "type": "warning",
              "text": "Matar uma sessão faz rollback automático das transações pendentes. Confirme com o time de negócio antes."
            },
            {
              "type": "steps",
              "title": "Passo a passo",
              "items": [
                {
                  "label": "Liste sessões com lock",
                  "command": "col \"Sessao\" for a55\nset lines 150\ncol username for a30\n SELECT DECODE(l.request, 0, 'Holder: ', 'Waiter: ') ||' alter system kill session '''||l.sid ||','|| s.serial#||',@'||s.inst_id||''';' \"Sessao\",\n        s.serial#,\n        substr(s.username,1,30) Username,\n        l.id1,        l.id2,        l.lmode,        l.request,        l.type\n   FROM GV$LOCK L, GV$SESSION S\n  WHERE (l.id1, l.id2, l.type) IN\n        (SELECT l2.id1, l2.id2, l2.type FROM GV$LOCK l2 WHERE l2.request > 0)\n    AND s.sid = l.sid\n  ORDER BY l.id1, l.request;"
                },
                {
                  "label": "Encerre a sessão bloqueadora (substitua SID e SERIAL#)",
                  "command": "ALTER SYSTEM KILL SESSION 'SID,SERIAL#' IMMEDIATE;"
                }
              ]
            }
          ]
        },
        {
          "id": "tablespace-espaco",
          "title": "Verificar Espaço em Tablespaces",
          "tags": [
            "tablespace",
            "espaço",
            "disco",
            "crescimento"
          ],
          "description": "Monitora o uso de espaço nas tablespaces para evitar surpresas em produção.",
          "sections": [
            {
              "type": "steps",
              "title": "Passo a passo",
              "items": [
                {
                  "label": "Espaço livre por tablespace",
                  "command": "set lines 200 \nset pages 100 \ncol pdb for a20\ncolumn \"Tablespace\" format A30 \ncolumn \"Usado\" format '9999,990.00' \ncolumn \"Livre\" format '9999,990.00' \ncolumn \"Expansivel\" format A12 \ncolumn \"Total\" format '9999,990.00' \ncolumn \"Usado %\" format '990.00'\ncolumn \"Livre %\" format '990.00' \ncolumn \"Tipo Ger.\" format A12 \n\n\nselect t.tablespace_name \"Tablespace\", round(ar.usado, 2) \"Usado\",\nround(decode(NVL2(cresc.tablespace, 0, sign(ar.Expansivel)),1, (ar.livre + ar.expansivel), ar.livre), 2) \"Livre\",\nround(ar.alocado,2) \"Alocado Mb\", NVL2(cresc.limite, 'ILIMITADO', round(ar.expansivel, 2)) \"Expansivel\",\nround(decode(NVL2(cresc.tablespace, 0, sign(ar.Expansivel)), 1, ar.usado / (ar.total + ar.expansivel), (ar.usado / ar.total)) * 100, 2) \"Usado %\",\nround(decode(NVL2(cresc.tablespace, 0, sign(ar.Expansivel)), 1, (ar.livre + ar.expansivel) / (ar.total + ar.expansivel), (ar.livre / ar.total)) * 100, 2) \"Livre %\",\nround(decode(NVL2(cresc.tablespace, 0, sign(ar.Expansivel)), 1, (ar.total + ar.expansivel), ar.total), 2) \"Total\",\nt.Contents \"Conteudo\", t.Extent_Management \"Tipo Ger.\" \nfrom dba_tablespaces t, (select df.tablespace_name tablespace, \nsum(nvl(df.user_bytes,0))/1024/1024 Alocado, (sum(df.bytes) - sum(NVL(df_fs.bytes, 0))) / 1024 / 1024 Usado, \nsum(NVL(df_fs.bytes, 0)) / 1024 / 1024 Livre, sum(decode(df.autoextensible, 'YES', decode(sign(df.maxbytes - df.bytes), 1, \ndf.maxbytes - df.bytes, 0), 0)) / 1024 / 1024 Expansivel, sum(df.bytes) / 1024 / 1024 Total from dba_data_files df, \n(select tablespace_name, file_id, sum(bytes) bytes from dba_free_space group by tablespace_name, file_id) df_fs \nwhere df.tablespace_name = df_fs.tablespace_name(+) and df.file_id = df_fs.file_id(+) \ngroup by df.tablespace_name \nunion \nselect tf.tablespace_name tablespace, sum(nvl(tf.user_bytes,0))/1024/1024 Alocado, \nsum(tf_fs.bytes_used) / 1024 / 1024 Usado, sum(tf_fs.bytes_free) / 1024 / 1024 Livre,\nsum(decode(tf.autoextensible, 'YES', decode(sign(tf.maxbytes - tf.bytes), 1, tf.maxbytes - tf.bytes, 0), 0)) / 1024 / 1024 Expansivel, \nsum(tf.bytes) / 1024 / 1024 Total from dba_temp_files tf, V$TEMP_SPACE_HEADER tf_fs\nwhere tf.tablespace_name = tf_fs.tablespace_name and tf.file_id = tf_fs.file_id \ngroup by tf.tablespace_name) ar, (select df.tablespace_name tablespace, 'ILIMITADO' limite\nfrom dba_data_files df where df.maxbytes / 1024 / 1024 > 32760 and df.autoextensible = 'YES' \ngroup by df.tablespace_name union select tf.tablespace_name tablespace, 'ILIMITADO' limite \nfrom dba_temp_files tf where tf.maxbytes / 1024 / 1024 > 32760 and tf.autoextensible = 'YES' \ngroup by tf.tablespace_name) cresc where cresc.tablespace(+) = t.tablespace_name and ar.tablespace(+) = t.tablespace_name order by 7;"
                },
                {
                  "label": "Datafiles com autoextend",
                  "command": "SELECT\n  tablespace_name,\n  file_name,\n  ROUND(bytes/1024/1024) AS size_mb,\n  autoextensible,\n  ROUND(maxbytes/1024/1024) AS max_mb\nFROM dba_data_files\nORDER BY tablespace_name;"
                },
                {
                  "label": "Listar todos os datafiles e tamanhos de uma tablespace",
                  "command": "select FILE_NAME, sum(MAXBYTES/1024/1024) from dba_data_files where TABLESPACE_NAME='<TablespaceName>' group by FILE_NAME order by 1;"
                },
                {
                  "label": "Alterar o Maxsize de um datafile",
                  "command": "Alter database datafile '<Datafile>' autoextend on next 500m maxsize <maxsize>;"
                },
                {
                  "label": "Adicionar datafile a tablespace (Com autoextend e maxsize)",
                  "command": "alter tablespace <TablespaceName> add datafile '<dir/datafile>' size 200m autoextend on next 500m maxsize 30000m;"
                }
              ]
            }
          ]
        },
        {
          "id": "custom-1776994218388",
          "title": "Sessões ativas",
          "description": "Lista as sessões ativas do Oracle",
          "tags": [
            "Sessions",
            "Sessões",
            "Performance"
          ],
          "sections": [
            {
              "type": "steps",
              "title": "Passo a passo",
              "items": [
                {
                  "label": "Listar Sessões ativas",
                  "command": "set pagesize 200\nset linesize 200\nset pause off\nset verify off\ncol inst           format 99\ncol username       format a12\ncol os_pid         format 9999999\ncol sessao         format a12\ncol machine        format a30\ncol programa       format a30 truncate\ncol machine_osuser format a40 truncate heading \"MACHINE: OSUSER\"\ncol log_time       format a10  heading 'HORARIO|DO LOGIN' justify right\ncol inicio_ult_cmd format a14 heading 'TEMPO ATIVO|OU INATIVO' justify right\ncol module         format a30\ncol status         format a8\n\nselect s.inst_id inst,\n       s.username,\n       to_number(p.spid) as os_pid,\n       '''' || to_char(s.sid) || ',' || to_char(s.serial#) || '''' as sessao,\n       s.machine || ': ' || s.osuser as machine_osuser,\n       SUBSTR(SUBSTR(s.program,INSTR(s.program,'\\',-1)+1),1,30) as programa,\n       decode( trunc(sysdate-s.logon_time),            -- dias conectado\n               0, to_char(s.logon_time,'hh24:mi:ss'),  -- se menos de um dia\n                  to_char(trunc(sysdate-s.logon_time, 1), 'fm99.0') || ' dias'\n             ) as log_time,\n       decode( trunc(last_call_et/86400),  -- 86400 seg = 1 dia\n               0, '     ',                 -- se 0 dias, coloca brancos\n                  to_char(trunc(last_call_et/60/60/24), '0') || 'd, ')\n       || to_char( to_date(mod(last_call_et, 86400), 'SSSSS'),\n                              'hh24\"h\"MI\"m\"SS\"s\"'\n                 ) as inicio_ult_cmd,\n       SUBSTR(SUBSTR(s.module,INSTR(s.module,'\\',-1)+1),1,30)   as module,\n           s.sql_id,\n       decode(status, 'ACTIVE', 'ATIVO',\n                      'INACTIVE', 'INATIVO',\n                      status) as status\nfrom gv$session s, gv$process p\nwhere s.username is not null\nand s.inst_id = p.inst_id\nand s.paddr = p.addr\nand s.status = 'ACTIVE'\norder by inicio_ult_cmd, status, s.username;\n\nset feedback 6"
                }
              ]
            }
          ]
        },
        {
          "id": "custom-1777035577756",
          "title": "Pegar variáveis de Bind",
          "description": "Pegar o que está dentro das bind variables do SQLID para facilitar a analise da consulta",
          "tags": [],
          "sections": [
            {
              "type": "steps",
              "title": "Passo a passo",
              "items": [
                {
                  "label": "pegar o valor das variáveis",
                  "command": "SELECT name, position, datatype_string, value_string, last_captured\nFROM v$sql_bind_capture\nWHERE sql_id = '&sql_id';"
                }
              ]
            }
          ]
        },
        {
          "id": "custom-1777035843232",
          "title": "Limit processes/Sessions",
          "description": "Alteração do máximo de processes e sessions do Oracle",
          "tags": [
            "processes",
            "sessions",
            "limit processes",
            "limit sessions"
          ],
          "sections": [
            {
              "type": "warning",
              "text": "Necessário reiniciar o banco, planeje uma janela de manutenção"
            },
            {
              "type": "steps",
              "title": "Passo a passo",
              "items": [
                {
                  "label": "Coletar quais os limites atuais",
                  "command": "--Processes:\nselect limit_value,max_utilization from v$resource_limit where resource_name='processes';\n\n--Sessions:\nselect limit_value,max_utilization from v$resource_limit where resource_name='sessions';"
                },
                {
                  "label": "Para aumentar o limite",
                  "command": "--Processes:\nalter system set processes=1000 scope=spfile;\n\n--Sessions\nalter system set sessions=1000 scope=spfile;"
                },
                {
                  "label": "Reiniciar o banco para aplicar",
                  "command": "-- backup do spfile\ncreate pfile='/tmp/pfile.ora' from spfile;\n\n-- Desligar o banco\nshutdown immediate\n\n-- Iniciar o banco\nstartup"
                }
              ]
            }
          ]
        },
        {
          "id": "custom-1777036081788",
          "title": "Resize datafile",
          "description": "Reduzir datafiles com espaço alocado mas sem utilização\nPor exemplo: pós truncate table",
          "tags": [
            "Tablespace",
            "datafile",
            "espaço em disco"
          ],
          "sections": [
            {
              "type": "warning",
              "text": "Faça somente em datafiles com autoextend habilitado"
            },
            {
              "type": "steps",
              "title": "Passo a passo",
              "items": [
                {
                  "label": "Gerar subconsultas",
                  "command": "set lines 200\nset pages 100\ncol FILE_NAME for a100\ncol SMALLEST for a100\n select 'alter database datafile ''' || file_name || ''' resize ' ||  \nceil( (nvl(hwm,1)*8192)/1024/1024+1 )|| 'm;' smallest,\nceil( blocks*8192/1024/1024) currsize,\nceil( blocks*8192/1024/1024) -\nceil( (nvl(hwm,1)*8192)/1024/1024 ) savings\nfrom dba_data_files a,\n( select file_id, max(block_id+blocks-1) hwm\nfrom dba_extents where tablespace_name in (select tablespace_name from dba_tablespaces where CONTENTS='PERMANENT' and STATUS='ONLINE')\ngroup by file_id ) b\nwhere a.file_id = b.file_id(+)\nand tablespace_name in\n(select tablespace_name from dba_tablespaces where CONTENTS='PERMANENT' and STATUS='ONLINE')\norder by savings;"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "sqlserver",
      "name": "SQL Server",
      "color": "#2732cc",
      "topics": [
        {
          "id": "locks-sqlserver",
          "title": "Verificar e Matar Locks",
          "tags": [
            "lock",
            "bloqueio",
            "sessão",
            "kill"
          ],
          "description": "Identifica sessões bloqueadas e encerra processos travados no SQL Server.",
          "sections": [
            {
              "type": "steps",
              "title": "Identificar locks",
              "items": [
                {
                  "label": "Liste sessões bloqueadas",
                  "command": "SELECT\n  r.session_id AS sessao_bloqueada,\n  r.blocking_session_id AS bloqueador,\n  r.wait_type,\n  r.wait_time / 1000 AS espera_seg,\n  t.text AS sql_executado\nFROM sys.dm_exec_requests r\nCROSS APPLY sys.dm_exec_sql_text(r.sql_handle) t\nWHERE r.blocking_session_id > 0;"
                },
                {
                  "label": "Detalhes da sessão bloqueadora",
                  "command": "SELECT\n  session_id,\n  login_name,\n  host_name,\n  program_name,\n  status,\n  last_request_start_time\nFROM sys.dm_exec_sessions\nWHERE session_id = <BLOQUEADOR_ID>;"
                },
                {
                  "label": "Encerre a sessão bloqueadora",
                  "command": "KILL <SESSION_ID>;"
                }
              ]
            },
            {
              "type": "tip",
              "text": "Use sp_who2 para uma visão rápida de todas as sessões ativas e seus bloqueios."
            }
          ]
        },
        {
          "id": "update-build",
          "title": "Atualizar Build (Patch / CU)",
          "tags": [
            "patch",
            "cumulative update",
            "cu",
            "atualização"
          ],
          "description": "Processo para aplicar Cumulative Updates (CU) ou Service Packs no SQL Server.",
          "sections": [
            {
              "type": "warning",
              "text": "Sempre faça backup completo antes de aplicar patches. Teste em ambiente de homologação primeiro."
            },
            {
              "type": "steps",
              "title": "Pré-atualização",
              "items": [
                {
                  "label": "Verifique a versão atual",
                  "command": "SELECT @@VERSION;"
                },
                {
                  "label": "Faça backup de todos os bancos",
                  "command": "EXEC sp_MSforeachdb\n  'IF ''?'' NOT IN (''tempdb'')\n   BACKUP DATABASE [?]\n   TO DISK = ''C:\\Backup\\?_pre_patch.bak''\n   WITH COMPRESSION, STATS = 10';"
                },
                {
                  "label": "Verifique integridade antes do patch",
                  "command": "EXEC sp_MSforeachdb\n  'DBCC CHECKDB([?]) WITH NO_INFOMSGS';"
                }
              ]
            },
            {
              "type": "steps",
              "title": "Pós-atualização",
              "items": [
                {
                  "label": "Confirme a nova versão",
                  "command": "SELECT @@VERSION;"
                },
                {
                  "label": "Verifique o nível de compatibilidade dos bancos",
                  "command": "SELECT name, compatibility_level\nFROM sys.databases\nORDER BY name;"
                },
                {
                  "label": "Atualize estatísticas",
                  "command": "EXEC sp_MSforeachdb\n  'USE [?]; EXEC sp_updatestats';"
                }
              ]
            },
            {
              "type": "result",
              "text": "O instalador do CU para serviços SQL durante a aplicação. O downtime varia entre 5 e 30 minutos dependendo do ambiente."
            }
          ]
        },
        {
          "id": "backup-restore",
          "title": "Backup e Restore",
          "tags": [
            "backup",
            "restore",
            "recovery"
          ],
          "description": "Comandos essenciais de backup completo, diferencial e de log, e como restaurar.",
          "sections": [
            {
              "type": "steps",
              "title": "Backup",
              "items": [
                {
                  "label": "Backup completo (FULL)",
                  "command": "BACKUP DATABASE [NomeBanco]\nTO DISK = 'C:\\Backup\\NomeBanco_FULL.bak'\nWITH COMPRESSION, CHECKSUM, STATS = 10;"
                },
                {
                  "label": "Backup diferencial",
                  "command": "BACKUP DATABASE [NomeBanco]\nTO DISK = 'C:\\Backup\\NomeBanco_DIFF.bak'\nWITH DIFFERENTIAL, COMPRESSION, STATS = 10;"
                },
                {
                  "label": "Backup de log de transações",
                  "command": "BACKUP LOG [NomeBanco]\nTO DISK = 'C:\\Backup\\NomeBanco_LOG.bak'\nWITH COMPRESSION, STATS = 10;"
                }
              ]
            },
            {
              "type": "steps",
              "title": "Restore",
              "items": [
                {
                  "label": "Restaure o FULL (com NORECOVERY se houver DIFF/LOG depois)",
                  "command": "RESTORE DATABASE [NomeBanco]\nFROM DISK = 'C:\\Backup\\NomeBanco_FULL.bak'\nWITH NORECOVERY, STATS = 10;"
                },
                {
                  "label": "Aplique o diferencial",
                  "command": "RESTORE DATABASE [NomeBanco]\nFROM DISK = 'C:\\Backup\\NomeBanco_DIFF.bak'\nWITH NORECOVERY, STATS = 10;"
                },
                {
                  "label": "Aplique o log e finalize",
                  "command": "RESTORE LOG [NomeBanco]\nFROM DISK = 'C:\\Backup\\NomeBanco_LOG.bak'\nWITH RECOVERY;"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "postgresql",
      "name": "PostgreSQL",
      "color": "#10ad45",
      "topics": [
        {
          "id": "locks-postgres",
          "title": "Verificar e Matar Locks",
          "tags": [
            "lock",
            "bloqueio",
            "pg_locks",
            "terminate"
          ],
          "description": "Identifica sessões com locks e encerra processos bloqueados no PostgreSQL.",
          "sections": [
            {
              "type": "steps",
              "title": "Identificar locks",
              "items": [
                {
                  "label": "Liste todas as sessões bloqueadas",
                  "command": "SELECT\n  blocked.pid AS pid_bloqueado,\n  blocked.usename AS usuario,\n  blocked.query AS query_bloqueada,\n  blocking.pid AS pid_bloqueador,\n  blocking.query AS query_bloqueadora\nFROM pg_stat_activity blocked\nJOIN pg_stat_activity blocking\n  ON blocking.pid = ANY(pg_blocking_pids(blocked.pid))\nWHERE cardinality(pg_blocking_pids(blocked.pid)) > 0;"
                },
                {
                  "label": "Cancele apenas a query (mantém a conexão)",
                  "command": "SELECT pg_cancel_backend(<PID>);"
                },
                {
                  "label": "Encerre a sessão inteira",
                  "command": "SELECT pg_terminate_backend(<PID>);"
                }
              ]
            },
            {
              "type": "tip",
              "text": "Use pg_cancel_backend quando quiser apenas interromper a query sem derrubar a conexão do usuário."
            }
          ]
        },
        {
          "id": "vacuum-analyze",
          "title": "VACUUM e ANALYZE",
          "tags": [
            "vacuum",
            "analyze",
            "bloat",
            "performance"
          ],
          "description": "Recupera espaço e atualiza estatísticas para o planner de queries.",
          "sections": [
            {
              "type": "info",
              "text": "O autovacuum cuida disso automaticamente, mas em tabelas muito movimentadas pode ser necessário executar manualmente."
            },
            {
              "type": "steps",
              "title": "Comandos",
              "items": [
                {
                  "label": "VACUUM simples (libera espaço para reuso interno)",
                  "command": "VACUUM NomeDaTabela;"
                },
                {
                  "label": "VACUUM FULL (compacta o arquivo físico — tabela fica locked)",
                  "command": "VACUUM FULL NomeDaTabela;"
                },
                {
                  "label": "ANALYZE (atualiza estatísticas para o planner)",
                  "command": "ANALYZE NomeDaTabela;"
                },
                {
                  "label": "Os dois juntos",
                  "command": "VACUUM ANALYZE NomeDaTabela;"
                },
                {
                  "label": "Verifique tabelas com mais dead tuples",
                  "command": "SELECT\n  schemaname,\n  relname AS tabela,\n  n_dead_tup AS dead_tuples,\n  n_live_tup AS live_tuples,\n  last_autovacuum\nFROM pg_stat_user_tables\nORDER BY n_dead_tup DESC\nLIMIT 20;"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "mysql",
      "name": "MySQL",
      "color": "#F29111",
      "topics": [
        {
          "id": "locks-mysql",
          "title": "Verificar e Matar Locks",
          "tags": [
            "lock",
            "bloqueio",
            "innodb",
            "kill",
            "processlist"
          ],
          "description": "Identifica transações bloqueadas e encerra processos travados no MySQL/InnoDB.",
          "sections": [
            {
              "type": "steps",
              "title": "Identificar locks",
              "items": [
                {
                  "label": "Visão rápida de todos os processos ativos",
                  "command": "SHOW PROCESSLIST;"
                },
                {
                  "label": "Detalhe de bloqueios entre transações (InnoDB)",
                  "command": "SELECT\n  r.trx_id AS trx_bloqueada,\n  r.trx_mysql_thread_id AS thread_bloqueado,\n  r.trx_query AS query_bloqueada,\n  b.trx_id AS trx_bloqueadora,\n  b.trx_mysql_thread_id AS thread_bloqueador,\n  b.trx_query AS query_bloqueadora\nFROM information_schema.innodb_lock_waits w\nJOIN information_schema.innodb_trx r ON r.trx_id = w.requesting_trx_id\nJOIN information_schema.innodb_trx b ON b.trx_id = w.blocking_trx_id;"
                },
                {
                  "label": "Encerre o processo bloqueador (substitua o ID)",
                  "command": "KILL <thread_id>;"
                }
              ]
            },
            {
              "type": "tip",
              "text": "No MySQL 8+, use performance_schema.data_lock_waits no lugar de information_schema.innodb_lock_waits."
            }
          ]
        },
        {
          "id": "backup-mysql",
          "title": "Backup e Restore com mysqldump",
          "tags": [
            "backup",
            "restore",
            "mysqldump",
            "recovery"
          ],
          "description": "Gera e restaura backups lógicos com o mysqldump, ferramenta padrão do MySQL.",
          "sections": [
            {
              "type": "warning",
              "text": "O mysqldump bloqueia as tabelas durante o dump em tabelas MyISAM. Use --single-transaction para InnoDB sem bloqueio."
            },
            {
              "type": "steps",
              "title": "Backup",
              "items": [
                {
                  "label": "Backup de um banco específico",
                  "command": "mysqldump -u root -p --single-transaction nome_banco > backup_banco.sql"
                },
                {
                  "label": "Backup de todos os bancos",
                  "command": "mysqldump -u root -p --all-databases --single-transaction > backup_full.sql"
                },
                {
                  "label": "Backup comprimido (economiza espaço)",
                  "command": "mysqldump -u root -p --single-transaction nome_banco | gzip > backup_banco.sql.gz"
                }
              ]
            },
            {
              "type": "steps",
              "title": "Restore",
              "items": [
                {
                  "label": "Restaure um banco a partir do .sql",
                  "command": "mysql -u root -p nome_banco < backup_banco.sql"
                },
                {
                  "label": "Restaure a partir de arquivo comprimido",
                  "command": "gunzip < backup_banco.sql.gz | mysql -u root -p nome_banco"
                }
              ]
            }
          ]
        },
        {
          "id": "tamanho-databases-mysql",
          "title": "Verificar Tamanho das Databases",
          "tags": [
            "tamanho",
            "espaço",
            "disco",
            "information_schema"
          ],
          "description": "Consulta o espaço utilizado por databases e tabelas direto do catálogo do MySQL.",
          "sections": [
            {
              "type": "steps",
              "title": "Queries úteis",
              "items": [
                {
                  "label": "Tamanho de todas as databases",
                  "command": "SELECT\n  table_schema AS database_name,\n  ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS total_mb\nFROM information_schema.tables\nGROUP BY table_schema\nORDER BY total_mb DESC;"
                },
                {
                  "label": "Tamanho por tabela dentro de um banco",
                  "command": "SELECT\n  table_name AS tabela,\n  ROUND((data_length + index_length) / 1024 / 1024, 2) AS total_mb,\n  ROUND(data_length / 1024 / 1024, 2) AS dados_mb,\n  ROUND(index_length / 1024 / 1024, 2) AS indices_mb\nFROM information_schema.tables\nWHERE table_schema = 'nome_banco'\nORDER BY total_mb DESC;"
                }
              ]
            }
          ]
        },
        {
          "id": "usuarios-privilegios-mysql",
          "title": "Gerenciar Usuários e Privilégios",
          "tags": [
            "usuário",
            "grant",
            "privilégio",
            "permissão",
            "create user"
          ],
          "description": "Cria usuários, concede e revoga permissões no MySQL.",
          "sections": [
            {
              "type": "steps",
              "title": "Usuários",
              "items": [
                {
                  "label": "Crie um novo usuário",
                  "command": "CREATE USER 'nome_usuario'@'%' IDENTIFIED BY 'senha_forte';"
                },
                {
                  "label": "Conceda todas as permissões em um banco",
                  "command": "GRANT ALL PRIVILEGES ON nome_banco.* TO 'nome_usuario'@'%';"
                },
                {
                  "label": "Conceda apenas leitura",
                  "command": "GRANT SELECT ON nome_banco.* TO 'nome_usuario'@'%';"
                },
                {
                  "label": "Aplique as permissões",
                  "command": "FLUSH PRIVILEGES;"
                },
                {
                  "label": "Veja as permissões de um usuário",
                  "command": "SHOW GRANTS FOR 'nome_usuario'@'%';"
                },
                {
                  "label": "Revogue todas as permissões",
                  "command": "REVOKE ALL PRIVILEGES ON nome_banco.* FROM 'nome_usuario'@'%';"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};
