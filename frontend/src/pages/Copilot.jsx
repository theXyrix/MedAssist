import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Sparkles,
  FileText,
  User,
  RotateCcw,
  ChevronRight,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  AlertCircle,
  Shield,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { mockCopilotSuggestions, getAIResponse } from '../data/mockCopilot';
import { sleep } from '../utils/helpers';
import { askCopilot } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';

function MarkdownMessage({ content }) {
  // Simple markdown renderer
  const renderLine = (line, idx) => {
    if (line.startsWith('## ')) return <h3 key={idx} className="font-bold text-slate-900 mt-3 mb-1 text-sm">{line.slice(3)}</h3>;
    if (line.startsWith('**') && line.endsWith('**')) {
      return <p key={idx} className="font-semibold text-slate-800 text-sm">{line.slice(2, -2)}</p>;
    }
    if (line.startsWith('- ')) return <li key={idx} className="text-sm text-slate-700 ml-3">• {line.slice(2)}</li>;
    if (line.startsWith('---')) return <hr key={idx} className="border-slate-200 my-2" />;
    if (line.includes('|')) {
      const cells = line.split('|').filter(Boolean);
      if (line.includes('---')) return null; // skip separator
      return (
        <div key={idx} className="flex gap-2 text-xs border-b border-slate-100 py-1">
          {cells.map((cell, i) => (
            <span key={i} className={`flex-1 ${i === 0 ? 'text-slate-500' : 'font-medium text-slate-800'}`}>
              {cell.trim()}
            </span>
          ))}
        </div>
      );
    }

    // Handle inline bold
    const parts = line.split(/\*\*(.*?)\*\*/g);
    if (parts.length > 1) {
      return (
        <p key={idx} className="text-sm text-slate-700 leading-relaxed">
          {parts.map((p, i) => i % 2 === 1 ? <strong key={i} className="text-slate-900">{p}</strong> : p)}
        </p>
      );
    }

    if (!line.trim()) return <div key={idx} className="h-1" />;
    return <p key={idx} className="text-sm text-slate-700 leading-relaxed">{line}</p>;
  };

  return (
    <div className="space-y-0.5">
      {content.split('\n').map((line, idx) => renderLine(line, idx))}
    </div>
  );
}

