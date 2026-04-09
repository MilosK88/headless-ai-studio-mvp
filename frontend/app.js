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

// 3. The Core Execution Pipeline
generateBtn.addEventListener("click", async () => {
  const file = imageInput.files[0];
  const prompt = promptInput.value;

  if (!file) {
    alert("Please upload an image first.");
    return;
  }
  if (!prompt) {
    alert("Please enter a staging prompt.");
    return;
  }

  // Lock the UI
  generateBtn.disabled = true;
  loadingState.style.display = "block";
  resultImage.style.display = "none";

  try {
    console.log("1. Uploading to Supabase Storage...");
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    // FIX: Using supabaseClient
    const { error: uploadError } = await supabaseClient.storage
      .from("foxelli-assets")
      .upload(filePath, file);

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    console.log("2. Retrieving Public URL...");
    // FIX: Using supabaseClient
    const { data: publicUrlData } = supabaseClient.storage
      .from("foxelli-assets")
      .getPublicUrl(filePath);

    const publicImageUrl = publicUrlData.publicUrl;

    console.log("3. Pinging Edge Function...", publicImageUrl);
    // FIX: Using supabaseClient
    const { data: edgeData, error: edgeError } =
      await supabaseClient.functions.invoke("generate-ad", {
        body: {
          imageUrl: publicImageUrl,
          prompt: prompt,
        },
      });

    if (edgeError)
      throw new Error(`Edge Function failed: ${edgeError.message}`);

    console.log("4. Pipeline Complete!");
    resultImage.src = edgeData.url;
    resultImage.style.display = "block";
  } catch (error) {
    console.error("Pipeline Error:", error);
    alert(error.message);
  } finally {
    // Unlock the UI
    generateBtn.disabled = false;
    loadingState.style.display = "none";
  }
});
