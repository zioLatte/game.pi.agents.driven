export function fixCanvasDPI(canvas, ctx) {
  if (!canvas || !ctx) return;
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = false;
}

export function sizeCanvasToLayout(canvas, layoutEl, gameWrapEl) {
  if (!canvas) return;
  const layoutStyle = layoutEl ? getComputedStyle(layoutEl) : null;
  const wrapStyle = gameWrapEl ? getComputedStyle(gameWrapEl) : null;
  const paddingX = layoutStyle
    ? parseFloat(layoutStyle.paddingLeft) + parseFloat(layoutStyle.paddingRight)
    : 0;
  const paddingY = layoutStyle
    ? parseFloat(layoutStyle.paddingTop) + parseFloat(layoutStyle.paddingBottom)
    : 0;
  const gapY = wrapStyle
    ? parseFloat(wrapStyle.rowGap || wrapStyle.gap || "0")
    : 0;
  const availableWidth = Math.max(200, window.innerWidth - paddingX);
  const availableHeight = Math.max(200, window.innerHeight - paddingY - gapY);
  const maxHeight = Math.max(200, window.innerHeight * 0.9);
  const size = Math.floor(Math.min(availableWidth, maxHeight, availableHeight));
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  if (gameWrapEl) {
    gameWrapEl.style.marginTop = "1vh";
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
  bctx.imageSmoothingEnabled = false;

  const base = bctx.createLinearGradient(0, 0, 0, height);
  base.addColorStop(0, "#2a2923");
  base.addColorStop(0.58, "#1f211d");
  base.addColorStop(1, "#151712");
  bctx.fillStyle = base;
  bctx.fillRect(0, 0, width, height);

  bctx.save();
  bctx.globalAlpha = 0.36;
  bctx.fillStyle = "#34302a";
  for (let y = 0; y < height; y += 32) {
    bctx.fillRect(0, y, width, 3);
  }
  bctx.globalAlpha = 0.28;
  bctx.fillStyle = "#0d0f0c";
  for (let x = -height; x < width; x += 52) {
    bctx.beginPath();
    bctx.moveTo(x, height);
    bctx.lineTo(x + height * 0.34, 0);
    bctx.lineTo(x + height * 0.34 + 3, 0);
    bctx.lineTo(x + 3, height);
    bctx.closePath();
    bctx.fill();
  }
  bctx.restore();

  bctx.save();
  bctx.globalAlpha = 0.42;
  bctx.fillStyle = "#2b2b2b";
  const roadWidth = Math.max(70, width * 0.16);
  bctx.fillRect(width * 0.5 - roadWidth * 0.5, 0, roadWidth, height);
  bctx.fillStyle = "#d9c864";
  for (let y = -18; y < height; y += 54) {
    bctx.fillRect(width * 0.5 - 3, y, 6, 22);
  }
  bctx.fillStyle = "rgba(255, 255, 255, 0.14)";
  bctx.fillRect(width * 0.5 - roadWidth * 0.5 + 6, 0, 3, height);
  bctx.fillRect(width * 0.5 + roadWidth * 0.5 - 9, 0, 3, height);
  bctx.restore();

  bctx.save();
  const vignette = bctx.createRadialGradient(
    width * 0.5, height * 0.5, Math.min(width, height) * 0.24,
    width * 0.5, height * 0.5, Math.max(width, height) * 0.72
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.42)");
  bctx.fillStyle = vignette;
  bctx.fillRect(0, 0, width, height);
  bctx.restore();

  return bg;
}
