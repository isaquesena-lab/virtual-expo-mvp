const MAX_SIDE = 480;
const MAX_INPUT_BYTES = 25 * 1024 * 1024;

/**
 * Downscale a user-chosen picture to at most 480px on its longest side and
 * re-encode it (WebP where supported, else PNG). Re-encoding also strips metadata
 * and keeps the upload small. Throws a user-readable Error on bad input.
 */
export async function prepareLogo(file: File): Promise<Blob> {
  if (!/^image\/(png|jpe?g|webp|gif|avif|bmp)$/i.test(file.type)) throw new Error("Please choose a PNG, JPEG, WebP, GIF, AVIF or BMP image.");
  if (file.size > MAX_INPUT_BYTES) throw new Error("That image is too large (max 25 MB).");

  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    throw new Error("Could not read that image. It may be corrupted or have too many pixels; try a smaller version.");
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process that image.");
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", 0.9));
  if (!blob) throw new Error("Could not process that image.");
  return blob;
}
