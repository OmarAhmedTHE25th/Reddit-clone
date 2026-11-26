import { Router, Request, Response } from 'express';

const router = Router();

interface SummarizeRequestBody {
  title?: string;
  content?: string;
  text?: string;
}

router.post('/summarize-post', async (req: Request, res: Response) => {
  try {
    const { title = '', content = '', text = '' } = req.body as SummarizeRequestBody;
    const postBody = (content || text).trim();
    const postTitle = title.trim();

    if (!postTitle && !postBody) {
      return res.status(400).json({
        error: 'Post title or content is required for summarization.',
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured in server/.env',
      });
    }

    const prompt = `You are a concise assistant for a Reddit-style discussion platform.
Summarize the following post clearly and objectively in the same language as the post (Arabic or English).
Keep it brief: a 1-2 sentence overview followed by up to 4 short bullet points of key takeaways. Do not add external facts.

Title: ${postTitle || 'Untitled'}
Content: ${postBody}`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      return res.status(502).json({
        error: 'Failed to generate summary from AI service.',
      });
    }

    const data = (await geminiResponse.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const summary =
      data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || '')
        .join('')
        .trim() || '';

    if (!summary) {
      return res.status(502).json({
        error: 'AI returned an empty summary.',
      });
    }

    return res.status(200).json({
      summary,
    });
  } catch (error) {
    console.error('Error in /api/ai/summarize-post:', error);
    return res.status(500).json({
      error: 'Internal server error while summarizing post.',
    });
  }
});

export default router;