export default function Copilot() {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I'm your **MedAssist AI Copilot** 👋

I can help you understand your medical records, summarize lab results, and answer questions about your health history.

Try asking me:
- "What were my latest blood test results?"
- "Show my hemoglobin history."
- "What changed between my last two reports?"
- "Summarize my latest hospital visit."

---
⚠️ *I provide information based on your uploaded records only. I do not diagnose conditions or replace professional medical advice.*`,
      sources: [],
      timestamp: new Date().toISOString(),
      isTyping: false,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  // Feature 4: Voice Speech State
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState(null);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);

  const recognitionRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize Web Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = (event) => {
        console.warn('[Speech Recognition] Error:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone permission denied. Please allow microphone access in your browser settings.');
        } else if (event.error === 'no-speech') {
          setSpeechError('No speech detected. Please try speaking closer to your microphone.');
        } else {
          setSpeechError(`Voice input error (${event.error}). Please try again or type your question.`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('SpeechRecognition initialization error:', err);
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleListening = () => {
    if (!speechSupported) {
      setSpeechError('Voice input is not supported in this browser. Please use Google Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setSpeechError(null);
      const langCode = language === 'ta' ? 'ta-IN' : language === 'hi' ? 'hi-IN' : 'en-US';
      if (recognitionRef.current) {
        recognitionRef.current.lang = langCode;
        try {
          recognitionRef.current.start();
        } catch (err) {
          console.warn('Recognition start failed:', err);
          setIsListening(false);
        }
      }
    }
  };

  const speakResponse = (msgId, text) => {
    if (!window.speechSynthesis) return;

    if (speakingMessageId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Strip markdown formatting for cleaner speech synthesis
    const cleanText = text
      .replace(/[*#_`-]/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/⚕️/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = language === 'ta' ? 'ta-IN' : language === 'hi' ? 'hi-IN' : 'en-US';
    utterance.rate = 0.95;

    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    setSpeakingMessageId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  const sendMessage = async (text) => {
    const query = text || input.trim();
    if (!query || isLoading) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    }

    setInput('');
    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    };

    const typingMsg = {
      id: `typing-${Date.now()}`,
      role: 'assistant',
      content: '',
      isTyping: true,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg, typingMsg]);
    setIsLoading(true);

    let answerContent = '';
    let sourcesList = [];

    try {
      const apiRes = await askCopilot(query, 'patient-demo-001', language);
      if (apiRes && apiRes.answer) {
        answerContent = apiRes.answer;
        sourcesList = (apiRes.sources || []).map(s => s.document_title || s.title || 'Medical Record');
      }
    } catch (e) {
      console.warn('Copilot API call failed, falling back to local simulation:', e);
    }

    if (!answerContent) {
      await sleep(600);
      const aiResult = getAIResponse(query);
      answerContent = aiResult.response;
      sourcesList = aiResult.sources || [];
    }

    setMessages(prev => [
      ...prev.filter(m => !m.isTyping),
      {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: answerContent,
        sources: sourcesList,
        timestamp: new Date().toISOString(),
        isTyping: false,
      },
    ]);
    setIsLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setMessages(prev => [prev[0]]);
    setInput('');
    setSpeechError(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] max-h-[800px] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">{t('copilot.title', 'Voice-Enabled AI Copilot')}</h2>
            <Badge variant="ai" size="xs">
              <Sparkles className="w-2.5 h-2.5 mr-1" />
              AI Grounded
            </Badge>
          </div>
          <p className="text-xs text-slate-500">{t('copilot.subtitle', 'Ask health questions via typing or microphone with spoken answers')}</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <div className="flex bg-slate-100 rounded-lg p-0.5 text-xs font-medium border border-slate-200">
            <button
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                language === 'en' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLanguage('ta')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                language === 'ta' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              தமிழ்
            </button>
            <button
              onClick={() => setLanguage('hi')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                language === 'hi' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              हिन्दी
            </button>
          </div>

          <Button variant="ghost" size="sm" onClick={clearChat} title="Reset chat" className="text-xs">
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Voice Status & Error Alerts */}
      {speechError && (
        <div className="mb-3 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{speechError}</span>
          </div>
          <button
            onClick={() => setSpeechError(null)}
            className="text-red-600 hover:text-red-900 text-xs font-semibold px-2 py-0.5"
          >
            Dismiss
          </button>
        </div>
      )}

      {isListening && (
        <div className="mb-3 bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="font-semibold">
              Listening in {language === 'ta' ? 'Tamil (தமிழ்)' : language === 'hi' ? 'Hindi (हिन्दी)' : 'English'}... Speak now into your microphone.
            </span>
          </div>
          <button
            onClick={toggleListening}
            className="text-blue-700 hover:text-blue-900 font-bold underline text-xs"
          >
            Stop Listening
          </button>
        </div>
      )}

      {/* Messages Feed */}
      <Card className="flex-1 flex flex-col overflow-hidden shadow-sm">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white shrink-0 shadow-sm mt-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none shadow-sm'
                    : 'bg-slate-50 border border-slate-200/80 text-slate-800 rounded-tl-none shadow-sm'
                }`}
              >
                {msg.isTyping ? (
                  <div className="flex items-center gap-1.5 py-1">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                ) : (
                  <>
                    <MarkdownMessage content={msg.content} />

                    {/* Spoken Audio Controls on Assistant Messages */}
                    {msg.role === 'assistant' && msg.id !== 'welcome' && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200/60">
                        <button
                          onClick={() => speakResponse(msg.id, msg.content)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-white px-2 py-0.5 rounded-md border border-slate-200 transition-colors"
                          title="Read aloud"
                        >
                          {speakingMessageId === msg.id ? (
                            <>
                              <VolumeX className="w-3.5 h-3.5 text-red-600" />
                              Stop Voice
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                              Listen ({language.toUpperCase()})
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Source Citations */}
                    {msg.sources?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {msg.sources.map((source, i) => (
                          <span
                            key={i}
                            className="flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full"
                          >
                            <FileText className="w-2.5 h-2.5" />
                            {source}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center text-slate-700 shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Suggestion Chips */}
        {messages.length <= 1 && (
          <div className="px-4 pb-3 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-400 mb-2 mt-2">Suggested questions</p>
            <div className="flex flex-wrap gap-2">
              {mockCopilotSuggestions.slice(0, 4).map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors flex items-center gap-1"
                >
                  <ChevronRight className="w-2.5 h-2.5" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar with Mic and Send Buttons */}
        <div className="border-t border-slate-200 p-3 flex gap-2 items-end bg-white rounded-b-xl">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? (t('copilot.listening', 'Listening... Speak your question now.')) : t('copilot.placeholder', 'Ask about your medical records (or click mic)...')}
            rows={1}
            className="flex-1 resize-none text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-300 bg-slate-50 transition-all max-h-28"
            aria-label="Message input"
            style={{ height: 'auto' }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 112) + 'px';
            }}
          />

          {/* Microphone Button */}
          <button
            onClick={toggleListening}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
              isListening
                ? 'bg-red-600 text-white animate-pulse shadow-md shadow-red-200'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
            title={isListening ? 'Stop listening' : `Click to speak in ${language.toUpperCase()}`}
            aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Send Button */}
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white hover:from-blue-700 hover:to-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0 shadow-sm"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </Card>

      {/* Privacy Notice */}
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 text-center mt-2">
        <Shield className="w-3 h-3 text-slate-400" />
        <span>{t('copilot.private_speech', 'Private On-Device Speech: Voice recognition runs in your browser. Audio is never stored on servers.')}</span>
      </div>
    </div>
  );
}
