require('dotenv').config();

async function test() {
  const key = process.env.OPENROUTER_API_KEY;
  console.log('Key present:', !!key);
  console.log('Key starts with:', key ? key.substring(0, 15) + '...' : 'MISSING');

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5000',
        'X-Title': 'BrainBee Test',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-v3:free',
        max_tokens: 100,
        messages: [
          { role: 'system', content: 'Return only JSON arrays.' },
          { role: 'user', content: 'Return this exact JSON: [{"word":"apple"}]' }
        ]
      })
    });

    const data = await response.json();
    console.log('HTTP Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (data.choices?.[0]?.message?.content) {
      console.log('\n✅ SUCCESS! AI replied:', data.choices[0].message.content);
    } else {
      console.log('\n❌ No content in response. Error:', data.error || 'unknown');
    }
  } catch (err) {
    console.error('❌ Fetch error:', err.message);
  }
}

test();