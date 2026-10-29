import React, { useState, useRef, useEffect } from 'react';
import api from '../../services/api';
import { Send, Bot, User, Sparkles, MapPin, Compass } from 'lucide-react';
import InteractiveMap from '../map/InteractiveMap';

export default function ChatBox({ tripContext = null }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Chào bạn! Tôi là Trợ lý Du Lịch AI TP. Hồ Chí Minh. Bạn có thể hỏi tôi về quán ăn ngon, địa điểm check-in, mẹo tránh kẹt xe giờ cao điểm, hoặc phương án khi trời mưa!',
      mini_map: {
        place_name: 'Nhà thờ Đức Bà Sài Gòn & Bưu điện',
        district: 'Quận 1',
        lat: 10.7798,
        lng: 106.6990
      },
      quick_suggestions: [
        'Gợi ý quán ốc ngon Quận 4',
        'Tìm quán cà phê view đẹp ngắm hoàng hôn',
        'Phương án khi trời mưa to Sài Gòn',
        'Cách di chuyển tránh kẹt xe 17h-19h'
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend = null) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: text.trim()
    };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', { message: text.trim() });
      const aiReply = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: res.data.reply,
        mini_map: res.data.mini_map,
        quick_suggestions: res.data.quick_suggestions
      };
      setMessages((prev) => [...prev, aiReply]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: 'Xin lỗi, tạm thời kết nối AI bị gián đoạn. Bạn vui lòng thử lại sau giây lát!'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col h-[520px]">
      {/* Chat Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-rose-500 to-indigo-600 text-white flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-bold flex items-center gap-1.5">
              <span>Trợ Lý Du Lịch Sài Gòn AI</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </h4>
            <p className="text-[11px] text-rose-100">Sẵn sàng giải đáp & tinh chỉnh lịch trình</p>
          </div>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-start space-x-2 max-w-[88%]">
              {m.sender === 'ai' && (
                <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5 border border-rose-200">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              )}
              <div
                className={`p-3 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-rose-600 text-white rounded-br-none shadow-sm'
                    : 'bg-white text-slate-800 rounded-bl-none border border-slate-200 shadow-sm'
                }`}
              >
                <p className="whitespace-pre-line">{m.text}</p>

                {/* Yêu cầu 3: Gửi kèm bản đồ (Mini Map Card) trong tin nhắn */}
                {m.mini_map && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100">
                    <InteractiveMap places={[m.mini_map]} isMini={true} />
                  </div>
                )}
              </div>
            </div>

            {/* Quick Suggestion Chips */}
            {m.quick_suggestions && m.quick_suggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5 pl-9">
                {m.quick_suggestions.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(typeof chip === 'string' ? chip : chip.title)}
                    className="px-2.5 py-1 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-slate-700 hover:text-rose-600 rounded-full text-[11px] font-medium transition-all shadow-xs"
                  >
                    💬 {typeof chip === 'string' ? chip : chip.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center space-x-2 text-slate-400 text-xs pl-2">
            <Bot className="w-4 h-4 animate-bounce text-rose-500" />
            <span>AI đang soạn câu trả lời và tra cứu bản đồ TP.HCM...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Nhập câu hỏi (ví dụ: đổi quán cafe, phương án khi mưa...)"
          className="flex-1 px-3.5 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          className="p-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl shadow-sm transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
