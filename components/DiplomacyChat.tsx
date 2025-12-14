import React, { useState, useEffect, useRef } from 'react';
import { Country, ChatMessage } from '../types';
import { Send, User, Bot, X } from 'lucide-react';
import { sendDiplomacyMessage } from '../services/geminiService';

interface DiplomacyChatProps {
  player: Country;
  target: Country;
  gameState: any;
  onClose: () => void;
  onUpdateHistory: (countryId: string, history: ChatMessage[]) => void;
}

const DiplomacyChat: React.FC<DiplomacyChatProps> = ({ player, target, gameState, onClose, onUpdateHistory }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if(scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [target.chatHistory, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = { sender: 'player', text: input, timestamp: Date.now() };
    const newHistory = [...target.chatHistory, userMsg];
    onUpdateHistory(target.id, newHistory);
    setInput('');
    setLoading(true);

    try {
      const responseText = await sendDiplomacyMessage(player, target, gameState, input);
      const aiMsg: ChatMessage = { sender: 'ai', text: responseText, timestamp: Date.now() };
      onUpdateHistory(target.id, [...newHistory, aiMsg]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-game-panel border border-gray-600 rounded-lg shadow-2xl flex flex-col h-[600px]">
        {/* Header */}
        <div className="p-4 border-b border-gray-600 flex justify-between items-center bg-gray-800 rounded-t-lg">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{target.flag}</span>
            <div>
              <h3 className="font-bold text-lg text-white">{target.name}</h3>
              <p className={`text-xs font-mono ${
                target.relation === 'War' ? 'text-red-500' : 
                target.relation === 'Alliance' ? 'text-blue-400' : 'text-yellow-400'
              }`}>Status: {target.relation}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900/50">
          {target.chatHistory.length === 0 && (
            <div className="text-center text-gray-500 mt-10 italic">
              Start a conversation with the leader of {target.name}...
            </div>
          )}
          {target.chatHistory.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.sender === 'player' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                msg.sender === 'player' 
                  ? 'bg-blue-700 text-white rounded-tr-none' 
                  : 'bg-gray-700 text-gray-200 rounded-tl-none border border-gray-600'
              }`}>
                <div className="flex items-center gap-2 mb-1 opacity-50 text-[10px] uppercase tracking-wider font-bold">
                  {msg.sender === 'player' ? <User size={10} /> : <Bot size={10} />}
                  {msg.sender === 'player' ? 'You' : target.name}
                </div>
                <p className="text-sm leading-relaxed">{msg.text}</p>
              </div>
            </div>
          ))}
          {loading && (
             <div className="flex justify-start">
             <div className="bg-gray-700 text-gray-200 rounded-2xl rounded-tl-none px-4 py-3 border border-gray-600 flex gap-1">
               <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
               <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
               <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
             </div>
           </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-gray-800 border-t border-gray-600 rounded-b-lg">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={`Message ${target.name}...`}
              className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white p-2 rounded-lg transition-colors flex items-center justify-center w-12"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiplomacyChat;
