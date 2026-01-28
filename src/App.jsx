import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, Trash2, Download, Settings as SettingsIcon } from 'lucide-react';
import './App.css';

const BACKEND_URL = 'https://chat-backend-oewp.onrender.com';

export default function ChatApp() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiInput, setShowApiInput] = useState(true);
  const [streamingMessage, setStreamingMessage] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const savedMessages = localStorage.getItem('chatMessages');
    const savedApiKey = localStorage.getItem('groqApiKey');
    
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }
    
    if (savedApiKey) {
      setApiKey(savedApiKey);
      setShowApiInput(false);
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chatMessages', JSON.stringify(messages));
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  const renderMarkdown = (text) => {
    let html = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre class="code-block"><code class="language-${lang || 'text'}">${escapeHtml(code.trim())}</code></pre>`;
    });

    html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/\n/g, '<br>');

    return html;
  };

  const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !apiKey) return;

    const userMessage = { role: 'user', content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);
    setStreamingMessage('');

    try {
      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: apiKey,
          messages: updatedMessages,
          stream: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Server error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            
            if (data === '[DONE]') continue;
            if (!data) continue;

            try {
              const parsed = JSON.parse(data);
              
              // Groq/OpenAI format
              if (parsed.choices && parsed.choices[0]?.delta?.content) {
                const text = parsed.choices[0].delta.content;
                fullResponse += text;
                setStreamingMessage(fullResponse);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      const assistantMessage = {
        role: 'assistant',
        content: fullResponse
      };

      setMessages([...updatedMessages, assistantMessage]);
      setStreamingMessage('');
    } catch (error) {
      console.error('Error:', error);
      let errorMsg = error.message;
      
      if (error.message.includes('Failed to fetch')) {
        errorMsg = `Cannot connect to backend server. Make sure it's running at ${BACKEND_URL}`;
      }
        
      setMessages([...updatedMessages, {
        role: 'assistant',
        content: `❌ Error: ${errorMsg}\n\n**Troubleshooting:**\n- Start the backend: \`npm start\` in backend folder\n- Check your Groq API key is valid\n- Visit https://console.groq.com/ to verify your account`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveApiKey = (e) => {
    e.preventDefault();
    if (apiKey.trim()) {
      localStorage.setItem('groqApiKey', apiKey);
      setShowApiInput(false);
    }
  };

  const clearChat = () => {
    if (window.confirm('Clear all messages? This cannot be undone.')) {
      setMessages([]);
      localStorage.removeItem('chatMessages');
    }
  };

  const exportChat = () => {
    const chatText = messages.map(m => 
      `${m.role === 'user' ? 'You' : 'AI'}: ${m.content}`
    ).join('\n\n---\n\n');
    
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (showApiInput) {
    return (
      <div className="setup-container">
        <div className="setup-card">
          <div className="setup-header">
            <Sparkles className="setup-icon" />
            <h1 className="setup-title">AI Chat Assistant</h1>
          </div>
          <div style={{ 
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            textAlign: 'center',
            fontWeight: '600'
          }}>
            ✨ Using Groq - 100% FREE!
          </div>
          <p className="setup-description">
            Enter your FREE Groq API key to start chatting
          </p>
          <form onSubmit={saveApiKey} className="setup-form">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="gsk_..."
              className="setup-input"
              autoFocus
            />
            <button type="submit" className="setup-button">
              Start Chatting
            </button>
          </form>
          <div className="setup-footer">
            <p className="setup-link-text">
              Get your FREE API key from{' '}
              <a
                href="https://console.groq.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="setup-link"
              >
                console.groq.com
              </a>
            </p>
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: '8px',
              padding: '12px',
              marginTop: '16px'
            }}>
              <p style={{ fontSize: '0.875rem', color: '#166534', margin: 0 }}>
                🎉 <strong>Groq Benefits:</strong>
              </p>
              <ul style={{ fontSize: '0.75rem', color: '#166534', marginTop: '8px', paddingLeft: '20px' }}>
                <li>✅ Completely FREE forever</li>
                <li>⚡ Super fast responses</li>
                <li>🚀 Llama 3.3 70B model</li>
                <li>🎯 No credit card required</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <header className="chat-header">
        <div className="header-left">
          <Sparkles className="header-icon" />
          <h1 className="header-title">AI Chat Assistant</h1>
          <span style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: '600',
            marginLeft: '12px'
          }}>
            FREE
          </span>
        </div>
        <div className="header-actions">
          {messages.length > 0 && (
            <>
              <button onClick={exportChat} className="header-button" title="Export chat">
                <Download className="button-icon" />
              </button>
              <button onClick={clearChat} className="header-button delete-button" title="Clear chat">
                <Trash2 className="button-icon" />
              </button>
            </>
          )}
          <button onClick={() => setShowApiInput(true)} className="header-button settings-button" title="Settings">
            <SettingsIcon className="button-icon" />
          </button>
        </div>
      </header>

      <main className="messages-container">
        <div className="messages-inner">
          {messages.length === 0 && (
            <div className="welcome-screen">
              <div className="welcome-icon-wrapper">
                <Sparkles className="welcome-icon" />
              </div>
              <h2 className="welcome-title">Start a conversation</h2>
              <p className="welcome-subtitle">
                Powered by Groq's FREE Llama 3.3 70B
              </p>
              <div className="suggestions">
                <button className="suggestion" onClick={() => setInput("Explain quantum computing in simple terms")}>
                  ✨ Explain quantum computing
                </button>
                <button className="suggestion" onClick={() => setInput("Write a Python function to sort a list")}>
                  💻 Write some code
                </button>
                <button className="suggestion" onClick={() => setInput("Give me tips for learning React")}>
                  📚 Learning tips
                </button>
              </div>
            </div>
          )}
          
          {messages.map((message, index) => (
            <div key={index} className={`message-wrapper ${message.role === 'user' ? 'user-wrapper' : 'assistant-wrapper'}`}>
              <div className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}>
                {message.role === 'user' ? (
                  <p className="message-text">{message.content}</p>
                ) : (
                  <div className="message-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }} />
                )}
              </div>
            </div>
          ))}
          
          {streamingMessage && (
            <div className="message-wrapper assistant-wrapper">
              <div className="message assistant-message streaming">
                <div className="message-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(streamingMessage) }} />
                <span className="cursor"></span>
              </div>
            </div>
          )}
          
          {isLoading && !streamingMessage && (
            <div className="message-wrapper assistant-wrapper">
              <div className="message assistant-message loading">
                <Loader2 className="loading-spinner" />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="input-container">
        <form onSubmit={sendMessage} className="input-form">
          <div className="input-wrapper">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(e);
                }
              }}
              placeholder="Type your message... (Shift+Enter for new line)"
              className="input-field"
              rows="1"
            />
            <button type="submit" disabled={isLoading || !input.trim()} className="send-button">
              <Send className="send-icon" />
            </button>
          </div>
        </form>
      </footer>
    </div>
  );
}