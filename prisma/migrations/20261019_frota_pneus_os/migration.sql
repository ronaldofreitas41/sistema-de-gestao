-- Frota
ALTER TABLE `mh3_equipamentos`
  MODIFY `modelo` VARCHAR(100) NULL,
  MODIFY `ano` VARCHAR(10) NULL,
  ADD COLUMN `empresa_id` BIGINT UNSIGNED NULL,
  ADD COLUMN `modalidade_financiamento` VARCHAR(20) NULL,
  ADD COLUMN `inmetro_venc` DATE NULL,
  ADD COLUMN `outros_nome` VARCHAR(100) NULL,
  ADD COLUMN `outros_venc` DATE NULL,
  ADD COLUMN `financiamento_gerado` TINYINT(1) NOT NULL DEFAULT 0;
UPDATE `mh3_equipamentos` SET `financiamento_gerado` = 1 WHERE LOWER(`situacao_financeira`) LIKE 'financ%';

CREATE TABLE IF NOT EXISTS `mh3_implementos` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `numero` VARCHAR(30) NULL,
  `equipamento_id` BIGINT UNSIGNED NULL,
  `placa` VARCHAR(20) NULL,
  `marca` VARCHAR(100) NULL,
  `modelo` VARCHAR(100) NULL,
  `ano` VARCHAR(10) NULL,
  `niev` VARCHAR(50) NULL,
  `descricao` TEXT NULL,
  `valor_aquisicao` DECIMAL(14,2) NULL,
  `data_aquisicao` DATE NULL,
  `situacao_financeira` VARCHAR(20) NULL,
  `modalidade_financiamento` VARCHAR(20) NULL,
  `banco_financiamento` VARCHAR(100) NULL,
  `tipo_parcela` VARCHAR(20) NULL,
  `quantidade_parcelas` INT NULL,
  `financiamento_gerado` TINYINT(1) NOT NULL DEFAULT 0,
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

-- Pneus
ALTER TABLE `mh3_pneus`
  MODIFY `modelo` VARCHAR(100) NULL,
  MODIFY `medida` VARCHAR(50) NULL,
  MODIFY `dot` VARCHAR(20) NULL,
  MODIFY `local` VARCHAR(100) NULL,
  MODIFY `status` VARCHAR(50) NULL DEFAULT 'estoque',
  ADD COLUMN `codigo` VARCHAR(30) NULL,
  ADD COLUMN `pct_borracha` INT NULL,
  ADD COLUMN `situacao` VARCHAR(20) NOT NULL DEFAULT 'estoque',
  ADD COLUMN `placa` VARCHAR(20) NULL;
UPDATE `mh3_pneus` SET `condicao` = 'carcaça' WHERE LOWER(`condicao`) IN ('carcaca','carcaça');
UPDATE `mh3_pneus` SET `situacao` = 'reforma' WHERE `saiu_reforma` = 1;

CREATE TABLE IF NOT EXISTS `mh3_pneus_historico` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `pneu_id` VARCHAR(50) NOT NULL,
  `tipo` VARCHAR(30) NOT NULL,
  `data` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `descricao` TEXT NULL,
  `usuario` VARCHAR(150) NULL,
  `placa` VARCHAR(20) NULL,
  `os_id` VARCHAR(50) NULL,
  `romaneio_id` BIGINT UNSIGNED NULL,
  PRIMARY KEY (`id`),
  KEY `idx_pneus_hist_pneu` (`pneu_id`)
);

CREATE TABLE IF NOT EXISTS `mh3_romaneios` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `numero` VARCHAR(30) NULL,
  `reformadora` VARCHAR(150) NULL,
  `data_saida` DATE NULL,
  `previsao_retorno` DATE NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'aberto',
  `observacoes` TEXT NULL,
  `criado_por` VARCHAR(150) NULL,
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `retornado_em` DATETIME NULL,
  PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `mh3_romaneio_itens` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `romaneio_id` BIGINT UNSIGNED NOT NULL,
  `pneu_id` VARCHAR(50) NOT NULL,
  `resultado` VARCHAR(20) NULL,
  `pct_borracha` INT NULL,
  `valor_reforma` DECIMAL(14,2) NULL,
  `observacao` VARCHAR(255) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_romaneio_itens` (`romaneio_id`)
);

CREATE TABLE IF NOT EXISTS `mh3_pneu_pendencias` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `os_id` VARCHAR(50) NULL,
  `os_num` VARCHAR(50) NULL,
  `placa` VARCHAR(20) NULL,
  `pneu_saida_id` VARCHAR(50) NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'pendente',
  `pneu_entrada_id` VARCHAR(50) NULL,
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `concluido_em` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `idx_pneu_pend_status` (`status`)
);

-- Ordens de serviço: só aberta ou finalizada; troca de pneus guarda os pneus retirados
ALTER TABLE `mh3_manutencoes` ADD COLUMN `pneus` JSON NULL;
UPDATE `mh3_manutencoes` SET `status` = 'aberta'
  WHERE `status` IS NULL OR LOWER(`status`) IN ('pendente','aberto','aberta');
UPDATE `mh3_manutencoes` SET `status` = 'finalizada' WHERE `status` <> 'aberta';

-- Seguro: várias placas por apólice
ALTER TABLE `mh3_seguros` ADD COLUMN `placas` JSON NULL;
