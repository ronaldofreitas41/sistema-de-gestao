CREATE TABLE IF NOT EXISTS `mh3_sequencias` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(60) NOT NULL,
  `ultimo` BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sequencias_nome` (`nome`)
);
ALTER TABLE `mh3_medicoes` ADD COLUMN `numero` VARCHAR(30) NULL;
ALTER TABLE `mh3_contas_receber` ADD COLUMN `numero` VARCHAR(30) NULL;
ALTER TABLE `mh3_ajudas_motorista` ADD COLUMN `numero` VARCHAR(30) NULL;
ALTER TABLE `mh3_mobilizacoes` ADD COLUMN `numero` VARCHAR(30) NULL;
ALTER TABLE `mh3_prejuizos` ADD COLUMN `numero` VARCHAR(30) NULL;
ALTER TABLE `mh3_seguros` ADD COLUMN `numero` VARCHAR(30) NULL;
