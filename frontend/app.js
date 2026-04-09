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
generateBtn.addEventListener("click", async () => {
  const file = imageInput.files[0];
  const prompt = promptInput.value;

  // REPLACED: Using the new pristine modal instead of browser alerts
  if (!file) {
    showSystemAlert("MISSING_TARGET_ASSET. Please upload a PNG/JPEG.");
    return;
  }
  if (!prompt) {
    showSystemAlert(
      "MISSING_STAGING_DIRECTIVE. Please enter environment parameters.",
    );
    return;
  }

  // 1. Lock UI & Reset Visuals
  generateBtn.disabled = true;
  resultImage.style.display = "none";

  // Trigger autoscroll to result area immediately
  slowScrollTo(".result-section");

  // 2. Initialize the Bespoke Loader
  loadingState.style.display = "flex";
  progressFill.style.width = "0%";
  progressFill.style.transition = "none"; // Reset instantly

  // Force a browser reflow so the transition reset takes effect
  void progressFill.offsetWidth;

  // RECALIBRATED: 35-second smooth fill to 95% to match observed server time
  progressFill.style.transition = "width 35s cubic-bezier(0.1, 0.7, 0.1, 1)";
  progressFill.style.width = "95%";

  // 3. The Telemetry Text Cycler (Expanded for 35s window)
  const statuses = [
    "> COMPILING PIXEL MATRICES...",
    "> ESTABLISHING CLOUD UPLINK...",
    "> ISOLATING TARGET ASSET...",
    "> ENFORCING BRAND GOVERNANCE...",
    "> ANALYZING LIGHTING VECTORS...",
    "> ENHANCING MICRO-TEXTURES...",
    "> FINALIZING 4K RENDER...",
  ];
  let statusIndex = 0;

  const statusInterval = setInterval(() => {
    loadingStatus.style.opacity = "0";
    setTimeout(() => {
      statusIndex = (statusIndex + 1) % statuses.length;
      loadingStatus.textContent = statuses[statusIndex];
      loadingStatus.style.opacity = "1";
    }, 300);
  }, 5000); // Changes text every 5 seconds to match the 35s pacing

  // 4. The Timer
  let seconds = 0;
  const timerInterval = setInterval(() => {
    seconds++;
    loadingTimer.textContent = `00:${seconds.toString().padStart(2, "0")}`;
  }, 1000);

  try {
    console.log("1. Uploading to Supabase Storage...");
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const { error: uploadError } = await supabaseClient.storage
      .from("foxelli-assets")
      .upload(filePath, file);

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    console.log("2. Retrieving Public URL...");
    const { data: publicUrlData } = supabaseClient.storage
      .from("foxelli-assets")
      .getPublicUrl(filePath);

    const publicImageUrl = publicUrlData.publicUrl;

    console.log("3. Pinging Edge Function...", publicImageUrl);
    const { data: edgeData, error: edgeError } =
      await supabaseClient.functions.invoke("generate-ad", {
        body: {
          imageUrl: publicImageUrl,
          prompt: prompt,
        },
      });

    if (edgeError)
      throw new Error(`Edge Function failed: ${edgeError.message}`);

    // ... existing code ...
    console.log("4. Pipeline Complete!");
    resultImage.src = edgeData.url;
    resultImage.style.display = "block";

    // NEW: Reveal the download button
    downloadBtn.style.display = "block";

    // Final scroll adjustment to center the generated asset
    slowScrollTo(".result-section");
  } catch (error) {
    console.error("Pipeline Error:", error);
    // REPLACED: Catch block now routes errors to the custom modal
    showSystemAlert(error.message);
  } finally {
    // Cleanup the bespoke loader
    clearInterval(statusInterval);
    clearInterval(timerInterval);

    // Snap progress to 100% on completion
    progressFill.style.transition = "width 0.5s ease-out";
    progressFill.style.width = "100%";

    setTimeout(() => {
      loadingState.style.display = "none";
      generateBtn.disabled = false;
    }, 500);
  }
});
