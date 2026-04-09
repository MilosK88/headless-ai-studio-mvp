# LuKul Asset Governance Engine (MVP)

A headless, multi-step AI inference pipeline built to automate brand-consistent product photography for enterprise marketing teams.

This implementation utilizes a custom Serverless Edge Function compiler to silently enforce camera, lighting, and environmental rules against user prompts. By abstracting the prompt engineering away from the end-user, this architecture reduces a 40-minute manual compositing workflow into a 15-second, single-click deployment while strictly maintaining brand aesthetic governance.

## 🏗️ The Architecture

This repository operates as a monorepo, separating the client interface from the secure inference logic and database operations.

- **`/frontend` (The Client):** A brutalist, bespoke terminal UI built in Vanilla JavaScript, HTML, and CSS. It features dynamic theme inversion (Dark/Blueprint) and handles secure payload construction without exposing API keys to the browser.
- **`/supabase` (The Engine):** Contains the Deno-based Edge Functions and database configurations.

## ⚙️ The Inference Pipeline

The core value of this engine lies in the `generate-ad` Edge Function, which executes a multi-step, governed pipeline:

1.  **Prompt Compilation:** The backend intercepts the user's simple staging request (e.g., "sitting on a wooden table") and concatenates it with a hidden, immutable Master Prompt to enforce the brand aesthetic (e.g., "50mm lens, studio lighting, 8k resolution").
2.  **Inference Step 1 (Background Replacement):** Pings the Fal.ai Ideogram v3 model to isolate the product and generate the compiled environment.
3.  **Inference Step 2 (Upscaling):** Immediately pipes the output from Step 1 into Aura SR to enhance micro-textures and deliver a 4K, print-ready asset.
4.  **Audit Logging:** Initializes a privileged Service Role connection to Postgres to persist the original user input, the target asset, and the generated URL into a `generated_ads` table for analytics and oversight.

## 🛠️ Tech Stack

- **Frontend:** Vanilla JS, HTML5, CSS3 (CSS Variables for dynamic theming)
- **Backend:** Supabase Edge Functions (Deno / TypeScript)
- **Database:** PostgreSQL (with Row-Level Security for public bucket uploads)
- **AI Infrastructure:** Fal.ai Serverless GPUs
