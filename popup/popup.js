document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const saveBtn = document.getElementById('saveBtn');
  const statusDiv = document.getElementById('status');

  // Load existing key
  chrome.storage.local.get(['groqApiKey'], (result) => {
    if (result.groqApiKey) {
      apiKeyInput.value = result.groqApiKey;
    }
  });

  // Save new key
  saveBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    
    if (!key) {
      showStatus('Please enter an API key', 'error');
      return;
    }

    if (!key.startsWith('gsk_')) {
      showStatus('Invalid Groq API key format', 'error');
      return;
    }

    chrome.storage.local.set({ groqApiKey: key }, () => {
      showStatus('API key saved successfully!', 'success');
      setTimeout(() => {
        statusDiv.innerText = '';
        statusDiv.className = 'status';
      }, 3000);
    });
  });

  function showStatus(message, type) {
    statusDiv.innerText = message;
    statusDiv.className = `status ${type}`;
  }
});
