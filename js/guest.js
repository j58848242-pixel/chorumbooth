// ==========================================
// 1. INISIALISASI DOM & HAPTIC ENGINE
// ==========================================
const btnConfirmFrame = document.getElementById('btnConfirmFrame');
const sectionFrame = document.getElementById('step-frame');
const sectionCamera = document.getElementById('step-camera');
const sectionAdjust = document.getElementById('step-adjust');
const sectionDone = document.getElementById('step-done');

const framePreview = document.getElementById('framePreview');
const btnPrevFrame = document.getElementById('btnPrevFrame');
const btnNextFrame = document.getElementById('btnNextFrame');
const frameNameDisplay = document.getElementById('frameNameDisplay');

const cameraStream = document.getElementById('cameraStream');
const btnCapture = document.getElementById('btnCapture');
const btnFinishCapture = document.getElementById('btnFinishCapture');
const captureHelperText = document.getElementById('captureHelperText');
const thumbnailContainer = document.getElementById('thumbnailContainer');
const btnSwitchCamera = document.getElementById('btnSwitchCamera');
const btnToggleFlash = document.getElementById('btnToggleFlash');
const flashOverlay = document.getElementById('flashOverlay');

const timerBtns = document.querySelectorAll('.timer-btn');
const filterBtns = document.querySelectorAll('.filter-btn');
const countdownOverlay = document.getElementById('countdownOverlay');

const adjustWorkspace = document.getElementById('adjustWorkspace');
const adjustPhotoLayers = document.getElementById('adjustPhotoLayers');
const adjustFrameOverlay = document.getElementById('adjustFrameOverlay');
const adjustThumbnails = document.getElementById('adjustThumbnails');
const btnConfirmAdjust = document.getElementById('btnConfirmAdjust');
const btnBackToCamera = document.getElementById('btnBackToCamera');

const photoCanvas = document.getElementById('photoCanvas');
const finalResult = document.getElementById('finalResult');
const btnDownload = document.getElementById('btnDownload');
const qrLoading = document.getElementById('qrLoading');
const qrContainer = document.getElementById('qrContainer');
const qrCodeImg = document.getElementById('qrCode');
const qrHelperText = document.getElementById('qrHelperText');

// --- HAPTIC ENGINE (GETARAN FISIK ANDROID) ---
const Haptic = {
    tap: () => { if (navigator.vibrate) navigator.vibrate(15); },
    tick: () => { if (navigator.vibrate) navigator.vibrate(25); },
    shutter: () => { if (navigator.vibrate) navigator.vibrate([40, 25, 85]); },
    success: () => { if (navigator.vibrate) navigator.vibrate([70, 40, 130]); },
    error: () => { if (navigator.vibrate) navigator.vibrate([50, 50, 50]); }
};

// ==========================================
// VARIABEL GLOBAL & BASE URL DINAMIS
// ==========================================
// Base URL otomatis mendeteksi domain tempat web ini dijalankan
const DYNAMIC_BASE_URL = window.location.origin + window.location.pathname.replace('guest.html', '');

window.guestData = window.guestData || { selectedFrame: '', photoBase64: '' };
let videoStream = null;
let currentFrameIndex = 0;
let capturedPhotos = []; 
let currentSlots = 3;    
let framesList = []; 
let finalCanvasWidth = 1080;
let finalCanvasHeight = 1920;

let selectedTimer = 0;
let selectedFilter = 'none';
let isCountingDown = false;
let currentFacingMode = 'user'; 
let isFlashActive = false;

// Kumpulan Microcopy Dinamis
const posePrompts = ["Senyum Manis! 😊", "Gaya Bebas! ✌️", "Slay Terus! 🔥", "Muka Jelek! 🤪", "Finger Heart! 🫰"];

