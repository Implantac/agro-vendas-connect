/** Padroniza as fotos dos implementos: recorte 4:3 e tamanho único de exibição. */
export const PHOTO_WIDTH = 1600;
export const PHOTO_HEIGHT = 1200;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler a imagem."));
    };
    img.src = url;
  });
}

/**
 * Redimensiona qualquer imagem (qualquer formato ou tamanho) para 1600x1200 JPEG.
 * A máquina inteira é preservada: a foto é encaixada dentro do quadro 4:3 e as
 * sobras ficam em fundo branco, então todos os cards ficam do mesmo tamanho.
 */
export async function normalizeListingPhoto(file: File): Promise<File> {
  if (typeof document === "undefined" || !file.type.startsWith("image/")) return file;
  try {
    const img = await loadImage(file);
    const canvas = document.createElement("canvas");
    canvas.width = PHOTO_WIDTH;
    canvas.height = PHOTO_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);

    const scale = Math.min(PHOTO_WIDTH / img.width, PHOTO_HEIGHT / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, (PHOTO_WIDTH - w) / 2, (PHOTO_HEIGHT - h) / 2, w, h);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    if (!blob) return file;
    const name = `${file.name.replace(/\.[^.]+$/, "") || "foto"}.jpg`;
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/**
 * Gera uma versão leve (data URL JPEG, lado maior de 768px) usada apenas para
 * enviar a foto ao gerador de descrição por IA.
 */
export async function toCompactDataUrl(file: File, maxSide = 768): Promise<string | null> {
  if (typeof document === "undefined" || !file.type.startsWith("image/")) return null;
  try {
    const img = await loadImage(file);
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.7);
  } catch {
    return null;
  }
}
