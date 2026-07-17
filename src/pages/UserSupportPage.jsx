import { useState, useEffect, useRef } from 'react';
import {
    Typography, Input, Button, Space, Tag, Avatar, Badge,
    Skeleton, Empty, Form, message
} from 'antd';
import {
    SendOutlined, InboxOutlined,
    ClockCircleOutlined, CheckCircleOutlined, PlusOutlined,
    ArrowLeftOutlined, UserOutlined,
    AuditOutlined
} from '@ant-design/icons';
import { submitSupportTicket, getMyTickets, getTicketMessages } from '../api/api';
import { getSocket } from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext';

const { Text, Title } = Typography;
const { TextArea } = Input;

const statusConfig = {
    open: { color: 'blue', label: 'Open', icon: <ClockCircleOutlined /> },
    replied: { color: 'green', label: 'Replied', icon: <CheckCircleOutlined /> },
    closed: { color: 'default', label: 'Closed', icon: <InboxOutlined /> },
};

// ─── Ticket list skeleton ─────────────────────────────────────────────────────
const TicketListSkeleton = () => (
    <div style={{ padding: '8px 0' }}>
        {[1, 2, 3].map(i => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '12px 14px', alignItems: 'center' }}>
                <Skeleton.Avatar active size={36} />
                <div style={{ flex: 1 }}>
                    <Skeleton.Input active size="small" style={{ width: '65%', marginBottom: 6, height: 12 }} />
                    <Skeleton.Input active size="small" style={{ width: '85%', height: 10 }} />
                </div>
            </div>
        ))}
    </div>
);

