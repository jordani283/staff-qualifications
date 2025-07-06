import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase.js';
import { showToast } from '../components/ui.jsx';
import { 
    Send, 
    MessageSquare, 
    Users, 
    Clock, 
    AlertCircle,
    Search,
    FileText,
    Image,
    Download,
    X,
    Shield
} from 'lucide-react';

const AdminSupportPage = ({ session }) => {
    const [userChats, setUserChats] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [selectedUserMessages, setSelectedUserMessages] = useState([]);
    const [newReply, setNewReply] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
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

    // Check if user is admin (database flag only)
    const isAdmin = session?.profile?.is_admin === true;

    // Scroll to bottom of messages
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Format timestamp
    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);
        
        if (diffInHours < 1) {
            const diffInMinutes = Math.floor((now - date) / (1000 * 60));
            return `${diffInMinutes}m ago`;
        } else if (diffInHours < 24) {
            return `${Math.floor(diffInHours)}h ago`;
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
    const getFileIcon = (fileName) => {
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

    // Load user chats
    const loadUserChats = async () => {
        try {
            // First, get all unique user IDs from support_chats
            const { data: chatData, error: chatError } = await supabase
                .from('support_chats')
                .select('user_id, created_at')
                .order('created_at', { ascending: false });
            
            if (chatError) {
                console.error('Error loading chat data:', chatError);
                showToast('Failed to load user chats', 'error');
                return;
            }
            
            // Get unique user IDs
            const uniqueUserIds = [...new Set(chatData.map(chat => chat.user_id))];
            
            if (uniqueUserIds.length === 0) {
                setUserChats([]);
                return;
            }
            
            // Then get profile information for those users
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, company_name')
                .in('id', uniqueUserIds);
            
            if (profileError) {
                console.error('Error loading profile data:', profileError);
                showToast('Failed to load user profiles', 'error');
                return;
            }
            
            // Group chat data by user_id and get the latest message for each user
            const userChatsMap = new Map();
            chatData.forEach(chat => {
                if (!userChatsMap.has(chat.user_id)) {
                    userChatsMap.set(chat.user_id, {
                        user_id: chat.user_id,
                        last_user_message_at: chat.created_at,
                        unread_admin_messages: 0,
                        total_messages: 0
                    });
                }
            });
            
            // Merge with profile data
            const userChatsWithProfiles = Array.from(userChatsMap.values()).map(chat => {
                const profile = profileData.find(p => p.id === chat.user_id);
                return {
                    ...chat,
                    profiles: profile || { id: chat.user_id, first_name: null, last_name: null, company_name: null }
                };
            });
            
            setUserChats(userChatsWithProfiles);
        } catch (error) {
            console.error('Error loading user chats:', error);
            showToast('Failed to load user chats', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Load messages for specific user
    const loadUserMessages = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('v_recent_support_chats')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: true });
            
            if (error) {
                console.error('Error loading user messages:', error);
                showToast('Failed to load messages', 'error');
                return;
            }
            
            setSelectedUserMessages(data || []);
        } catch (error) {
            console.error('Error loading user messages:', error);
            showToast('Failed to load messages', 'error');
        }
    };

    // Handle user selection
    const handleUserSelect = (userId) => {
        setSelectedUserId(userId);
        loadUserMessages(userId);
    };

    // Handle file selection
    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (file.size > MAX_FILE_SIZE) {
            showToast(`File size must be less than ${formatFileSize(MAX_FILE_SIZE)}`, 'error');
            return;
        }

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
            const filePath = `support/admin/${fileName}`;

            const { data, error } = await supabase.storage
                .from('support-attachments')
                .upload(filePath, file);

            if (error) {
                throw error;
            }

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

    // Send reply
    const sendReply = async () => {
        if (!newReply.trim() && !selectedFile) return;
        if (!selectedUserId) return;
        
        if (newReply.length > MAX_MESSAGE_LENGTH) {
            showToast(`Message too long (max ${MAX_MESSAGE_LENGTH} characters)`, 'error');
            return;
        }

        setIsSending(true);
        let attachmentData = null;

        try {
            // Upload file if selected
            if (selectedFile) {
                attachmentData = await uploadFile(selectedFile);
            }

            // Send reply
            const { error } = await supabase
                .from('support_chats')
                .insert({
                    user_id: selectedUserId,
                    message: newReply.trim() || 'Sent an attachment',
                    attachment_url: attachmentData?.url || null,
                    attachment_name: attachmentData?.name || null,
                    attachment_size: attachmentData?.size || null,
                    sender: 'admin'
                });

            if (error) {
                console.error('Error sending reply:', error);
                showToast('Failed to send reply', 'error');
                return;
            }

            // Clear form
            setNewReply('');
            setSelectedFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }

            showToast('Reply sent successfully!', 'success');
            
        } catch (error) {
            console.error('Error sending reply:', error);
            showToast('Failed to send reply', 'error');
        } finally {
            setIsSending(false);
        }
    };

    // Handle Enter key
    const handleKeyPress = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendReply();
        }
    };

    // Filter users based on search
    const filteredUsers = userChats.filter(chat => {
        const userName = `${chat.profiles?.first_name || ''} ${chat.profiles?.last_name || ''}`.trim();
        const companyName = chat.profiles?.company_name || '';
        return userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
               companyName.toLowerCase().includes(searchTerm.toLowerCase());
    });

    // Set up real-time subscription
    useEffect(() => {
        if (!isAdmin) return;

        const channel = supabase
            .channel('admin-support')
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'support_chats'
                }, 
                () => {
                    // Reload data when any support message changes
                    loadUserChats();
                    if (selectedUserId) {
                        loadUserMessages(selectedUserId);
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
    }, [isAdmin, selectedUserId]);

    // Load initial data
    useEffect(() => {
        if (isAdmin) {
            loadUserChats();
        }
    }, [isAdmin]);

    // Scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [selectedUserMessages]);

    if (!session) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-400">Please log in to access admin dashboard</p>
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <p className="text-red-400">Access Denied</p>
                    <p className="text-slate-400">You don't have permission to access the admin dashboard</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <Shield className="w-8 h-8 text-sky-400" />
                <h1 className="text-3xl font-bold text-white">Support Admin Dashboard</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[700px]">
                {/* User List */}
                <div className="lg:col-span-1 bg-slate-800 rounded-lg border border-slate-700 flex flex-col">
                    <div className="p-4 border-b border-slate-700">
                        <h2 className="text-lg font-semibold text-white mb-3">User Conversations</h2>
                        
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* User List */}
                    <div className="flex-1 overflow-y-auto">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-32">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-400"></div>
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="p-4 text-center text-slate-400">
                                <Users className="w-8 h-8 mx-auto mb-2" />
                                <p>No conversations found</p>
                            </div>
                        ) : (
                            filteredUsers.map((chat) => {
                                const userName = `${chat.profiles?.first_name || ''} ${chat.profiles?.last_name || ''}`.trim() || 'Unknown User';
                                return (
                                    <div
                                        key={chat.user_id}
                                        onClick={() => handleUserSelect(chat.user_id)}
                                        className={`p-4 border-b border-slate-700 cursor-pointer transition-colors ${
                                            selectedUserId === chat.user_id ? 'bg-sky-600/20' : 'hover:bg-slate-700/50'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-white font-medium truncate">{userName}</h3>
                                                <p className="text-slate-400 text-sm truncate">{chat.profiles?.company_name}</p>
                                                {chat.last_user_message_at && (
                                                    <p className="text-slate-500 text-xs">
                                                        Last message: {formatTimestamp(chat.last_user_message_at)}
                                                    </p>
                                                )}
                                            </div>
                                            {chat.unread_admin_messages > 0 && (
                                                <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                                                    {chat.unread_admin_messages}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="lg:col-span-2 bg-slate-800 rounded-lg border border-slate-700 flex flex-col">
                    {selectedUserId ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 border-b border-slate-700">
                                <h3 className="text-lg font-semibold text-white">
                                    {(() => {
                                        const selectedUser = userChats.find(chat => chat.user_id === selectedUserId);
                                        const userName = `${selectedUser?.profiles?.first_name || ''} ${selectedUser?.profiles?.last_name || ''}`.trim();
                                        return userName || 'Unknown User';
                                    })()}
                                </h3>
                                <p className="text-slate-400 text-sm">
                                    {userChats.find(chat => chat.user_id === selectedUserId)?.profiles?.company_name}
                                </p>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {selectedUserMessages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={`flex ${message.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                                message.sender === 'admin'
                                                    ? 'bg-green-600 text-white'
                                                    : 'bg-slate-700 text-slate-100'
                                            }`}
                                        >
                                            <p className="text-sm">{message.message}</p>

                                            {/* Attachment */}
                                            {message.attachment_url && (
                                                <div className="mt-2 p-2 bg-black/20 rounded flex items-center gap-2">
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
                                                <span className="text-xs opacity-75">
                                                    • {message.sender === 'admin' ? 'You' : 'User'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Reply Area */}
                            <div className="border-t border-slate-700 p-4">
                                {/* Selected File Preview */}
                                {selectedFile && (
                                    <div className="mb-3 p-3 bg-slate-700 rounded-lg flex items-center gap-3">
                                        {getFileIcon(selectedFile.name)}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white truncate">{selectedFile.name}</p>
                                            <p className="text-xs text-slate-400">
                                                {formatFileSize(selectedFile.size)}
                                            </p>
                                        </div>
                                        <button
                                            onClick={removeSelectedFile}
                                            className="text-slate-400 hover:text-white"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <div className="flex-1 relative">
                                        <textarea
                                            value={newReply}
                                            onChange={(e) => setNewReply(e.target.value)}
                                            onKeyPress={handleKeyPress}
                                            placeholder="Type your reply..."
                                            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none"
                                            rows="2"
                                            maxLength={MAX_MESSAGE_LENGTH}
                                            disabled={isSending}
                                        />
                                        <div className="absolute bottom-2 right-2 text-xs text-slate-400">
                                            {newReply.length}/{MAX_MESSAGE_LENGTH}
                                        </div>
                                    </div>

                                    {/* File Upload Button */}
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-slate-300 hover:text-white transition-colors"
                                        title="Attach file"
                                        disabled={isSending}
                                    >
                                        <FileText className="w-5 h-5" />
                                    </button>

                                    {/* Send Button */}
                                    <button
                                        onClick={sendReply}
                                        disabled={isSending || (!newReply.trim() && !selectedFile)}
                                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2 transition-colors"
                                    >
                                        {isSending ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        ) : (
                                            <Send className="w-4 h-4" />
                                        )}
                                        Reply
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
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <MessageSquare className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                                <p className="text-slate-400 text-lg">Select a user to view conversation</p>
                                <p className="text-slate-500 text-sm mt-2">
                                    Choose a user from the list to start managing their support messages
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminSupportPage; 