// ==========================================
// 2. KONEKSI: MUAT FRAME JSON
// ==========================================
window.addEventListener('DOMContentLoaded', async () => {
    btnConfirmFrame.innerText = "Memuat Frame...";
    btnConfirmFrame.disabled = true;
    
    // Pasang Haptic ke semua tombol interaktif
    document.querySelectorAll('button, .tab-btn').forEach(btn => {
        btn.addEventListener('mousedown', Haptic.tap);
        btn.addEventListener('touchstart', Haptic.tap, {passive: true});
    });

    try {
        const res = await fetch(FRAMES_JSON_URL + '?t=' + new Date().getTime()); 
        const result = await res.json();
        
        if (result.is_event_active !== true) {
            alert("Maaf, Event Photobooth CHORUM saat ini sedang ditutup.");
            window.location.href = 'index.html'; 
            return;
        }

        if (result.status === 'success' && result.frames.length > 0) {
            framesList = result.frames;
            btnConfirmFrame.innerText = "Gunakan Frame Ini";
            btnConfirmFrame.disabled = false;
            updateFrameUI();
        }
    } catch(error) { 
        alert("Gagal memuat frame. Cek koneksi internet."); 
        frameNameDisplay.innerText = "Offline Mode";
    }
});

function updateFrameUI() {
    if(framesList.length === 0) return;
    const currentFrame = framesList[currentFrameIndex];
    framePreview.src = currentFrame.url;
    currentSlots = currentFrame.slots;
    frameNameDisplay.innerText = `${currentFrame.name} (${currentSlots} Slot)`;
    guestData.selectedFrame = currentFrame.url;
}
btnNextFrame.addEventListener('click', () => { currentFrameIndex = (currentFrameIndex + 1) % framesList.length; updateFrameUI(); });
btnPrevFrame.addEventListener('click', () => { currentFrameIndex = (currentFrameIndex - 1 + framesList.length) % framesList.length; updateFrameUI(); });

// ==========================================
// 3. KAMERA PRO DENGAN PENANGANAN ERROR (Misi 2)
// ==========================================
btnConfirmFrame.addEventListener('click', () => {
    sectionFrame.classList.remove('active');
    sectionCamera.classList.add('active');
    capturedPhotos = [];
    renderThumbnails();
    startCamera();
});

async function startCamera() {
    const errorOverlay = document.getElementById('camera-error-overlay');
    
    // Sembunyikan error overlay tiap kali mencoba menghidupkan kamera
    if(errorOverlay) errorOverlay.style.display = 'none';

    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
    }
    
    try {
        const constraints = { 
            video: { facingMode: currentFacingMode, width: { ideal: 3840 }, height: { ideal: 2160 } }, 
            audio: false 
        };
        videoStream = await navigator.mediaDevices.getUserMedia(constraints);
        cameraStream.srcObject = videoStream;
        cameraStream.onloadedmetadata = () => {
            cameraStream.play();
            cameraStream.style.transform = (currentFacingMode === 'user') ? 'scaleX(-1)' : 'scaleX(1)';
        };
    } catch (error) { 
        console.error("Gagal mengakses kamera:", error);
        // Munculkan layar error interaktif (Misi 2)
        if(errorOverlay) {
            errorOverlay.style.display = 'flex';
        } else {
            alert("Tolong izinkan akses kamera biar bisa berfoto ria.");
        }
    }
}

btnSwitchCamera.addEventListener('click', () => {
    currentFacingMode = (currentFacingMode === 'user') ? 'environment' : 'user';
    startCamera();
});

btnToggleFlash.addEventListener('click', () => {
    isFlashActive = !isFlashActive;
    if (isFlashActive) {
        btnToggleFlash.classList.add('active');
        btnToggleFlash.innerText = '💡 Flash: ON';
    } else {
        btnToggleFlash.classList.remove('active');
        btnToggleFlash.innerText = '💡 Flash: OFF';
    }
});

timerBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        timerBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        selectedTimer = parseInt(e.target.getAttribute('data-time'));
    });
});

filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        filterBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        selectedFilter = e.target.getAttribute('data-filter');
        cameraStream.style.filter = selectedFilter; 
    });
});

