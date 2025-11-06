// This ensures the script runs only after the full HTML document has been loaded.
document.addEventListener('DOMContentLoaded', (event) => {

    // --- Start of Logic Ported from your Node.js code ---

    // This is the exact System Instruction from your code
    const systemInstruction = `You are a DSA Instructor. Your only replies to the DSA related Data Structures and Algorithms questions.YOU have to solve query in simple way and along with the java code snippets and time and space complexity of each code provided.If asked about non DSA related questions, reply that you are specialized only in DSA topics.
Example: if user ask,How are you, you will reply:You are here only to get DSA related asnwers.`;

    // This is the history array from your code
    let history = [];

    // This is the exact trimHistory function from your code
    function trimHistory(maxTurns = 6) {
        const maxItems = maxTurns * 2;
        if (history.length > maxItems) {
            // Remove the oldest user/model pair
            history.splice(0, history.length - maxItems);
        }
    }

    // --- End of Ported Logic ---


    // --- Start of Web Application Logic ---
    
    const chatWindow = document.getElementById('chat-window');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const typingIndicator = document.getElementById('typing-indicator');

    // This is the browser-safe API key. Leave as ""
    // Canvas will automatically provide a key at runtime.
    const apiKey = "AIzaSyBo2bkgzfVOBCotBjx5iIDqI3eYqT72XgE";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    sendButton.addEventListener('click', handleSendMessage);
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    });

    // --- New: Event Delegation for Copy Buttons ---
    // We add one listener to the chat window.
    // This will catch clicks on any 'copy-code-btn' that gets added.
    chatWindow.addEventListener('click', (e) => {
        // Check if the clicked element has the 'copy-code-btn' class
        if (e.target.classList.contains('copy-code-btn')) {
            const button = e.target;
            
            // Find the parent <pre> tag, then find the <code> tag inside it
            const pre = button.closest('pre');
            const code = pre.querySelector('code');
            
            if (code) {
                const codeText = code.innerText;
                copyToClipboard(codeText);
                
                // Give user feedback
                button.innerText = 'Copied!';
                setTimeout(() => {
                    button.innerText = 'Copy';
                }, 2000); // Reset text after 2 seconds
            }
        }
    });

    // --- New: Helper function to copy text to clipboard ---
    // Using the instructed document.execCommand method for compatibility
    function copyToClipboard(text) {
        const textArea = document.createElement('textarea');
        
        // Hide the textarea from view
        textArea.style.position = 'fixed';
        textArea.style.top = '-9999px';
        textArea.style.left = '-9999px';
        textArea.style.width = '1px';
        textArea.style.height = '1px';
        textArea.style.opacity = '0';

        textArea.value = text;
        document.body.appendChild(textArea);
        
        textArea.select();
        textArea.setSelectionRange(0, 99999); // For mobile devices

        try {
            document.execCommand('copy');
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }

        document.body.removeChild(textArea);
    }


    function addMessageToUI(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}`;
        
        let contentHTML = '';

        if (sender === 'user') {
            messageDiv.classList.add('flex', 'justify-end');
            // Create a text node to safely insert user text
            const p = document.createElement('p');
            p.textContent = text;
            
            contentHTML = `
                <div class="bg-blue-600 text-white p-3 rounded-lg shadow-md max-w-xs sm:max-w-md" style="width: fit-content;">
                    ${p.outerHTML}
                </div>
            `;
        } else { // 'bot'
            // Use marked.js to render Markdown, especially for code blocks
            // This will automatically format ```java ... ``` blocks
            const renderedText = marked.parse(text);
            contentHTML = `
                <div class="bg-indigo-600 text-white p-3 rounded-lg shadow-md max-w-xs sm:max-w-md" style="width: fit-content;">
                    ${renderedText}
                </div>
            `;
        }
        
        messageDiv.innerHTML = contentHTML;
        chatWindow.appendChild(messageDiv);

        // --- New: Add copy buttons to code blocks ---
        if (sender === 'bot') {
            // Find all <pre> elements within the new message
            const preElements = messageDiv.querySelectorAll('pre');
            preElements.forEach(pre => {
                // Create the button
                const copyButton = document.createElement('button');
                copyButton.className = 'copy-code-btn';
                copyButton.innerText = 'Copy';
                
                // Add the button inside the <pre> tag
                pre.appendChild(copyButton);
            });
        }
        
        // Scroll to the bottom
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    async function handleSendMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        // Add user message to UI
        addMessageToUI('user', message);
        userInput.value = '';

        // Add user message to history, matching the REST API format
        history.push({ role: "user", parts: [{ text: message }] });
        
        // Trim history just like in your code
        trimHistory(6);

        // Show typing indicator
        typingIndicator.style.display = 'block';
        
        // Prepare payload for the REST API
        const payload = {
            contents: history,
            systemInstruction: {
                parts: [{ text: systemInstruction }]
            }
        };

        try {
            // Call the API with exponential backoff
            const botResponseText = await callGeminiWithBackoff(payload);

            // Add bot response to history
            history.push({ role: "model", parts: [{ text: botResponseText }] });

            // Add bot response to UI
            addMessageToUI('bot', botResponseText);

        } catch (error) {
            console.error("Error occurred while generating response:", error);
            addMessageToUI('bot', 'Sorry, I ran into an error. Please try again. ' + error.message);
        } finally {
            // Hide typing indicator
            typingIndicator.style.display = 'none';
        }
    }

    /**
     * Calls the Gemini API with exponential backoff for retries.
     */
    async function callGeminiWithBackoff(payload, retries = 5, delay = 1000) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    if (response.status === 429 || response.status >= 500) {
                        // Rate limit or server error, throw to retry
                        throw new Error(`API Error: ${response.status}`);
                    } else {
                        // Client error (e.g., 400), don't retry
                        const errorData = await response.json();
                        console.error("Client error:", errorData);
                        return `Error: ${errorData.error?.message || 'Bad request'}`;
                    }
                }

                const data = await response.json();
                
                if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts[0].text) {
                    return data.candidates[0].content.parts[0].text;
                } else if (data.candidates && data.candidates[0].finishReason === "SAFETY") {
                    return "I cannot respond to that as it violates safety policies.";
                } else {
                    console.warn("Unexpected response structure:", data);
                    return "I received an unusual response. Please try rephrasing.";
                }

            } catch (error) {
                if (i === retries - 1) {
                    // Last retry failed
                    throw error;
                }
                // Wait with exponential backoff + jitter
                const jitter = Math.random() * 500;
                await new Promise(res => setTimeout(res, delay + jitter));
                delay *= 2; // Exponentially increase delay
            }
        }
    }

}); // End of DOMContentLoaded