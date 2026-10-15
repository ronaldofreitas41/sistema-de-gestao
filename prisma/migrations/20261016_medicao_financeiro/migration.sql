-- Medições: parceria, aprovação em cadeia, corretor, desconto
ALTER TABLE `mh3_medicoes`
  MODIFY `status` ENUM('pendente','pago','cancelado','aguardando','aprovado') NOT NULL DEFAULT 'aguardando',
  ADD COLUMN `modalidade` VARCHAR(20) NOT NULL DEFAULT 'frota',
  ADD COLUMN `papel` VARCHAR(20) NOT NULL DEFAULT 'contratante',
  ADD COLUMN `medicao_principal_id` BIGINT NULL,
  ADD COLUMN `data_vencimento` DATE NULL,
  ADD COLUMN `desconto_percentual` DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN `corretor_nome` VARCHAR(150) NULL,
  ADD COLUMN `corretor_valor` DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN `valor_excedente` DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN `aprovado_em` DATETIME NULL,
  ADD COLUMN `aprovado_por` VARCHAR(150) NULL;

-- Medições antigas já geraram contas a receber: ficam aprovadas (travadas)
UPDATE `mh3_medicoes` SET `status` = 'aprovado' WHERE `status` IN ('pendente','pago');
UPDATE `mh3_medicoes` SET `modalidade` = 'parceria' WHERE `terceiro` = 1;
UPDATE `mh3_medicoes` SET `data_vencimento` = DATE(`data_medicao`) WHERE `data_vencimento` IS NULL;
ALTER TABLE `mh3_medicoes`
  MODIFY `status` ENUM('aguardando','aprovado','cancelado') NOT NULL DEFAULT 'aguardando';

-- Contas a receber
ALTER TABLE `mh3_contas_receber`
  ADD COLUMN `data_vencimento` DATE NULL,
  ADD COLUMN `vencimento_original` DATE NULL,
  ADD COLUMN `data_recebimento` DATE NULL,
  ADD COLUMN `conta_banco_id` VARCHAR(100) NULL,
  ADD COLUMN `medicao_id` BIGINT NULL,
  ADD COLUMN `prejuizo_id` BIGINT NULL;
UPDATE `mh3_contas_receber` SET `data_vencimento` = DATE(`data_emissao`) WHERE `data_vencimento` IS NULL;
UPDATE `mh3_contas_receber`
  SET `medicao_id` = CAST(REPLACE(SUBSTRING_INDEX(`observacoes`, 'medição ', -1), '.', '') AS UNSIGNED)
  WHERE `observacoes` LIKE 'Lançamento automático da medição %';

-- Contas a pagar
ALTER TABLE `mh3_despesas`
  ADD COLUMN `valor_pago` DECIMAL(14,2) NULL,
  ADD COLUMN `medicao_id` BIGINT NULL,
  ADD COLUMN `grupo_parcela` VARCHAR(40) NULL,
  ADD COLUMN `parcela_num` INT NULL,
  ADD COLUMN `parcela_total` INT NULL,
  ADD COLUMN `origem` VARCHAR(40) NULL;
UPDATE `mh3_despesas`
  SET `medicao_id` = CAST(SUBSTRING_INDEX(`num_desp`, ' - ', -1) AS UNSIGNED), `origem` = 'medicao'
  WHERE `num_desp` LIKE 'MED - %' AND `categoria` = 'Medição de terceiro';

-- Empresas: cores do layout dos PDFs
ALTER TABLE `mh3_empresas`
  ADD COLUMN `cor_primaria` VARCHAR(9) NULL,
  ADD COLUMN `cor_secundaria` VARCHAR(9) NULL;

-- Parceiros: dados bancários
ALTER TABLE `mh3_parceiros`
  ADD COLUMN `banco` VARCHAR(80) NULL,
  ADD COLUMN `agencia` VARCHAR(20) NULL,
  ADD COLUMN `conta` VARCHAR(30) NULL,
  ADD COLUMN `tipo_conta` VARCHAR(20) NULL,
  ADD COLUMN `titular` VARCHAR(150) NULL,
  ADD COLUMN `documento_titular` VARCHAR(30) NULL,
  ADD COLUMN `tipo_cadastro` VARCHAR(20) NULL;
