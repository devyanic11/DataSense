import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, User, Sparkles } from 'lucide-react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatProps {
    filename: string;
    contentSummary: string;
    onChartRequested?: (chartType: string) => void;
}

interface Message {
    id: string;
    sender: 'user' | 'agent';
    text: string;
}

export default function Chat({ filename, contentSummary, onChartRequested }: ChatProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            sender: 'agent',
            text: `Hi! I've analyzed **${filename}**. What would you like to know about it?`
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg = input.trim();
        setInput('');

        const newMessages: Message[] = [
            ...messages,
            { id: Date.now().toString(), sender: 'user', text: userMsg }
        ];
        setMessages(newMessages);
        setLoading(true);

        try {
            // Format history for backend
            const history = newMessages
                .filter(m => m.id !== '1') // Exclude generic greeting
                .reduce((acc: any[], curr, i, arr) => {
                    if (curr.sender === 'user' && i + 1 < arr.length && arr[i + 1].sender === 'agent') {
                        acc.push({ user: curr.text, agent: arr[i + 1].text });
                    }
                    return acc;
                }, []);

            const response = await axios.post("http://localhost:8000/api/chat", {
                content_summary: contentSummary,
                question: userMsg,
                history: history
            });

            let answer: string = response.data.answer || '';

            // Extract chart request tag — handle multiple Gemini formats
            // e.g. <CHART: Scatter Plot>, `<CHART: Bar Chart>`, **<CHART: Pie Chart>**
            const chartMatch = answer.match(/[`*]*<CHART:\s*(.*?)>[`*]*/i);
            if (chartMatch && chartMatch[1]) {
                const chartType = chartMatch[1].trim();
                if (onChartRequested) {
                    onChartRequested(chartType);
                }
                // Remove the tag from the displayed message
                answer = answer.replace(chartMatch[0], '').trim();
                // Add a visual note that the chart was generated
                answer = `📊 **${chartType}** has been added to the visualization panel above.\n\n${answer}`;
            }

            setMessages([
                ...newMessages,
                { id: (Date.now() + 1).toString(), sender: 'agent', text: answer }
            ]);
        } catch (error) {
            console.error(error);
            setMessages([
                ...newMessages,
                { id: (Date.now() + 1).toString(), sender: 'agent', text: "Sorry, I encountered an error communicating with the API. Please ensure your Gemini API key is configured correctly." }
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50 relative">
            {/* Glossy Header overlay */}
            <div className="px-5 py-4 border-b border-slate-200 bg-white flex items-center gap-3">
                <div className="p-2 bg-gradient-to-tr from-fuchsia-500 to-purple-500 rounded-lg shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                    <Sparkles size={20} className="text-slate-800" />
                </div>
                <h3 className="font-semibold text-lg text-slate-800">Data Assistant</h3>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex items-end gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-lg ${msg.sender === 'user' ? 'bg-yellow-500' : 'bg-orange-500'
                            }`}>
                            {msg.sender === 'user' ? <User size={20} /> : <Bot size={20} />}
                        </div>

                        <div className={`max-w-[75%] px-5 py-4 rounded-2xl text-base leading-relaxed backdrop-blur-md shadow-lg ${msg.sender === 'user'
                            ? 'bg-orange-100 text-orange-900 border border-orange-200 rounded-br-none'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none overflow-x-auto'
                            }`}>
                            <div className="prose prose-slate prose-base max-w-none prose-p:leading-relaxed prose-pre:bg-slate-100 prose-pre:border prose-pre:border-slate-200 prose-pre:text-slate-800 prose-th:border-b-slate-300 prose-td:border-b-slate-200 prose-table:border-collapse text-inherit">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {msg.text}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex items-end gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center shrink-0 shadow-lg">
                            <Bot size={20} />
                        </div>
                        <div className="bg-white border border-slate-200 px-5 py-4 rounded-2xl rounded-bl-none flex items-center gap-3">
                            <Loader2 size={20} className="animate-spin text-purple-300" />
                            <span className="text-base text-slate-700">Agent is analyzing the data...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-200 bg-black/20">
                <form
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    className="relative flex items-center"
                >
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question about the data..."
                        className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all placeholder:text-slate-500"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || loading}
                        className="absolute right-2 p-2 rounded-lg bg-orange-500 hover:bg-purple-500 disabled:bg-white disabled:text-slate-500 text-slate-800 transition-all"
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
}
