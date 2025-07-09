import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase.js';
import { showToast } from '../components/ui.jsx';
import { 
    Send, 
    Paperclip, 
    Download, 
    MessageSquare, 
    Clock, 
    AlertCircle,
    FileText,
    Image,
    X
} from 'lucide-react';

const SupportPage = ({ session, supportUnread }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [isSending, setIsSending] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const [rateLimitInfo, setRateLimitInfo] = useState(null);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const realtimeChannel = useRef(null);

    // Constants
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const MAX_MESSAGE_LENGTH = 1000;
    const ALLOWED_FILE_TYPES = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    // Scroll to bottom of messages
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Format timestamp
    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);
        
        if (diffInHours < 24) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString([], { 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    };

    // Get file icon based on type
    const getFileIcon = (fileName, fileSize) => {
        if (!fileName) return <FileText className="w-4 h-4" />;
        
        const extension = fileName.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
            return <Image className="w-4 h-4" />;
        }
        return <FileText className="w-4 h-4" />;
    };

    // Format file size
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Check rate limit
    const checkRateLimit = async () => {
        try {
            const { data, error } = await supabase.rpc('check_support_rate_limit', {
                target_user_id: session.user.id
            });
            
            if (error) {
                console.error('Rate limit check error:', error);
                return false;
            }
            
            return data;
        } catch (error) {
            console.error('Rate limit check error:', error);
            return false;
        }
    };

    // Load messages
    const loadMessages = async () => {
        try {
            const { data, error } = await supabase
                .from('v_recent_support_chats')
                .select('*')
                .eq('user_id', session.user.id);
            
            if (error) {
                console.error('Error loading messages:', error);
                showToast('Failed to load messages', 'error');
                return;
            }
            
            setMessages(data || []);
            
            // Mark admin messages as read
            await supabase.rpc('mark_admin_messages_as_read', {
                target_user_id: session.user.id
            });
            
            setUnreadCount(0);
        } catch (error) {
            console.error('Error loading messages:', error);
            showToast('Failed to load messages', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle file selection
    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Check file size
        if (file.size > MAX_FILE_SIZE) {
            showToast(`File size must be less than ${formatFileSize(MAX_FILE_SIZE)}`, 'error');
            return;
        }

        // Check file type
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
            showToast('File type not supported', 'error');
            return;
        }

        setSelectedFile(file);
    };

    // Remove selected file
    const removeSelectedFile = () => {
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Upload file
    const uploadFile = async (file) => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `support/${session.user.id}/${fileName}`;

            const { data, error } = await supabase.storage
                .from('support-attachments')
                .upload(filePath, file);

            if (error) {
                console.error('File upload error:', error);
                throw error;
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('support-attachments')
                .getPublicUrl(filePath);

            return {
                url: urlData.publicUrl,
                name: file.name,
                size: file.size
            };
        } catch (error) {
            console.error('File upload error:', error);
            throw error;
        }
    };

    // Send message
    const sendMessage = async () => {
        if (!newMessage.trim() && !selectedFile) return;
        
        if (newMessage.length > MAX_MESSAGE_LENGTH) {
            showToast(`Message too long (max ${MAX_MESSAGE_LENGTH} characters)`, 'error');
            return;
        }

        // Check rate limit
        const canSend = await checkRateLimit();
        if (!canSend) {
            showToast('Rate limit exceeded. Please wait before sending another message.', 'error');
            return;
        }

        setIsSending(true);
        let attachmentData = null;

        try {
            // Ensure user support summary record exists
            await supabase.rpc('ensure_user_support_summary');
            
            // Upload file if selected
            if (selectedFile) {
                attachmentData = await uploadFile(selectedFile);
            }

            // Send message
            const { error } = await supabase
                .from('support_chats')
                .insert({
                    user_id: session.user.id,
                    message: newMessage.trim() || 'Sent an attachment',
                    attachment_url: attachmentData?.url || null,
                    attachment_name: attachmentData?.name || null,
                    attachment_size: attachmentData?.size || null,
                    sender: 'user'
                });

            if (error) {
                console.error('Error sending message:', error);
                showToast('Failed to send message', 'error');
                return;
            }

            // Clear form
            setNewMessage('');
            setSelectedFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }

            showToast('Message sent successfully!', 'success');
            
        } catch (error) {
            console.error('Error sending message:', error);
            showToast('Failed to send message', 'error');
        } finally {
            setIsSending(false);
        }
    };

    // Handle Enter key
    const handleKeyPress = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    };

    // Set up real-time subscription
    useEffect(() => {
        if (!session) return;

        const channel = supabase
            .channel('support-messages')
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'support_chats',
                    filter: `user_id=eq.${session.user.id}`
                }, 
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setMessages(prev => [...prev, payload.new]);
                        
                        // If it's an admin message, increment unread count
                        if (payload.new.sender === 'admin') {
                            setUnreadCount(prev => prev + 1);
                        }
                    }
                }
            )
            .subscribe();

        realtimeChannel.current = channel;

        return () => {
            if (realtimeChannel.current) {
                supabase.removeChannel(realtimeChannel.current);
            }
        };
    }, [session]);

    // Load messages on mount
    useEffect(() => {
        if (session) {
            loadMessages();
            // Mark messages as read when support page is opened
            if (supportUnread?.markAsRead) {
                supportUnread.markAsRead();
            }
        }
    }, [session, supportUnread]);

    // Scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    if (!session) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-slate-600">Please log in to access support</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <MessageSquare className="w-8 h-8 text-emerald-600" />
                <h1 className="text-3xl font-bold text-slate-900">Support</h1>
                {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                        {unreadCount}
                    </span>
                )}
            </div>

            {/* Chat Container */}
            <div className="bg-white rounded-xl border border-slate-200 flex flex-col h-[600px] shadow-sm">
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-center">
                            <div>
                                <MessageSquare className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                                <p className="text-slate-600 text-lg">No messages yet</p>
                                <p className="text-slate-500 text-sm mt-2">
                                    Start a conversation by sending a message below
                                </p>
                            </div>
                        </div>
                    ) : (
                        messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                        message.sender === 'user'
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-slate-100 text-slate-900'
                                    }`}
                                >
                                    {/* Message Text */}
                                    <p className="text-sm">{message.message}</p>

                                    {/* Attachment */}
                                    {message.attachment_url && (
                                        <div className="mt-2 p-2 bg-slate-200 rounded flex items-center gap-2">
                                            {getFileIcon(message.attachment_name)}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs truncate">{message.attachment_name}</p>
                                                <p className="text-xs opacity-75">
                                                    {formatFileSize(message.attachment_size)}
                                                </p>
                                            </div>
                                            <a
                                                href={message.attachment_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs hover:underline flex items-center gap-1"
                                            >
                                                <Download className="w-3 h-3" />
                                                Download
                                            </a>
                                        </div>
                                    )}

                                    {/* Timestamp */}
                                    <div className="flex items-center gap-1 mt-1">
                                        <Clock className="w-3 h-3 opacity-50" />
                                        <span className="text-xs opacity-75">
                                            {formatTimestamp(message.created_at)}
                                        </span>
                                        {message.sender === 'user' && (
                                            <span className="text-xs opacity-75">• You</span>
                                        )}
                                        {message.sender === 'admin' && (
                                            <span className="text-xs opacity-75">• Support</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="border-t border-slate-200 p-4">
                    {/* Selected File Preview */}
                    {selectedFile && (
                        <div className="mb-3 p-3 bg-slate-100 rounded-lg flex items-center gap-3">
                            {getFileIcon(selectedFile.name)}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-900 truncate">{selectedFile.name}</p>
                                <p className="text-xs text-slate-600">
                                    {formatFileSize(selectedFile.size)}
                                </p>
                            </div>
                            <button
                                onClick={removeSelectedFile}
                                className="text-slate-500 hover:text-slate-700"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* Message Input */}
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <textarea
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Type your message..."
                                className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                                rows="2"
                                maxLength={MAX_MESSAGE_LENGTH}
                                disabled={isSending}
                            />
                            <div className="absolute bottom-2 right-2 text-xs text-slate-500">
                                {newMessage.length}/{MAX_MESSAGE_LENGTH}
                            </div>
                        </div>

                        {/* File Upload Button */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-slate-600 hover:text-slate-900 transition-colors"
                            title="Attach file"
                            disabled={isSending}
                        >
                            <Paperclip className="w-5 h-5" />
                        </button>

                        {/* Send Button */}
                        <button
                            onClick={sendMessage}
                            disabled={isSending || (!newMessage.trim() && !selectedFile)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                        >
                            {isSending ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                            Send
                        </button>
                    </div>

                    {/* Hidden File Input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileSelect}
                        accept={ALLOWED_FILE_TYPES.join(',')}
                        className="hidden"
                    />

                    {/* Help Text */}
                    <p className="text-xs text-slate-500 mt-2">
                        Max file size: {formatFileSize(MAX_FILE_SIZE)} • 
                        Supported formats: Images, PDF, Word, Text files
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SupportPage; 