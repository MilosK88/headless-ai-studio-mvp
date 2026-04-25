import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { fal } from "npm:@fal-ai/client@1.9.5"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FOXELLI_MASTER_PROMPT = ". The product is professionally staged, respecting its physical material properties—maintaining structural integrity for rigid items and natural draping with realistic folds for fabrics. Ensure logical placement on surfaces with ambient occlusion shadows at contact points and no clipping or merging between the product and environment. Shot with a 50mm lens. High-end outdoor brand photography, cinematic lighting, ultra-photorealistic, 8k, razor-sharp focus on the product."

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { action } = body

    // ---------------------------------------------------------
    // ROUTE 1: Start Background Replacement (Ideogram)
    // ---------------------------------------------------------
    if (action === 'start_generation') {
      const { imageUrl, prompt } = body
      const compiledPrompt = `${prompt}${FOXELLI_MASTER_PROMPT}`
      
      // .submit() returns instantly with a request_id. It does NOT wait.
      const result = await fal.queue.submit("fal-ai/ideogram/v3/replace-background", {
        input: { image_url: imageUrl, prompt: compiledPrompt }
      })
      
      return new Response(JSON.stringify({ success: true, requestId: result.request_id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // ---------------------------------------------------------
    // ROUTE 2: Start 4K Upscale (Aura SR)
    // ---------------------------------------------------------
    if (action === 'start_upscale') {
      const { imageUrl } = body
      const result = await fal.queue.submit("fal-ai/aura-sr", {
        input: { image_url: imageUrl }
      })
      
      return new Response(JSON.stringify({ success: true, requestId: result.request_id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // ---------------------------------------------------------
    // ROUTE 3: Universal Status Poller
    // ---------------------------------------------------------
    if (action === 'check_status') {
      const { requestId, model } = body
      
      const statusCheck = await fal.queue.status(model, { requestId })
      
      // If the GPU is done, fetch the final image payload
      if (statusCheck.status === 'COMPLETED') {
        const payload = await fal.queue.result(model, { requestId })
        return new Response(JSON.stringify({ success: true, status: 'COMPLETED', data: payload.data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }
      
      // Otherwise, return the current queue state (IN_PROGRESS, IN_QUEUE)
      return new Response(JSON.stringify({ success: true, status: statusCheck.status }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // ---------------------------------------------------------
    // ROUTE 4: Privileged Database Audit
    // ---------------------------------------------------------
    if (action === 'save_audit') {
      const { originalUrl, finalUrl, prompt } = body
      const supabaseAdmin = createClient(Deno.env.get('DB_URL') ?? '', Deno.env.get('DB_SERVICE_KEY') ?? '')
      
      await supabaseAdmin.from('generated_ads').insert({
        original_image_url: originalUrl,
        generated_image_url: finalUrl,
        prompt: prompt 
      })
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    throw new Error("UNKNOWN_ROUTER_ACTION")

  } catch (error) {
    console.error("Function execution error:", error.message)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})