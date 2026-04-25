// 1. Initialize Supabase
const supabaseUrl = "https://eerlvgxgmfgzabfhvmfl.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlcmx2Z3hnbWZnemFiZmh2bWZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2Njk2NjIsImV4cCI6MjA5MTI0NTY2Mn0.jkOfZ3cbNHsPbmtdld9HbcmwtxRqDFFMtWBXBB0EuBk";

// FIX: Renamed from 'supabase' to 'supabaseClient' to avoid the global collision
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// 2. DOM Elements
const imageInput = document.getElementById("imageInput");
const promptInput = document.getElementById("promptInput");
const generateBtn = document.getElementById("generateBtn");
const loadingState = document.getElementById("loadingState");
const resultImage = document.getElementById("resultImage");
const downloadBtn = document.getElementById("downloadBtn");
const fileNameDisplay = document.getElementById("fileNameDisplay"); // NEW: For custom file UI

const customModal = document.getElementById("customModal");
const modalMessage = document.getElementById("modalMessage");
const closeModalBtn = document.getElementById("closeModalBtn");

// New elements for the Bespoke Loader
const progressFill = document.getElementById("progressFill");
const loadingStatus = document.getElementById("loadingStatus");
const loadingTimer = document.getElementById("loadingTimer");

// --- Theme Toggle Logic ---
const themeToggle = document.getElementById("themeToggle");

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light-mode");

  if (document.body.classList.contains("light-mode")) {
    themeToggle.textContent = "[ THEME : LIGHT ]";
  } else {
    themeToggle.textContent = "[ THEME : DARK ]";
  }
});

// --- Custom File Upload UI Handler ---
imageInput.addEventListener("change", (e) => {
  if (e.target.files && e.target.files.length > 0) {
    // Show the actual file name instead of "NO ASSET DETECTED"
    fileNameDisplay.textContent = `> ${e.target.files[0].name}`;
    fileNameDisplay.style.color = "var(--text-primary)";
  } else {
    fileNameDisplay.textContent = "NO ASSET DETECTED";
  }
});

// --- Custom System Exception Modal Logic ---
const showSystemAlert = (message) => {
  modalMessage.textContent = `> ERR: ${message}`;
  customModal.style.display = "flex";
};

closeModalBtn.addEventListener("click", () => {
  customModal.style.display = "none";
});

/**
 * DOWNLOAD HANDLER
 * Fetches the image as a blob to bypass CORS and triggers a local download.
 */
downloadBtn.addEventListener("click", async () => {
  const imageUrl = resultImage.src;
  if (!imageUrl) return;

  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    // Named with a unique timestamp for the user
    a.download = `LUKUL_ASSET_${Date.now()}.png`;

    document.body.appendChild(a);
    a.click();

    // Cleanup
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error("Download failed:", error);
    showSystemAlert(
      "Failed to download image. Try right-clicking and 'Save Image As'.",
    );
  }
});

/**
 * BESPOKE SLOW SCROLL
 * Navigates the viewport to the result section with a smooth,
 * high-end transition to ensure user focus.
 */
