import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { fal } from "npm:@fal-ai/client@1.9.5"

// 1. CORS Preflight Configuration
// Browsers mandate a preflight OPTIONS request before allowing POSTs across domains.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// UPDATED GOVERNANCE LAYER: Enforcing physical boundaries and structural integrity
const FOXELLI_MASTER_PROMPT = ". The product is professionally staged, respecting its physical material properties—maintaining structural integrity for rigid items and natural draping with realistic folds for fabrics. Ensure logical placement on surfaces with ambient occlusion shadows at contact points and no clipping or merging between the product and environment. Shot with a 50mm lens. High-end outdoor brand photography, cinematic lighting, ultra-photorealistic, 8k, razor-sharp focus on the product."

serve(async (req) => {
  // 2. Intercept and Approve CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 3. Extract Payload from Frontend
    // We expect the frontend to pass the uploaded image URL and the prompt.
    const { imageUrl, prompt } = await req.json()

    if (!imageUrl || !prompt) {
      throw new Error("Missing required payload parameters: imageUrl or prompt.")
    }

    console.log(`Initiating pipeline for: ${imageUrl}`)

    // 4. Compile the Governed Prompt
    const compiledPrompt = `${prompt}${FOXELLI_MASTER_PROMPT}`

    // 5. Execute AI Inference Step 1: Background Replacement via Fal
    // The @fal-ai/client automatically detects Deno.env.get("FAL_KEY")
    const bgResult = await fal.subscribe("fal-ai/ideogram/v3/replace-background", {
      input: {
        image_url: imageUrl,
        prompt: compiledPrompt
      }
    })

    // Extract the intermediate generated URL
    const bgReplacedUrl = bgResult.data.images[0].url
    console.log(`Step 1 Complete. Initiating Upscale for: ${bgReplacedUrl}`)

    // 6. Execute AI Inference Step 2: 4K Upscaling (Aura SR)
    const upscaleResult = await fal.subscribe("fal-ai/aura-sr", {
      input: {
        image_url: bgReplacedUrl
      }
    })

    // Extract the final print-ready URL
    const finalImageUrl = upscaleResult.data.image.url
    console.log("Step 2 Complete. Final Asset generated.")

    // 7. Initialize Privileged Database Connection
    const supabaseUrl = Deno.env.get('DB_URL') ?? ''
    const supabaseKey = Deno.env.get('DB_SERVICE_KEY') ?? ''
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey)

    // 8. Persist Audit Log
    // We log the original user input ('prompt') to keep analytics clean.
    const { error: dbError } = await supabaseAdmin.from('generated_ads').insert({
      original_image_url: imageUrl,
      generated_image_url: finalImageUrl,
      prompt: prompt 
    })

    if (dbError) {
      console.error("Database persistence failed:", dbError)
      // We log the error but do not fail the request; the user should still get their image.
    }

    // 9. Return Authorized Response
    return new Response(JSON.stringify({ success: true, url: finalImageUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error("Function execution error:", error.message)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})