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
 * Redimensiona/recorta qualquer imagem (qualquer formato ou tamanho) para
 * 1600x1200 JPEG, mantendo o enquadramento central.
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

    const scale = Math.max(PHOTO_WIDTH / img.width, PHOTO_HEIGHT / img.height);
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