// ─── Chat messages skeleton ───────────────────────────────────────────────────
const ChatSkeleton = () => (
    <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <Skeleton.Avatar active size={30} />
            <Skeleton.Input active size="small" style={{ width: 200, height: 40, borderRadius: 12 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <Skeleton.Input active size="small" style={{ width: 160, height: 36, borderRadius: 12 }} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <Skeleton.Avatar active size={30} />
            <Skeleton.Input active size="small" style={{ width: 240, height: 52, borderRadius: 12 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <Skeleton.Input active size="small" style={{ width: 190, height: 44, borderRadius: 12 }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
            <Skeleton.Avatar active size={30} />
            <Skeleton.Input active size="small" style={{ width: 140, height: 36, borderRadius: 12 }} />
        </div>
    </div>
);

// ─── Chat bubble ──────────────────────────────────────────────────────────────
// On CR page: CR messages = white (right), Admin messages = green (left)
const Bubble = ({ msg, currentUserId }) => {
    const isMine = msg.sender_id === currentUserId;   // CR sent this
    const isAdmin = !isMine;                           // admin sent this → green

    return (
        <div style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
            {isAdmin && (
                <Avatar size={30} icon={<AuditOutlined />}
                    style={{ background: '#00b96b', marginRight: 8, flexShrink: 0, alignSelf: 'flex-end' }}
                />
            )}
            <div style={{
                maxWidth: '68%',
                background: isAdmin ? '#00b96b' : '#fff',          // admin=green, cr=white
                color: isAdmin ? '#fff' : '#1a1a1a',
                border: isAdmin ? 'none' : '1px solid #e8e8e8',
                borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                padding: '8px 12px',
                boxShadow: '0 1px 2px rgba(0,0,0,.07)',
                wordBreak: 'break-word',
            }}>
                {/* {isAdmin && (
                    <Text style={{ fontSize: 11, color: '#e0ffe0', fontWeight: 700, display: 'block', marginBottom: 2 }}>
                        {msg.sender?.name || 'Support'}
                    </Text>
                )} */}
                <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{msg.message}</div>
                <Text style={{ fontSize: 10, display: 'block', textAlign: 'right', marginTop: 3, color: isAdmin ? 'rgba(255,255,255,.65)' : '#aaa' }}>
                    {new Date(msg.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </div>
            {isMine && (
                <Avatar size={30} icon={<UserOutlined />}
                    style={{ background: '#d9d9d9', marginLeft: 8, flexShrink: 0, alignSelf: 'flex-end' }}
                />
            )}
        </div>
    );
};

// ─── Main page ────────────────────────────────────────────────────────────────
const UserSupportPage = () => {
    const { user } = useAuth();
    const socket = getSocket();

    const [tickets, setTickets] = useState([]);
    const [loadingTickets, setLoadingTickets] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form] = Form.useForm();

    // Active chat
    const [active, setActive] = useState(null);
    const [msgs, setMsgs] = useState([]);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [unread, setUnread] = useState({});

    const bottomRef = useRef(null);

    // ── Fetch ticket list ──────────────────────────────────────────────────────
    const fetchTickets = async () => {
        setLoadingTickets(true);
        try {
            const res = await getMyTickets();
            setTickets(res.data?.data || []);
        } catch {
            message.error('Failed to load tickets');
        } finally {
            setLoadingTickets(false);
        }
    };

    useEffect(() => {
        fetchTickets();

        // Global status updates (e.g. admin closes a ticket)
        const onStatus = ({ ticketId, status }) => {
            setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status } : t));
            setActive(prev => prev?.id === ticketId ? { ...prev, status } : prev);
        };
        socket.on('ticket_status_changed', onStatus);
        return () => socket.off('ticket_status_changed', onStatus);
    }, []);

    // ── Open chat ──────────────────────────────────────────────────────────────
    const openChat = async (ticket) => {
        if (active?.id === ticket.id) return;
        if (active) socket.emit('leave_support_ticket', { ticketId: active.id });

        setActive(ticket);
        setMsgs([]);
        setLoadingMsgs(true);
        setUnread(prev => ({ ...prev, [ticket.id]: 0 }));
        socket.emit('join_support_ticket', { ticketId: ticket.id });

        try {
            const res = await getTicketMessages(ticket.id);
            const payload = res.data?.data;
            // Backend may return the ticket object with nested messages, or a flat array
            const msgArray = Array.isArray(payload)
                ? payload
                : Array.isArray(payload?.messages)
                    ? payload.messages
                    : [];
            setMsgs(msgArray);
        } catch {
            message.error('Failed to load messages');
        } finally {
            setLoadingMsgs(false);
        }
    };

    // ── Incoming socket messages ───────────────────────────────────────────────
    useEffect(() => {
        const onMsg = (data) => {
            if (data.ticketId === active?.id) {
                setMsgs(prev => {
                    const idx = prev.findIndex(m => m._optimistic && m.message === data.message?.message);
                    if (idx !== -1) { const u = [...prev]; u[idx] = data.message; return u; }
                    return [...prev, data.message];
                });
                // Update status to replied if admin sent it
                if (data.message?.sender_id !== user.id) {
                    setActive(prev => prev ? { ...prev, status: 'replied' } : prev);
                    setTickets(prev => prev.map(t => t.id === data.ticketId ? { ...t, status: 'replied', _lastMsg: data.message?.message } : t));
                }
            } else {
                setUnread(prev => ({ ...prev, [data.ticketId]: (prev[data.ticketId] || 0) + 1 }));
                setTickets(prev => prev.map(t => t.id === data.ticketId ? { ...t, _lastMsg: data.message?.message } : t));
            }
        };
        socket.on('support_message', onMsg);
        return () => socket.off('support_message', onMsg);
    }, [active, user.id]);

    // ── Auto scroll ───────────────────────────────────────────────────────────
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [msgs]);

    // ── Send message ──────────────────────────────────────────────────────────
    const send = () => {
        const trimmed = text.trim();
        if (!trimmed || active?.status === 'closed') return;
        setSending(true);
        socket.emit('support_send_message', {
            ticketId: active.id,
            message: trimmed,
            senderId: user.id,
            senderRole: user.role,
        });
        setMsgs(prev => [...prev, {
            id: Date.now(), ticket_id: active.id,
            sender_id: user.id, sender: { name: user.name },
            message: trimmed, created_at: new Date().toISOString(),
            _optimistic: true,
        }]);
        setText('');
        setSending(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    };

    // ── Create ticket ─────────────────────────────────────────────────────────
    const handleSubmit = async (values) => {
        setSubmitting(true);
        try {
            const res = await submitSupportTicket({
                subject: values.subject.trim(),
                message: values.message.trim(),
            });
            message.success('Ticket created!');
            form.resetFields();
            setShowForm(false);
            const refreshed = await getMyTickets();
            const all = refreshed.data?.data || [];
            setTickets(all);
            // Auto-open the new ticket
            const newId = res.data?.data?.ticket_id;
            if (newId) {
                const found = all.find(t => t.id === newId);
                if (found) openChat(found);
            }
        } catch (err) {
            message.error(err.response?.data?.message || 'Failed to create ticket');
        } finally {
            setSubmitting(false);
        }
    };

    const openCount = tickets.filter(t => t.status === 'open').length;
    const repliedCount = tickets.filter(t => t.status === 'replied').length;    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="fade-in" style={{ height: 'calc(100vh - 112px)', display: 'flex', flexDirection: 'column' }}>

            {/* Page title */}
            <div style={{ marginBottom: 16, flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <Title level={4} style={{ margin: 0 }}>
                        <AuditOutlined style={{ marginRight: 8 }} />
                        Support
                    </Title>
                    <Text type="secondary">Send us a message — we'll get back to you shortly</Text>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowForm(v => !v)}>
                    New Ticket
                </Button>
            </div>

            {/* New ticket form (inline, collapsible) */}
            {showForm && (
                <div style={{
                    background: '#fff', border: '1px solid #e8e8e8', borderRadius: 10,
                    padding: '16px 20px', marginBottom: 16, flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(0,0,0,.06)'
                }}>
                    <Text strong style={{ display: 'block', marginBottom: 12 }}>New Support Ticket</Text>
                    <Form form={form} layout="vertical" onFinish={handleSubmit}>
                        <Form.Item name="subject" label="Subject" rules={[{ required: true, message: 'Enter a subject' }]} style={{ marginBottom: 10 }}>
                            <Input placeholder="What is your message about?" maxLength={255} showCount />
                        </Form.Item>
                        <Form.Item name="message" label="Message" rules={[{ required: true, message: 'Write a message' }]} style={{ marginBottom: 10 }}>
                            <TextArea placeholder="Describe your question or issue..." rows={3} showCount maxLength={3000} />
                        </Form.Item>
                        <div style={{ textAlign: 'right', paddingTop: '14px' }}>
                            <Space>
                                <Button onClick={() => { setShowForm(false); form.resetFields(); }}>Cancel</Button>
                                <Button type="primary" htmlType="submit" loading={submitting} icon={<SendOutlined />}>Send</Button>
                            </Space>
                        </div>
                    </Form>
                </div>
            )}

            {/* Chat shell */}
            <div style={{
                flex: 1, display: 'flex', border: '1px solid #e8e8e8',
                borderRadius: 12, overflow: 'hidden', background: '#fff',
                boxShadow: '0 2px 12px rgba(0,0,0,.06)', minHeight: 0,
            }}>

                {/* ── LEFT: ticket list ── */}
                <div style={{
                    width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column',
                    borderRight: '1px solid #f0f0f0', background: '#fafafa',
                }}>
                    <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #f0f0f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text strong style={{ fontSize: 14 }}>My Tickets</Text>
                            {/* <Space size={4}>
                                {openCount > 0 && <Badge count={openCount} style={{ backgroundColor: '#1677ff' }} />}
                                {repliedCount > 0 && <Badge count={repliedCount} style={{ backgroundColor: '#00b96b' }} />}
                            </Space> */}
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {loadingTickets ? (
                            <TicketListSkeleton />
                        ) : tickets.length === 0 ? (
                            <Empty description="No tickets yet" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ marginTop: 40 }} />
                        ) : (
                            tickets.map(ticket => {
                                const isActive = active?.id === ticket.id;
                                const cfg = statusConfig[ticket.status] || statusConfig.open;
                                const unreadCount = unread[ticket.id] || 0;
                                return (
                                    <div
                                        key={ticket.id}
                                        onClick={() => openChat(ticket)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            padding: '12px 14px', cursor: 'pointer',
                                            background: isActive ? '#E6F7EE' : 'transparent',
                                            borderLeft: isActive ? '3px solid #00b96b' : '3px solid transparent',
                                            transition: 'background .15s',
                                        }}
                                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f0f0f0'; }}
                                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                                    >
                                        <Badge count={unreadCount} size="small">
                                            <Avatar
                                                size={36}
                                                icon={<AuditOutlined />}
                                                style={{ background: ticket.status === 'replied' ? '#00b96b' : ticket.status === 'closed' ? '#bbb' : '#00b96b', flexShrink: 0 }}
                                            />
                                        </Badge>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Text style={{ fontSize: 13, fontWeight: 600 }} ellipsis>
                                                    {ticket.subject}
                                                </Text>
                                                <Text style={{ fontSize: 10, color: '#bbb', flexShrink: 0, marginLeft: 4 }}>
                                                    {new Date(ticket.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                                </Text>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                                                <Text type="secondary" style={{ fontSize: 11 }} ellipsis>
                                                    {ticket._lastMsg || 'Tap to open chat'}
                                                </Text>
                                                <Tag color={cfg.color} style={{ fontSize: 10, margin: 0, lineHeight: '16px', padding: '0 4px', flexShrink: 0 }}>
                                                    {cfg.label}
                                                </Tag>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* ── RIGHT: chat ── */}
                {!active ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
                        <AuditOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 12 }} />
                        <Text type="secondary" style={{ fontSize: 15 }}>Select a ticket to view the conversation</Text>
                        <Button type="primary" icon={<PlusOutlined />} style={{ marginTop: 16 }} onClick={() => setShowForm(true)}>
                            New Ticket
                        </Button>
                    </div>
                ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

                        {/* Chat header */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '12px 20px', borderBottom: '1px solid #f0f0f0',
                            background: '#fff', flexShrink: 0,
                        }}>
                            <Button type="text" icon={<ArrowLeftOutlined />} size="small"
                                onClick={() => setActive(null)} style={{ flexShrink: 0 }}
                            />
                            <Avatar size={36} icon={<AuditOutlined />} style={{ background: '#00b96b', flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <Text strong style={{ display: 'block', fontSize: 14 }} ellipsis>{active.subject}</Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>Ticket #{active.id}</Text>
                            </div>
                            <Tag color={statusConfig[active.status]?.color} icon={statusConfig[active.status]?.icon}>
                                {statusConfig[active.status]?.label}
                            </Tag>
                        </div>

                        {/* Messages */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: '#f6f7f9', minHeight: 0 }}>
                            {loadingMsgs ? (
                                <ChatSkeleton />
                            ) : msgs.length === 0 ? (
                                <div style={{ textAlign: 'center', marginTop: 60 }}>
                                    <Empty description="No messages yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                                </div>
                            ) : (
                                <>
                                    {(Array.isArray(msgs) ? msgs : []).map((m, i) => <Bubble key={m.id ?? i} msg={m} currentUserId={user.id} />)}
                                    <div ref={bottomRef} />
                                </>
                            )}
                        </div>

                        {/* Input */}
                        {active.status === 'closed' ? (
                            <div style={{ padding: '14px 20px', borderTop: '1px solid #f0f0f0', background: '#fff', textAlign: 'center', flexShrink: 0 }}>
                                <Tag icon={<InboxOutlined />} color="default" style={{ fontSize: 13, padding: '4px 12px' }}>
                                    This ticket is closed
                                </Tag>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', gap: 10, padding: '12px 16px', borderTop: '1px solid #f0f0f0', background: '#fff', alignItems: 'flex-end', flexShrink: 0 }}>
                                <TextArea
                                    value={text}
                                    onChange={e => setText(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Type your message… (Enter to send)"
                                    autoSize={{ minRows: 1, maxRows: 5 }}
                                    style={{ flex: 1, borderRadius: 22, resize: 'none', paddingTop: 8, paddingBottom: 8 }}
                                />
                                <Button
                                    type="primary"
                                    shape="circle"
                                    icon={<SendOutlined />}
                                    onClick={send}
                                    loading={sending}
                                    disabled={!text.trim()}
                                    style={{ flexShrink: 0, width: 40, height: 40 }}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserSupportPage;
