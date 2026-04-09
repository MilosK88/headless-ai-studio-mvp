import os
import asyncio
import fal_client
from dotenv import load_dotenv

load_dotenv()

if not os.environ.get("FAL_KEY"):
    raise ValueError("CRITICAL FAILURE: FAL_KEY is missing from the environment variables.")

async def generate_product_ad(local_image_path: str, text_prompt: str) -> str:
    """
    Executes a specialized Background Replacement pipeline.
    This locks the foreground pixels of the product and only runs the diffusion
    model on the background space, ensuring pixel-perfect preservation.
    """
    if not os.path.exists(local_image_path):
        raise FileNotFoundError(f"Cannot find the image file: {local_image_path}")

    print(f"Uploading {local_image_path} to secure temporary storage...")
    
    try:
        with open(local_image_path, "rb") as f:
            uploaded_image_url = await fal_client.upload_async(
                f.read(),
                content_type="image/png",
                file_name="product.png"
            )
            
        print(f"Upload complete. Temporary URL obtained.")
        
        print("Initiating AI Background Replacement pipeline...")
        
        # Calling the dedicated endpoint for masked background replacement
        result = await fal_client.subscribe_async(
            "fal-ai/ideogram/v3/replace-background",
            arguments={
                "image_url": uploaded_image_url,
                "prompt": text_prompt
            }
        )
        
        if result and "images" in result and len(result["images"]) > 0:
            return result["images"][0]["url"]
        else:
            raise RuntimeError("API returned an unexpected schema structure.")
            
    except Exception as e:
        print(f"Pipeline execution halted. Trace: {str(e)}")
        return None

async def main():
    LOCAL_FILE = "product.png"
    
    # The prompt explicitly describes the cap to match the locked foreground data
    PROMPT = "A high-end commercial product shot of a baseball cap sitting on a sleek wooden table in a brightly lit, modern studio. Cinematic lighting, 8k resolution, ultra-photorealistic e-commerce staging."
    
    print("--- FOXELLI AI AD STUDIO: STARTING MVP SPRINT ---")
    
    output_url = await generate_product_ad(LOCAL_FILE, PROMPT)
    
    if output_url:
        print("\nPIPELINE SUCCESS. Output Image URL:")
        print(output_url)
    else:
        print("\nPIPELINE FAILED.")

if __name__ == "__main__":
    asyncio.run(main())