function renderThumbnails() {
    thumbnailContainer.innerHTML = '';
    capturedPhotos.forEach((photoUrl, index) => {
        const div = document.createElement('div');
        div.className = 'thumbnail-item';
        const img = document.createElement('img');
        img.src = photoUrl;
        const btnDel = document.createElement('button');
        btnDel.className = 'btn-delete-thumb';
        btnDel.innerHTML = '×';
        btnDel.onclick = (e) => { 
            e.stopPropagation();
            Haptic.tap();
            capturedPhotos.splice(index, 1); 
            renderThumbnails(); 
        };
        div.appendChild(img);
        div.appendChild(btnDel);
        thumbnailContainer.appendChild(div);
    });

    let nextPoseIndex = capturedPhotos.length;
    let prompt = posePrompts[nextPoseIndex % posePrompts.length];
    
    if (capturedPhotos.length >= currentSlots) {
        captureHelperText.innerText = `Sempurna! Semua slot terisi ✨ (${capturedPhotos.length}/${currentSlots})`;
        btnCapture.style.display = 'none';
        btnFinishCapture.style.display = 'block';
    } else {
        captureHelperText.innerText = `Pose ${nextPoseIndex + 1}: ${prompt} (${capturedPhotos.length}/${currentSlots})`;
        btnCapture.style.display = 'block';
        btnFinishCapture.style.display = 'none';
    }
}

async function triggerCapture() {
    if (isFlashActive) {
        const track = videoStream ? videoStream.getVideoTracks()[0] : null;
        let torchSuccess = false;

        if (currentFacingMode === 'environment' && track) {
            try {
                await track.applyConstraints({ advanced: [{ torch: true }] });
                torchSuccess = true;
                setTimeout(() => {
                    executeCapture();
                    track.applyConstraints({ advanced: [{ torch: false }] }).catch(e => {});
                }, 250);
            } catch (error) { torchSuccess = false; }
        }
        if (!torchSuccess) {
            flashOverlay.style.display = 'block';
            void flashOverlay.offsetWidth; 
            flashOverlay.style.opacity = '1';
            setTimeout(() => {
                executeCapture();
                flashOverlay.style.opacity = '0';
                setTimeout(() => { flashOverlay.style.display = 'none'; }, 200);
            }, 150);
        }
    } else {
        executeCapture();
    }
}

btnCapture.addEventListener('click', () => {
    if (capturedPhotos.length >= currentSlots || isCountingDown) return;
    if (selectedTimer > 0) {
        isCountingDown = true;
        btnCapture.disabled = true;
        let timeLeft = selectedTimer;
        countdownOverlay.style.display = 'flex';
        countdownOverlay.innerText = timeLeft;
        countdownOverlay.classList.remove('pop-anim');
        void countdownOverlay.offsetWidth; 
        countdownOverlay.classList.add('pop-anim');
        Haptic.tick(); 

        const interval = setInterval(() => {
            timeLeft--;
            if (timeLeft > 0) {
                countdownOverlay.innerText = timeLeft;
                countdownOverlay.classList.remove('pop-anim');
                void countdownOverlay.offsetWidth;
                countdownOverlay.classList.add('pop-anim');
                Haptic.tick(); 
            } else {
                clearInterval(interval);
                countdownOverlay.style.display = 'none';
                triggerCapture();
                isCountingDown = false;
                btnCapture.disabled = false;
            }
        }, 1000);
    } else {
        triggerCapture();
    }
});

function executeCapture() {
    Haptic.shutter(); 
    const tempCanvas = document.createElement('canvas');
    const targetW = 1920;
    const targetH = 1440; 
    tempCanvas.width = targetW;
    tempCanvas.height = targetH;
    const ctx = tempCanvas.getContext('2d');
    const vW = cameraStream.videoWidth || 1920;
    const vH = cameraStream.videoHeight || 1440;
    let srcW, srcH, srcX, srcY;
    const targetRatio = targetW / targetH; 
    const streamRatio = vW / vH;

    if (streamRatio > targetRatio) {
        srcH = vH; srcW = vH * targetRatio; srcX = (vW - srcW) / 2; srcY = 0;
    } else {
        srcW = vW; srcH = vW / targetRatio; srcX = 0; srcY = (vH - srcH) / 2;
    }

    ctx.save();
    if (currentFacingMode === 'user') { ctx.translate(targetW, 0); ctx.scale(-1, 1); }
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(cameraStream, srcX, srcY, srcW, srcH, 0, 0, targetW, targetH);
    ctx.restore();
    applyPixelFilter(ctx, targetW, targetH, selectedFilter);
    capturedPhotos.push(tempCanvas.toDataURL('image/jpeg', 0.95));
    renderThumbnails();
}

