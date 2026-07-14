/**
 * [INPUT]: Reads IMAGE_PROVIDER_BASE_URL, IMAGE_PROVIDER_API_KEY, optional IMAGE_PROVIDER_MODEL, and a mode argument
 * [OUTPUT]: Reports whether an OpenAI-compatible gateway exposes models, Images API generation, or chat-completions routing
 * [POS]: Standalone provider diagnostic; it does not alter Ziwei Chat runtime model settings
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

const mode = process.argv[2] ?? "models";
const baseUrl = process.env.IMAGE_PROVIDER_BASE_URL?.replace(/\/$/, "");
const apiKey = process.env.IMAGE_PROVIDER_API_KEY;
const model = process.env.IMAGE_PROVIDER_MODEL ?? "gpt-image-2";

if (!baseUrl || !apiKey) {
  console.error("Set IMAGE_PROVIDER_BASE_URL and IMAGE_PROVIDER_API_KEY before running this script.");
  process.exit(1);
}

const request = async (path, body) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let payload = null;

  try {
    payload = JSON.parse(text);
  } catch {
    payload = text.slice(0, 500);
  }

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${JSON.stringify(payload).slice(0, 500)}`);
  }

  return payload;
};

try {
  if (mode === "models") {
    const payload = await request("/models");
    const ids = Array.isArray(payload.data) ? payload.data.map((item) => item.id) : [];
    console.log(JSON.stringify({ mode, modelListed: ids.includes(model), imageModels: ids.filter((id) => /image|dall/i.test(id)) }));
  } else if (mode === "images") {
    const payload = await request("/images/generations", {
      model,
      prompt: "A single black five-point star centered on a plain white square. No text.",
      size: "1024x1024",
      quality: "low",
      n: 1,
      output_format: "png",
    });
    const image = payload.data?.[0] ?? {};
    console.log(JSON.stringify({ mode, model: payload.model ?? model, imageUrlReturned: Boolean(image.url), imageBytesReturned: Boolean(image.b64_json) }));
  } else if (mode === "chat") {
    const payload = await request("/chat/completions", {
      model,
      messages: [{ role: "user", content: "Generate a simple black five-point star on a white background." }],
    });
    const content = payload.choices?.[0]?.message?.content ?? "";
    console.log(JSON.stringify({ mode, model: payload.model ?? model, contentPreview: content.slice(0, 300) }));
  } else {
    throw new Error("Mode must be one of: models, images, chat.");
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