const slowScrollTo = (targetId) => {
  const element = document.querySelector(targetId);
  if (element) {
    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
};

// 3. The Core Execution Pipeline

/**
 * BESPOKE POLLING ENGINE
 * Communicates with the Edge Router to check GPU status without triggering timeouts.
 */
async function pollFalQueue(actionType, modelPath, payload) {
  // 1. Submit the job
  const startReq = await supabaseClient.functions.invoke("generate-ad", {
    body: { action: actionType, ...payload }
  });

  if (startReq.error) throw new Error(startReq.error.message);
  if (!startReq.data.success) throw new Error(startReq.data.error);

  const reqId = startReq.data.requestId;

  // 2. Poll every 2 seconds
  while (true) {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const checkReq = await supabaseClient.functions.invoke("generate-ad", {
      body: { action: 'check_status', requestId: reqId, model: modelPath }
    });

    if (checkReq.error) throw new Error(checkReq.error.message);
    if (!checkReq.data.success) throw new Error(checkReq.data.error);

    if (checkReq.data.status === 'COMPLETED') {
      return checkReq.data.data; // Returns the payload containing image URLs
    } else if (checkReq.data.status === 'FAILED') {
      throw new Error("GPU_INFERENCE_FAILED");
    }
    // If IN_PROGRESS or IN_QUEUE, the loop continues natively
  }
}

generateBtn.addEventListener("click", async () => {
  const file = imageInput.files[0];
  const prompt = promptInput.value;

  if (!file) {
    showSystemAlert("MISSING_TARGET_ASSET. Please upload a PNG/JPEG.");
    return;
  }
  if (!prompt) {
    showSystemAlert("MISSING_STAGING_DIRECTIVE. Please enter environment parameters.");
    return;
  }

  // 1. Lock UI & Reset Visuals
  generateBtn.disabled = true;
  resultImage.style.display = "none";
  resultImage.removeAttribute("src");
  slowScrollTo(".result-section");

  // 2. Initialize the Bespoke Loader
  loadingState.style.display = "flex";
  progressFill.style.width = "0%";
  progressFill.style.transition = "none";
  void progressFill.offsetWidth; // Reflow

  // 3. The Timer (Independent from UI steps)
  let seconds = 0;
  const timerInterval = setInterval(() => {
    seconds++;
    loadingTimer.textContent = `00:${seconds.toString().padStart(2, "0")}`;
  }, 1000);

  try {
    // STEP A: CLOUD UPLINK
    loadingStatus.textContent = "> UPLOADING ASSET TO STORAGE CLUSTER...";
    progressFill.style.transition = "width 2s ease";
    progressFill.style.width = "10%";

    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const { error: uploadError } = await supabaseClient.storage.from("foxelli-assets").upload(filePath, file);
    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: publicUrlData } = supabaseClient.storage.from("foxelli-assets").getPublicUrl(filePath);
    const publicImageUrl = publicUrlData.publicUrl;

    // STEP B: IDEOGRAM INFERENCE (Replaces the blind 35s transition)
    loadingStatus.textContent = "> EXECUTING IDEOGRAM V3 DIFFUSION... (0/2)";
    progressFill.style.transition = "width 30s cubic-bezier(0.1, 0.7, 0.1, 1)";
    progressFill.style.width = "50%"; // Slow crawl while generating

    const bgData = await pollFalQueue('start_generation', 'fal-ai/ideogram/v3/replace-background', {
      imageUrl: publicImageUrl,
      prompt: prompt
    });
    const bgUrl = bgData.images[0].url;

    // STEP C: AURA-SR UPSCALE
    loadingStatus.textContent = "> EXECUTING AURA-SR 4K UPSCALE... (1/2)";
    progressFill.style.transition = "width 25s cubic-bezier(0.1, 0.7, 0.1, 1)";
    progressFill.style.width = "85%"; // Slow crawl while upscaling

    const upscaleData = await pollFalQueue('start_upscale', 'fal-ai/aura-sr', {
      imageUrl: bgUrl
    });
    const finalImageUrl = upscaleData.image.url;

    // STEP D: AUDIT & FINALIZE
    loadingStatus.textContent = "> SECURING AUDIT LOG...";
    progressFill.style.transition = "width 1s ease";
    progressFill.style.width = "95%";

    await supabaseClient.functions.invoke("generate-ad", {
      body: {
        action: 'save_audit',
        originalUrl: publicImageUrl,
        finalUrl: finalImageUrl,
        prompt: prompt
      }
    });

    // STEP E: RENDER
    loadingStatus.textContent = "> PIPELINE COMPLETE. DECODING ASSET...";
    progressFill.style.transition = "width 0.5s ease-out";
    progressFill.style.width = "100%";

    await new Promise((resolve) => {
      const preloader = new Image();
      preloader.onload = () => {
        resultImage.src = finalImageUrl;
        resultImage.style.display = "block";
        downloadBtn.style.display = "block";
        slowScrollTo(".result-section");
        resolve();
      };
      preloader.onerror = () => {
        resultImage.src = finalImageUrl;
        resultImage.style.display = "block";
        downloadBtn.style.display = "block";
        slowScrollTo(".result-section");
        resolve();
      };
      preloader.src = finalImageUrl;
    });

  } catch (error) {
    console.error("Pipeline Error:", error);
    showSystemAlert(error.message);
  } finally {
    clearInterval(timerInterval);
    setTimeout(() => {
      loadingState.style.display = "none";
      generateBtn.disabled = false;
    }, 800);
  }
});
