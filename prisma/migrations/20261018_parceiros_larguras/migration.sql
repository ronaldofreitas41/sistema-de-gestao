-- Campos curtos demais faziam o cadastro falhar ao salvar (ex.: observações com 45 caracteres)
ALTER TABLE `mh3_parceiros`
  MODIFY `nome` VARCHAR(150) NOT NULL,
  MODIFY `cnpj` VARCHAR(30) NOT NULL,
  MODIFY `email` VARCHAR(150) NULL,
  MODIFY `telefone` VARCHAR(30) NULL,
  MODIFY `endereco` VARCHAR(255) NULL,
  MODIFY `cidade` VARCHAR(100) NULL,
  MODIFY `estado` VARCHAR(2) NULL,
  MODIFY `cep` VARCHAR(10) NULL,
  MODIFY `observacoes` TEXT NULL,
  MODIFY `pix` VARCHAR(150) NULL;
