ALTER TABLE `mh3_prejuizos`
  ADD COLUMN `conta_receber_id` VARCHAR(36) NULL,
  ADD COLUMN `cliente` VARCHAR(255) NULL,
  ADD COLUMN `vencimento_original` DATE NULL,
  ADD COLUMN `negociado_em` DATETIME NULL;

ALTER TABLE `mh3_movimentacoes_bancarias`
  MODIFY `motivo` VARCHAR(255) NULL,
  ADD COLUMN `saldo_anterior` DECIMAL(14,2) NULL,
  ADD COLUMN `saldo_novo` DECIMAL(14,2) NULL,
  ADD COLUMN `ref_tipo` VARCHAR(30) NULL,
  ADD COLUMN `ref_id` VARCHAR(60) NULL;
