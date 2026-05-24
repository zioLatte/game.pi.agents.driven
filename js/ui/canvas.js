export function fixCanvasDPI(canvas, ctx) {
  if (!canvas || !ctx) return;
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
}

export function sizeCanvasToLayout(canvas, layoutEl, gameWrapEl) {
  if (!canvas) return;

  const targetEl = gameWrapEl || canvas.parentElement || layoutEl || document.body;
  const targetRect = targetEl.getBoundingClientRect();
  const targetStyle = getComputedStyle(targetEl);
  const paddingX = parseFloat(targetStyle.paddingLeft || "0") + parseFloat(targetStyle.paddingRight || "0");
  const paddingY = parseFloat(targetStyle.paddingTop || "0") + parseFloat(targetStyle.paddingBottom || "0");

  let width = Math.floor(targetRect.width - paddingX);
  let height = Math.floor(targetRect.height - paddingY);

  if (!Number.isFinite(width) || width < 240 || !Number.isFinite(height) || height < 160) {
    const layoutStyle = layoutEl ? getComputedStyle(layoutEl) : null;
    const layoutPaddingX = layoutStyle
      ? parseFloat(layoutStyle.paddingLeft || "0") + parseFloat(layoutStyle.paddingRight || "0")
      : 0;
    const layoutPaddingY = layoutStyle
      ? parseFloat(layoutStyle.paddingTop || "0") + parseFloat(layoutStyle.paddingBottom || "0")
      : 0;
    width = Math.floor(window.innerWidth - layoutPaddingX);
    height = Math.floor(window.innerHeight - layoutPaddingY);
  }

  width = Math.max(240, width);
  height = Math.max(160, height);

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  if (gameWrapEl) {
    gameWrapEl.style.marginTop = "0";
  }
}

export function refreshWorldSize(canvas, ctx, layoutEl, gameWrapEl) {
  sizeCanvasToLayout(canvas, layoutEl, gameWrapEl);
  fixCanvasDPI(canvas, ctx);
  const dpr = window.devicePixelRatio || 1;
  return {
    width: canvas.width / dpr,
    height: canvas.height / dpr
  };
}

export function buildBackground(width, height) {
  const bg = document.createElement("canvas");
  bg.width = Math.max(1, Math.floor(width));
  bg.height = Math.max(1, Math.floor(height));
  const bctx = bg.getContext("2d");
  bctx.imageSmoothingEnabled = true;
  bctx.imageSmoothingQuality = "high";

  const wood = bctx.createLinearGradient(0, 0, width, height);
  wood.addColorStop(0, "#7a4b26");
  wood.addColorStop(0.32, "#9b6435");
  wood.addColorStop(0.67, "#6b3f21");
  wood.addColorStop(1, "#a16a39");
  bctx.fillStyle = wood;
  bctx.fillRect(0, 0, width, height);

  bctx.save();
  bctx.globalAlpha = 0.24;
  for (let y = -height; y < height * 2; y += 30) {
    bctx.strokeStyle = y % 90 === 0 ? "rgba(255, 219, 157, 0.22)" : "rgba(54, 28, 12, 0.24)";
    bctx.lineWidth = y % 90 === 0 ? 2 : 1;
    bctx.beginPath();
    bctx.moveTo(0, y + 0.5);
    bctx.bezierCurveTo(width * 0.25, y + 10, width * 0.55, y - 12, width, y + 7);
    bctx.stroke();
  }
  bctx.restore();

  bctx.save();
  bctx.globalAlpha = 0.18;
  for (let i = 0; i < 12; i += 1) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const r = 18 + Math.random() * 46;
    const stain = bctx.createRadialGradient(x, y, 0, x, y, r);
    stain.addColorStop(0, "rgba(38, 18, 6, 0.35)");
    stain.addColorStop(1, "rgba(38, 18, 6, 0)");
    bctx.fillStyle = stain;
    bctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  bctx.restore();

  bctx.save();
  bctx.globalAlpha = 0.12;
  bctx.fillStyle = "#f1dfb5";
  const scrapCount = Math.max(3, Math.floor(Math.min(width, height) / 180));
  for (let i = 0; i < scrapCount; i += 1) {
    const sw = 40 + Math.random() * 90;
    const sh = 22 + Math.random() * 56;
    const x = Math.random() < 0.5 ? Math.random() * 60 : width - sw - Math.random() * 60;
    const y = Math.random() * Math.max(1, height - sh);
    bctx.save();
    bctx.translate(x + sw * 0.5, y + sh * 0.5);
    bctx.rotate((Math.random() - 0.5) * 0.45);
    bctx.fillRect(-sw * 0.5, -sh * 0.5, sw, sh);
    bctx.restore();
  }
  bctx.restore();

  return bg;
}