function applyPixelFilter(ctx, width, height, filterType) {
    if (!filterType || filterType === 'none') return;
    const imgData = ctx.getImageData(0, 0, width, height);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
        let r = d[i], g = d[i + 1], b = d[i + 2];
        if (filterType.includes('grayscale(100%)') && filterType.includes('contrast(150%)')) {
            let gray = 0.299 * r + 0.587 * g + 0.114 * b;
            gray = ((gray - 128) * 1.5) + 128; d[i] = d[i + 1] = d[i + 2] = Math.min(255, Math.max(0, gray * 0.85));
        } else if (filterType.includes('grayscale(100%)')) {
            d[i] = d[i + 1] = d[i + 2] = 0.299 * r + 0.587 * g + 0.114 * b;
        } else if (filterType.includes('sepia(100%)')) {
            d[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
            d[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
            d[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
        } else if (filterType.includes('sepia(40%)')) {
            let sr = (r * 0.393) + (g * 0.769) + (b * 0.189); let sg = (r * 0.349) + (g * 0.686) + (b * 0.168); let sb = (r * 0.272) + (g * 0.534) + (b * 0.131);
            r = r * 0.6 + sr * 0.4; g = g * 0.6 + sg * 0.4; b = b * 0.6 + sb * 0.4;
            d[i] = Math.min(255, Math.max(0, ((r - 128) * 1.2) + 128)); d[i + 1] = Math.min(255, Math.max(0, ((g - 128) * 1.2) + 128)); d[i + 2] = Math.min(255, Math.max(0, ((b - 128) * 1.2) + 128));
        } else if (filterType.includes('brightness(110%)')) {
            d[i] = Math.min(255, r * 1.1); d[i + 1] = Math.min(255, g * 1.1); d[i + 2] = Math.min(255, b * 1.1);
        } else if (filterType.includes('saturate(150%)')) {
            let gray = 0.299 * r + 0.587 * g + 0.114 * b;
            d[i] = Math.min(255, Math.max(0, gray + (r - gray) * 1.5)); d[i + 1] = Math.min(255, Math.max(0, gray + (g - gray) * 1.5)); d[i + 2] = Math.min(255, Math.max(0, gray + (b - gray) * 1.5));
        }
    }
    ctx.putImageData(imgData, 0, 0);
}

// ==========================================
// 4. EDITOR PRO (DIRECT TOUCH & SPOTLIGHT)
// ==========================================
let photoTransforms = [];
let activeEditIndex = 0;
let isDragging = false;
let startX, startY;
let initialPinchDistance = null;
let initialAngle = null;
let initialScale = 1;
let initialRotation = 0;

btnFinishCapture.addEventListener('click', async () => {
    sectionCamera.classList.remove('active');
    sectionAdjust.classList.add('active');
    if (videoStream) videoStream.getTracks().forEach(t => t.stop());

    const frameImg = new Image();
    frameImg.src = guestData.selectedFrame;
    await new Promise(r => frameImg.onload = r);
    
    finalCanvasWidth = frameImg.naturalWidth;
    finalCanvasHeight = frameImg.naturalHeight;
    
    const maxWorkspaceHeight = window.innerHeight * 0.45;
    const frameRatio = finalCanvasWidth / finalCanvasHeight;
    let workspaceW = maxWorkspaceHeight * frameRatio;
    let workspaceH = maxWorkspaceHeight;

    const containerW = document.querySelector('.adjust-workspace-container').clientWidth - 20;
    if (workspaceW > containerW) {
        workspaceW = containerW;
        workspaceH = containerW / frameRatio;
    }

    adjustWorkspace.style.width = `${workspaceW}px`;
    adjustWorkspace.style.height = `${workspaceH}px`;
    adjustFrameOverlay.src = guestData.selectedFrame;
    adjustPhotoLayers.innerHTML = '';
    adjustThumbnails.innerHTML = '';
    
    const slotHeight = workspaceH / currentSlots; 
    photoTransforms = []; 

    capturedPhotos.forEach((photoUrl, index) => {
        // Taktik 2: Elemen bisa diklik langsung di kanvas atas
        const slotDiv = document.createElement('div');
        slotDiv.style.position = 'absolute';
        slotDiv.style.top = `${index * slotHeight}px`;
        slotDiv.style.left = '0';
        slotDiv.style.width = '100%';
        slotDiv.style.height = `${slotHeight}px`;
        slotDiv.style.overflow = 'hidden';
        
        // Sensor sentuh untuk memilih foto langsung dari layar utama
        slotDiv.addEventListener('mousedown', () => { Haptic.tap(); setActiveEdit(index); });
        slotDiv.addEventListener('touchstart', () => { Haptic.tap(); setActiveEdit(index); }, {passive: true});

        photoTransforms.push({ x: 0, y: 0, scale: 1, rotation: 0, flipH: 1, flipV: 1 });

        const img = document.createElement('img');
        img.src = photoUrl; 
        img.className = 'adjust-photo-item';
        img.id = `edit-photo-${index}`;
        img.style.position = 'absolute';
        img.style.top = '50%';
        img.style.left = '50%';
        img.style.width = '100%'; 
        img.style.height = 'auto'; 
        img.style.transform = `translate(calc(-50% + 0px), calc(-50% + 0px)) rotate(0deg) scale(1, 1)`;
        // Taktik 1: Animasi transisi Spotlight (Lampu Sorot)
        img.style.transition = 'opacity 0.3s ease, filter 0.3s ease';
        
        slotDiv.appendChild(img);
        adjustPhotoLayers.appendChild(slotDiv);

        const thumb = document.createElement('div');
        thumb.className = `thumbnail-item ${index === 0 ? 'active-edit' : ''}`;
        thumb.innerHTML = `<img src="${photoUrl}">`;
        thumb.onclick = () => { Haptic.tap(); setActiveEdit(index); };
        adjustThumbnails.appendChild(thumb);
    });
    setActiveEdit(0); 
});

// LOGIKA UX: SPOTLIGHT (LAMPU SOROT) & ACTIVE BOX
function setActiveEdit(index) {
    activeEditIndex = index;
    // 1. Kotak Thumbnail Menyala
    document.querySelectorAll('#adjustThumbnails .thumbnail-item').forEach((el, i) => { 
        el.classList.toggle('active-edit', i === index); 
    });
    // 2. Spotlight Kanvas Utama (Meredupkan yang tidak diedit)
    document.querySelectorAll('.adjust-photo-item').forEach((img, i) => { 
        img.parentElement.style.zIndex = i === index ? '5' : '1'; 
        img.style.opacity = i === index ? '1' : '0.4'; // Foto lain meredup 40%
        img.style.filter = i === index ? 'none' : 'grayscale(30%)'; // Foto lain agak pucat
    });
}

function updateTransformUI() {
    const tr = photoTransforms[activeEditIndex];
    const imgEl = document.getElementById(`edit-photo-${activeEditIndex}`);
    imgEl.style.transform = `translate(calc(-50% + ${tr.x}px), calc(-50% + ${tr.y}px)) rotate(${tr.rotation}deg) scale(${tr.scale * tr.flipH}, ${tr.scale * tr.flipV})`;
}

document.getElementById('btnFlipH').addEventListener('click', () => { photoTransforms[activeEditIndex].flipH *= -1; updateTransformUI(); });
document.getElementById('btnFlipV').addEventListener('click', () => { photoTransforms[activeEditIndex].flipV *= -1; updateTransformUI(); });

function getPinchDistance(touches) { return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY); }
function getPinchAngle(touches) { return Math.atan2(touches[1].clientY - touches[0].clientY, touches[1].clientX - touches[0].clientX) * (180 / Math.PI); }

function onPointerDown(e) {
    if (e.touches && e.touches.length === 2) {
        initialPinchDistance = getPinchDistance(e.touches);
        initialAngle = getPinchAngle(e.touches);
        initialScale = photoTransforms[activeEditIndex].scale;
        initialRotation = photoTransforms[activeEditIndex].rotation;
        isDragging = false;
    } else {
        isDragging = true;
        startX = e.clientX || (e.touches && e.touches[0].clientX);
        startY = e.clientY || (e.touches && e.touches[0].clientY);
    }
    adjustFrameOverlay.style.opacity = '0.3'; 
}

function onPointerMove(e) {
    if (e.touches && e.touches.length === 2) {
        e.preventDefault();
        const currentDistance = getPinchDistance(e.touches);
        if (initialPinchDistance) {
            const deltaScale = currentDistance / initialPinchDistance;
            photoTransforms[activeEditIndex].scale = Math.max(0.3, Math.min(initialScale * deltaScale, 3)); 
        }
        const currentAngle = getPinchAngle(e.touches);
        if (initialAngle !== null) {
            let deltaAngle = currentAngle - initialAngle;
            if (deltaAngle > 180) deltaAngle -= 360; if (deltaAngle < -180) deltaAngle += 360;
            photoTransforms[activeEditIndex].rotation = initialRotation + deltaAngle;
        }
        updateTransformUI();
    } else if (isDragging) {
        e.preventDefault();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        photoTransforms[activeEditIndex].x += (clientX - startX);
        photoTransforms[activeEditIndex].y += (clientY - startY);
        startX = clientX; startY = clientY;
        updateTransformUI();
    }
}

function onPointerUp(e) { 
    isDragging = false; initialPinchDistance = null; initialAngle = null;
    if (!e.touches || e.touches.length === 0) adjustFrameOverlay.style.opacity = '1'; 
}

adjustWorkspace.addEventListener('mousedown', onPointerDown); adjustWorkspace.addEventListener('mousemove', onPointerMove); window.addEventListener('mouseup', onPointerUp);
adjustWorkspace.addEventListener('touchstart', onPointerDown, {passive: false}); adjustWorkspace.addEventListener('touchmove', onPointerMove, {passive: false});
window.addEventListener('touchend', onPointerUp); window.addEventListener('touchcancel', onPointerUp);

btnBackToCamera.addEventListener('click', () => {
    sectionAdjust.classList.remove('active');
    sectionCamera.classList.add('active');
    capturedPhotos = []; 
    renderThumbnails();
    startCamera(); 
});

// ==========================================
// 5. RENDER FOTO (HD 90%)
// ==========================================
btnConfirmAdjust.addEventListener('click', async () => {
    const originalText = btnConfirmAdjust.innerText;
    btnConfirmAdjust.innerText = "Membungkus Foto HD...";
    btnConfirmAdjust.disabled = true;
    
    const ctx = photoCanvas.getContext('2d');
    photoCanvas.width = finalCanvasWidth;
    photoCanvas.height = finalCanvasHeight; 
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    
    const workspaceW = parseFloat(adjustWorkspace.style.width);
    const scaleRatio = photoCanvas.width / workspaceW;

    for (let i = 0; i < capturedPhotos.length; i++) {
        const img = new Image();
        img.src = capturedPhotos[i];
        await new Promise(r => img.onload = r);
        
        const tr = photoTransforms[i];
        const origW = photoCanvas.width; 
        const origH = origW / (img.naturalWidth / img.naturalHeight); 
        const slotY = i * (photoCanvas.height / currentSlots);
        const slotH = photoCanvas.height / currentSlots;
        
        const globalCenterX = (workspaceW / 2 + tr.x) * scaleRatio;
        const globalCenterY = slotY + (slotH / scaleRatio / 2 + tr.y) * scaleRatio;

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, slotY, photoCanvas.width, slotH);
        ctx.clip(); 
        ctx.translate(globalCenterX, globalCenterY);
        ctx.rotate(tr.rotation * Math.PI / 180);
        ctx.scale(tr.scale * tr.flipH, tr.scale * tr.flipV);
        ctx.drawImage(img, -origW / 2, -origH / 2, origW, origH);
        ctx.restore();
    }

    if (guestData.selectedFrame) {
        const frameImg = new Image();
        frameImg.crossOrigin = "Anonymous";
        frameImg.src = guestData.selectedFrame;
        await new Promise(r => frameImg.onload = r);
        ctx.drawImage(frameImg, 0, 0, photoCanvas.width, photoCanvas.height);
    }

    guestData.photoBase64 = photoCanvas.toDataURL('image/jpeg', 1.0);
    const uploadBase64 = photoCanvas.toDataURL('image/jpeg', 0.9); 
    
    finalResult.src = guestData.photoBase64; 
    btnDownload.href = guestData.photoBase64;
    
    btnConfirmAdjust.innerText = originalText;
    btnConfirmAdjust.disabled = false;
    
    sectionAdjust.classList.remove('active');
    sectionDone.classList.add('active'); 
    
    generateGIF();
    generateQRCode(uploadBase64);
});

