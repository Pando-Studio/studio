/**
 * Audio/video transcription using OpenAI Whisper API.
 */

/**
 * Transcribe audio or video file using OpenAI Whisper API.
 * Supports: mp3, mp4, mpeg, mpga, m4a, wav, webm, ogg
 */
export async function transcribeAudio(
  fileBuffer: Buffer,
  filename: string,
  apiKey?: string
): Promise<string> {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OpenAI API key required for audio transcription');
  }

  const formData = new FormData();
  formData.append('file', new Blob([new Uint8Array(fileBuffer)]), filename);
  formData.append('model', 'whisper-1');
  formData.append('language', 'fr');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Whisper transcription failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.text || '';
}

/**
 * Describe an image using a vision model.
 */
export async function describeImage(
  fileBuffer: Buffer,
  filename: string,
  apiKey?: string
): Promise<string> {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OpenAI API key required for image description');
  }

  const base64 = fileBuffer.toString('base64');
  const mimeType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Decris cette image en detail en francais. Inclus le contenu textuel visible, les elements visuels, et le contexte general.',
            },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
          ],
        },
      ],
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Image description failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}
