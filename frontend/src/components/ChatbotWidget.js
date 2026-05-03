import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import apiService from '../apiService';

const starterMessages = [
  {
    role: 'assistant',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    content:
      'Hi, I am PersonalBlogAI. I can show you how to use the platform, explain Markdown, and answer common questions about creating or managing posts.',
  },
];

const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(starterMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const conversationHistory = useMemo(
    () => messages.filter((message) => message.role !== 'system'),
    [messages]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const getTimestamp = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const sendMessage = useCallback(async (rawMessage) => {
    const trimmedMessage = rawMessage.trim();

    if (!trimmedMessage || loading) {
      return;
    }

    const userMessage = { role: 'user', content: trimmedMessage, time: getTimestamp() };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await apiService.post('/chat', {
        message: userMessage.content,
        history: conversationHistory,
      });

      setMessages((currentMessages) => [
        ...currentMessages,
        { role: 'assistant', content: response.data.reply, time: getTimestamp() },
      ]);
    } catch (error) {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: 'assistant',
          time: getTimestamp(),
          content: error.response?.data?.message || 'The chatbot could not answer right now.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [conversationHistory, loading, messages]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await sendMessage(input);
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = async (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      setInput(transcript);

      if (transcript.trim()) {
        await sendMessage(transcript);
      }
    };

    recognitionRef.current = recognition;
    setVoiceSupported(true);

    return () => {
      recognition.stop();
    };
  }, [sendMessage]);

  const handleClear = () => {
    setMessages([
      {
        role: 'assistant',
        time: getTimestamp(),
        content:
          'Hi, I am PersonalBlogAI. I can show you how to use the platform, explain Markdown, and answer common questions about creating or managing posts.',
      },
    ]);
  };

  const handleCopyLastReply = async () => {
    const lastAssistantMessage = [...messages].reverse().find((message) => message.role === 'assistant');
    if (!lastAssistantMessage) {
      return;
    }

    try {
      await navigator.clipboard.writeText(lastAssistantMessage.content);
    } catch {
      // ignore clipboard issues
    }
  };

  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      return;
    }

    recognitionRef.current.start();
  };

  const handleSpeakLastReply = () => {
    const lastAssistantMessage = [...messages].reverse().find((message) => message.role === 'assistant');

    if (!lastAssistantMessage || !window.speechSynthesis) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(lastAssistantMessage.content);
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className={`chatbot-shell ${isOpen ? 'open' : ''}`}>
      {isOpen && (
        <section className="chatbot-panel">
          <div className="chatbot-header">
            <div>
              <p className="eyebrow">AI Guide</p>
              <h3>PersonalBlogAI</h3>
              <p className="chatbot-subtitle">Platform help, Markdown tips, and quick answers</p>
            </div>
            <div className="chatbot-header-actions">
              <button type="button" className="chatbot-close secondary-button" onClick={handleClear}>
                Clear
              </button>
              <button type="button" className="chatbot-close secondary-button" onClick={() => setIsOpen(false)}>
                Close
              </button>
            </div>
          </div>

          <div className="chatbot-messages">
            {messages.map((message, index) => (
              <article className={`chat-message ${message.role}`} key={`${message.role}-${index}`}>
                <div className="chat-bubble">
                  <span>{message.content}</span>
                  {message.time && <small className="chat-time">{message.time}</small>}
                </div>
              </article>
            ))}
            {loading && (
              <article className="chat-message assistant">
                <div className="chat-bubble">
                  <span>Thinking...</span>
                </div>
              </article>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-suggestions">
            {['How do I create a post?', 'Explain Markdown headings', 'How do categories work?', 'How do I edit a post?'].map((prompt) => (
              <button key={prompt} type="button" className="chatbot-suggestion" onClick={() => setInput(prompt)}>
                {prompt}
              </button>
            ))}
          </div>

          <form className="chatbot-form" onSubmit={handleSubmit}>
            <input
              className="chatbot-input"
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about posts, Markdown, login, categories, or platform usage..."
            />
            <div className="chatbot-controls">
              {voiceSupported && (
                <button
                  type="button"
                  className={`secondary-button chatbot-voice ${isListening ? 'listening' : ''}`}
                  onClick={handleVoiceInput}
                >
                  {isListening ? 'Stop Mic' : 'Voice Note'}
                </button>
              )}
              <button type="button" className="secondary-button chatbot-copy" onClick={handleSpeakLastReply}>
                Speak
              </button>
              <button type="button" className="secondary-button chatbot-copy" onClick={handleCopyLastReply}>
                Copy Reply
              </button>
              <button type="submit" disabled={loading}>
                Send
              </button>
            </div>
          </form>
        </section>
      )}

      <button type="button" className="chatbot-toggle" onClick={() => setIsOpen((current) => !current)}>
        {isOpen ? 'Hide PersonalBlogAI' : 'Ask PersonalBlogAI'}
      </button>
    </div>
  );
};

export default ChatbotWidget;