// ==========================================
// 6. GENERATOR QR CODE DENGAN DYNAMIC BASE URL
// ==========================================
async function generateQRCode(compressedBase64) {
    qrLoading.style.display = 'block';
    qrContainer.style.display = 'none';
    qrHelperText.style.display = 'none';

    try {
        const pureBase64 = compressedBase64.split(',')[1];
        const formData = new FormData();
        formData.append('image', pureBase64);

        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            const imgUrl = result.data.display_url; 
            const safeBase64Data = encodeURIComponent(btoa(imgUrl));
            // Gunakan DYNAMIC_BASE_URL agar QR Code cocok dengan domain baru
            const viewerUrl = `${DYNAMIC_BASE_URL}view.html?data=${safeBase64Data}`; 
            
            const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(viewerUrl)}`;
            qrCodeImg.src = qrApiUrl;
            
            qrCodeImg.onload = () => {
                Haptic.success(); 
                qrLoading.style.display = 'none';
                qrContainer.style.display = 'block';
                qrHelperText.style.display = 'block';
            };
        } else {
            throw new Error(result.error?.message || "ImgBB menolak unggahan.");
        }
    } catch (error) {
        Haptic.error(); 
        console.error("QR Code Error Detail:", error);
        qrLoading.innerHTML = `⚠️ Gagal Membuat QR:<br><span style="font-size: 0.75rem; color: #ff5555;">${error.message}</span><br><br>Gunakan tombol Download Langsung.`;
    }
}

// ==========================================
// 7. GENERATOR GIF (LOKAL)
// ==========================================
async function generateGIF() {
    let gifFrames = [];
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 450;
    const ctx = canvas.getContext('2d');

    const logoImg = new Image();
    logoImg.src = 'assets/images/logo-chorum.png';
    await new Promise(r => { logoImg.onload = r; logoImg.onerror = r; });

    for (let i = 0; i < capturedPhotos.length; i++) {
        const img = new Image();
        img.src = capturedPhotos[i];
        await new Promise(r => img.onload = r);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        if (logoImg.naturalWidth > 0) {
            const logoW = 100;
            const logoH = logoW * (logoImg.naturalHeight / logoImg.naturalWidth);
            ctx.drawImage(logoImg, canvas.width - logoW - 15, canvas.height - logoH - 15, logoW, logoH);
        }
        gifFrames.push(canvas.toDataURL('image/jpeg', 0.7));
    }

    gifshot.createGIF({
        images: gifFrames, gifWidth: canvas.width, gifHeight: canvas.height, interval: 0.5, numFrames: gifFrames.length
    }, function (obj) {
        if (!obj.error) {
            const gifUrl = obj.image;
            document.getElementById('finalGif').src = gifUrl;
            document.getElementById('btnDownloadGif').href = gifUrl;
            document.getElementById('finalGif').style.display = 'block';
            document.getElementById('btnDownloadGif').style.display = 'block';
            document.getElementById('gifLoading').style.display = 'none';
        }
    });
}

// TABS LOGIC
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.getAttribute('data-target')).classList.add('active');
    });
});