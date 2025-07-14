import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, MessageCircle, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import { Link } from "wouter";

interface Message {
  id: string;
  text: string;
  sender: "user" | "assistant";
  timestamp: Date;
}

// Function to render markdown links as clickable components
const renderMessageWithLinks = (text: string) => {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    // Add the link component
    const linkText = match[1];
    const linkUrl = match[2];
    parts.push(
      <Link 
        key={match.index} 
        href={linkUrl} 
        className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
      >
        {linkText}
      </Link>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add any remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts.length > 0 ? parts : text;
};

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I'm your KitchenOff AI Assistant. I can help you find the perfect kitchen equipment, answer questions about products, and provide expert advice for your professional kitchen needs. How can I assist you today?",
      sender: "assistant",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const response = await apiRequest("POST", "/api/ai/connect", {});
      const data = await response.json();
      
      if (data.success) {
        setIsConnected(true);
        setSessionId(data.sessionId);
        setCapabilities(data.capabilities || []);
        
        toast({
          title: "Connected to AI Assistant",
          description: "You can now start chatting with the AI Assistant.",
        });
      } else {
        throw new Error(data.message || "Failed to connect");
      }
    } catch (error) {
      console.error("Connection error:", error);
      toast({
        title: "Connection Failed",
        description: "Unable to connect to AI Assistant. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !isConnected || !sessionId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);

    try {
      const response = await apiRequest("POST", "/api/ai/chat", {
        message: userMessage.text,
        sessionId,
      });

      const data = await response.json();
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        sender: "assistant",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Chat Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsTyping(false);
    }
  };

  const suggestedQuestions = [
    "Best cleaning supplies for restaurants?",
    "Recommend a food thermometer",
    "HACCP equipment needed?",
    "Show best-selling products",
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4 flex items-center justify-center gap-2">
              <Bot className="h-8 w-8 text-primary" />
              AI Assistant
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Get instant help with product recommendations, kitchen setup advice, and expert guidance for your professional kitchen needs.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Connection Status & Features */}
            <div className="space-y-4 lg:col-span-1">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <MessageCircle className="h-4 w-4" />
                    Connection Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className="text-xs font-medium">
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  {!isConnected && (
                    <Button onClick={handleConnect} className="w-full h-8 text-xs" disabled={isConnecting}>
                      {isConnecting ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        "Connect to AI Assistant"
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Sparkles className="h-4 w-4" />
                    AI Features
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-1">
                    {capabilities.length > 0 ? (
                      capabilities.map((capability, index) => (
                        <Badge key={index} variant="secondary" className="w-full justify-start text-xs py-1">
                          {capability}
                        </Badge>
                      ))
                    ) : (
                      <>
                        <Badge variant="outline" className="w-full justify-start text-xs py-1">
                          Product Recommendations
                        </Badge>
                        <Badge variant="outline" className="w-full justify-start text-xs py-1">
                          Kitchen Setup Advice
                        </Badge>
                        <Badge variant="outline" className="w-full justify-start text-xs py-1">
                          HACCP Compliance Help
                        </Badge>
                        <Badge variant="outline" className="w-full justify-start text-xs py-1">
                          Equipment Comparisons
                        </Badge>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Quick Questions</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-1">
                    {suggestedQuestions.map((question, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-left h-auto p-2 text-xs leading-normal whitespace-normal min-h-[2rem]"
                        onClick={() => {
                          if (isConnected) {
                            setInputMessage(question);
                          }
                        }}
                        disabled={!isConnected}
                      >
                        <span className="block break-words">{question}</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chat Interface */}
            <div className="lg:col-span-3">
              <Card className="h-[600px] flex flex-col">
                <CardHeader className="flex-shrink-0">
                  <CardTitle>Chat with AI Assistant</CardTitle>
                  <CardDescription>
                    Ask questions about products, get recommendations, or seek expert advice
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col min-h-0">
                  <ScrollArea className="flex-1 pr-4 mb-4 min-h-0">
                    <div className="space-y-4 p-2">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex gap-3 ${
                            message.sender === "user" ? "justify-end" : "justify-start"
                          }`}
                        >
                          {message.sender === "assistant" && (
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                              <Bot className="h-4 w-4 text-white" />
                            </div>
                          )}
                          <div
                            className={`max-w-[70%] p-3 rounded-lg break-words ${
                              message.sender === "user"
                                ? "bg-primary text-white"
                                : "bg-muted"
                            }`}
                          >
                            <div className="text-sm whitespace-pre-wrap">
                              {message.sender === "assistant" 
                                ? renderMessageWithLinks(message.text)
                                : message.text
                              }
                            </div>
                            <p className="text-xs opacity-70 mt-1">
                              {message.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                          {message.sender === "user" && (
                            <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </div>
                      ))}
                      {isTyping && (
                        <div className="flex gap-3 justify-start">
                          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                            <Bot className="h-4 w-4 text-white" />
                          </div>
                          <div className="bg-muted p-3 rounded-lg">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div ref={messagesEndRef} />
                  </ScrollArea>
                  
                  <Separator className="mb-4 flex-shrink-0" />
                  
                  <form onSubmit={handleSendMessage} className="flex gap-2 flex-shrink-0">
                    <Input
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder={
                        isConnected
                          ? "Ask me anything about kitchen equipment..."
                          : "Connect to AI Assistant to start chatting..."
                      }
                      disabled={!isConnected}
                      className="flex-1"
                    />
                    <Button type="submit" disabled={!isConnected || !inputMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}