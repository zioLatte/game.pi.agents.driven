export function fixCanvasDPI(canvas, ctx) {
  if (!canvas || !ctx) return;
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
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

  const base = bctx.createRadialGradient(
    width * 0.5, height * 0.5, 0,
    width * 0.5, height * 0.5, Math.max(width, height) * 0.75
  );
  base.addColorStop(0, "#2b2a3a");
  base.addColorStop(1, "#14121f");
  bctx.fillStyle = base;
  bctx.fillRect(0, 0, width, height);

  bctx.save();
  bctx.globalAlpha = 0.35;
  const glowA = bctx.createRadialGradient(
    width * 0.12, height * 0.85, 0,
    width * 0.12, height * 0.85, width * 0.55
  );
  glowA.addColorStop(0, "rgba(70, 130, 200, 1)");
  glowA.addColorStop(1, "rgba(70, 130, 200, 0)");
  bctx.fillStyle = glowA;
  bctx.fillRect(0, 0, width, height);

  const glowB = bctx.createRadialGradient(
    width * 0.88, height * 0.2, 0,
    width * 0.88, height * 0.2, width * 0.5
  );
  glowB.addColorStop(0, "rgba(130, 90, 200, 1)");
  glowB.addColorStop(1, "rgba(130, 90, 200, 0)");
  bctx.fillStyle = glowB;
  bctx.fillRect(0, 0, width, height);
  bctx.restore();

  bctx.save();
  bctx.fillStyle = "rgba(220, 220, 255, 0.2)";
  for (let i = 0; i < 260; i += 1) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const r = Math.random() * 1.2 + 0.2;
    bctx.beginPath();
    bctx.arc(x, y, r, 0, Math.PI * 2);
    bctx.fill();
  }
  bctx.restore();

  bctx.save();
  const vignette = bctx.createRadialGradient(
    width * 0.5, height * 0.5, Math.min(width, height) * 0.2,
    width * 0.5, height * 0.5, Math.max(width, height) * 0.65
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.5)");
  bctx.fillStyle = vignette;
  bctx.fillRect(0, 0, width, height);
  bctx.restore();

  return bg;
}
