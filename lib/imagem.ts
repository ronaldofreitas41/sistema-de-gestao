/** Lê a imagem e a reduz (lado maior 1280px, JPEG 0,75) para o registro caber no banco e no envio. */
export function lerImagemComprimida(arquivo: File, ladoMaximo = 1280, qualidade = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = () => reject(new Error(`Não foi possível ler a imagem ${arquivo.name}`));
    leitor.onload = () => {
      const original = String(leitor.result);
      const imagem = new Image();
      imagem.onerror = () => resolve(original);
      imagem.onload = () => {
        try {
          const escala = Math.min(1, ladoMaximo / Math.max(imagem.width, imagem.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(imagem.width * escala));
          canvas.height = Math.max(1, Math.round(imagem.height * escala));
          const contexto = canvas.getContext("2d");
          if (!contexto) return resolve(original);
          contexto.fillStyle = "#fff";
          contexto.fillRect(0, 0, canvas.width, canvas.height);
          contexto.drawImage(imagem, 0, 0, canvas.width, canvas.height);
          const reduzida = canvas.toDataURL("image/jpeg", qualidade);
          resolve(reduzida.length < original.length ? reduzida : original);
        } catch {
          resolve(original);
        }
      };
      imagem.src = original;
    };
    leitor.readAsDataURL(arquivo);
  });
}
