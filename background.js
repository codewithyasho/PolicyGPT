// background.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SUMMARIZE_POLICIES') {
    handleSummarizeRequest(request.links).then(sendResponse);
    return true; // Indicates we will send a response asynchronously
  }
});

async function handleSummarizeRequest(links) {
  try {
    // 1. Get API Key
    const { groqApiKey } = await chrome.storage.local.get('groqApiKey');
    if (!groqApiKey) {
      return { success: false, error: 'Please set your Groq API Key in the extension popup.' };
    }

    // 2. Fetch all linked pages
    let combinedText = '';
    for (const link of links) {
      if (!link.url || link.url.startsWith('javascript')) continue;
      
      try {
        const response = await fetch(link.url);
        const html = await response.text();
        const extractedText = extractTextFromHtml(html);
        combinedText += `\n\n--- Policy: ${link.text} ---\n\n` + extractedText;
      } catch (err) {
        console.warn(`Failed to fetch policy page: ${link.url}`, err);
      }
    }

    if (!combinedText.trim()) {
       return { success: false, error: 'Could not extract any text from the identified policy links.' };
    }

    // Truncate to avoid exceeding token limits (Groq models usually handle up to 32k for Mixtral, let's keep it safe at ~15000 chars)
    if (combinedText.length > 20000) {
      combinedText = combinedText.substring(0, 20000) + '... [truncated]';
    }

    // 3. Call Groq API
    const summary = await callGroqAPI(groqApiKey, combinedText);
    return { success: true, summary };

  } catch (error) {
    console.error('Error during summarization:', error);
    return { success: false, error: error.message };
  }
}

function extractTextFromHtml(html) {
  // Very basic regex to extract body content and strip tags
  // Since we don't have DOMParser in MV3 service workers
  let text = html;
  
  // Extract body content if possible
  const bodyMatch = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) text = bodyMatch[1];
  
  // Remove script and style tags and their contents
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
  text = text.replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ');
  text = text.replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ');
  text = text.replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ');
  
  // Remove all HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  
  // Decode HTML entities (basic ones)
  text = text.replace(/&nbsp;/g, ' ')
             .replace(/&amp;/g, '&')
             .replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>')
             .replace(/&quot;/g, '"')
             .replace(/&#39;/g, "'");

  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

async function callGroqAPI(apiKey, text) {
  const systemPrompt = `You are an expert legal assistant. Summarize the following website policies (Terms & Conditions, Privacy, etc.). 
Your summary should be extremely concise, highlighting only the critical risks, user rights, data collection practices, and refund terms. 
Use simple, clear language that anyone can understand.
Format your response using Markdown with clear bullet points and bold text for emphasis.
If there are "red flags" (e.g., they sell data, non-refundable), put them at the top under a "🚩 Red Flags" section.`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant', // Fast and capable
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Here is the policy text:\n\n${text}` }
      ],
      temperature: 0.2,
      max_tokens: 1000
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Failed to call Groq API');
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
