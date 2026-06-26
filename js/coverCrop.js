const VIEWPORT_W = 220;
const VIEWPORT_H = 314;
const OUTPUT_W = 600;
const OUTPUT_H = 858;

let state = null;

function clampOffsets(s) {
  const scaledW = s.naturalW * s.scale;
  const scaledH = s.naturalH * s.scale;
  const minX = VIEWPORT_W - scaledW;
  const minY = VIEWPORT_H - scaledH;
  s.x = Math.min(0, Math.max(minX, s.x));
  s.y = Math.min(0, Math.max(minY, s.y));
}

function applyTransform() {
  const img = document.getElementById('crop-image');
  img.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
}

function onPointerDown(e) {
  const viewport = document.getElementById('crop-viewport');
  viewport.classList.add('dragging');
  state.dragging = true;
  state.startPointerX = e.clientX;
  state.startPointerY = e.clientY;
  state.startX = state.x;
  state.startY = state.y;
}

function onPointerMove(e) {
  if (!state || !state.dragging) return;
  state.x = state.startX + (e.clientX - state.startPointerX);
  state.y = state.startY + (e.clientY - state.startPointerY);
  clampOffsets(state);
  applyTransform();
}

function onPointerUp() {
  if (!state) return;
  state.dragging = false;
  document.getElementById('crop-viewport').classList.remove('dragging');
}

export function openCropModal(file) {
  return new Promise((resolve) => {
    const modal = document.getElementById('crop-modal');
    const img = document.getElementById('crop-image');
    const zoomInput = document.getElementById('crop-zoom');
    const viewport = document.getElementById('crop-viewport');
    const confirmBtn = document.getElementById('crop-confirm-btn');
    const cancelBtn = document.getElementById('crop-cancel-btn');

    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;

    img.onload = () => {
      const naturalW = img.naturalWidth;
      const naturalH = img.naturalHeight;
      const minScale = Math.max(VIEWPORT_W / naturalW, VIEWPORT_H / naturalH);

      state = {
        naturalW,
        naturalH,
        minScale,
        scale: minScale,
        x: (VIEWPORT_W - naturalW * minScale) / 2,
        y: (VIEWPORT_H - naturalH * minScale) / 2,
        dragging: false,
      };
      clampOffsets(state);
      applyTransform();

      zoomInput.min = minScale;
      zoomInput.max = minScale * 3;
      zoomInput.step = (minScale * 3 - minScale) / 100 || 0.01;
      zoomInput.value = minScale;

      modal.classList.remove('hidden');
    };

    const zoomHandler = () => {
      state.scale = parseFloat(zoomInput.value);
      clampOffsets(state);
      applyTransform();
    };

    const cleanup = () => {
      modal.classList.add('hidden');
      viewport.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      zoomInput.removeEventListener('input', zoomHandler);
      confirmBtn.removeEventListener('click', confirmHandler);
      cancelBtn.removeEventListener('click', cancelHandler);
      URL.revokeObjectURL(objectUrl);
    };

    const confirmHandler = () => {
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_W;
      canvas.height = OUTPUT_H;
      const ctx = canvas.getContext('2d');
      const ratio = OUTPUT_W / VIEWPORT_W;
      ctx.drawImage(
        img,
        0,
        0,
        state.naturalW,
        state.naturalH,
        state.x * ratio,
        state.y * ratio,
        state.naturalW * state.scale * ratio,
        state.naturalH * state.scale * ratio
      );
      canvas.toBlob(
        (blob) => {
          cleanup();
          resolve(blob);
        },
        'image/jpeg',
        0.9
      );
    };

    const cancelHandler = () => {
      cleanup();
      resolve(null);
    };

    viewport.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    zoomInput.addEventListener('input', zoomHandler);
    confirmBtn.addEventListener('click', confirmHandler);
    cancelBtn.addEventListener('click', cancelHandler);
  });
}
