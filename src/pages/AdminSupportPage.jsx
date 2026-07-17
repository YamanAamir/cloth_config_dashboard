import { useState, useEffect, useRef } from 'react';
import {
    Typography, Input, Button, Space, Tag, Avatar, Badge,
    Skeleton, Empty, Popconfirm, message, notification, Row, Col, Card
} from 'antd';
import {
     SendOutlined, InboxOutlined,
    ClockCircleOutlined, CheckCircleOutlined, SearchOutlined, LockOutlined,
    UserOutlined,
    AuditOutlined
} from '@ant-design/icons';
import { adminGetAllTickets, adminGetTicketMessages, adminCloseTicket } from '../api/api';
import { getSocket } from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext';

const { Text, Title } = Typography;
const { TextArea } = Input;

const statusConfig = {
    open: { color: 'blue', label: 'Open', icon: <ClockCircleOutlined /> },
    closed: { color: 'default', label: 'Closed', icon: <InboxOutlined /> },
};

const getInitials = (name = '') =>
    name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

const avatarColor = (id) => {
    const colors = ['#00b96b'];
    return colors[(id || 0) % colors.length];
};

// ─── Ticket list skeleton (left panel) ───────────────────────────────────────
const TicketListSkeleton = () => (
    <div style={{ padding: '8px 0' }}>
        {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '12px 14px', alignItems: 'center' }}>
                <Skeleton.Avatar active size={38} />
                <div style={{ flex: 1 }}>
                    <Skeleton.Input active size="small" style={{ width: '70%', marginBottom: 6, height: 12 }} />
                    <Skeleton.Input active size="small" style={{ width: '90%', height: 10 }} />
                </div>
            </div>
        ))}
    </div>
);

// ─── Chat messages skeleton ────────────────────────────────────────────────────
const ChatSkeleton = () => (
    <div style={{ padding: '20px 24px' }}>
        {/* left bubble */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <Skeleton.Avatar active size={30} />
            <div>
                <Skeleton.Input active size="small" style={{ width: 180, height: 36, borderRadius: 12 }} />
            </div>
        </div>
        {/* right bubble */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <Skeleton.Input active size="small" style={{ width: 220, height: 44, borderRadius: 12 }} />
        </div>
        {/* left bubble */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <Skeleton.Avatar active size={30} />
            <div>
                <Skeleton.Input active size="small" style={{ width: 260, height: 56, borderRadius: 12 }} />
            </div>
        </div>
        {/* right bubble */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <Skeleton.Input active size="small" style={{ width: 150, height: 36, borderRadius: 12 }} />
        </div>
        {/* left bubble */}
        <div style={{ display: 'flex', gap: 8 }}>
            <Skeleton.Avatar active size={30} />
            <div>
                <Skeleton.Input active size="small" style={{ width: 200, height: 44, borderRadius: 12 }} />
            </div>
        </div>
    </div>
);

// ─── Chat bubble ──────────────────────────────────────────────────────────────
const Bubble = ({ msg, currentUserId }) => {
    const isMine = msg.sender_id === currentUserId;
    return (
        <div style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
            {!isMine && (
                <Avatar size={30} style={{ background: avatarColor(msg.sender_id), marginRight: 8, flexShrink: 0, alignSelf: 'flex-end', fontSize: 12 }}>
                    {getInitials(msg.sender?.name)}
                </Avatar>
            )}
            <div style={{
                maxWidth: '68%',
                background: isMine ? '#00b96b' : '#fff',
                color: isMine ? '#fff' : '#1a1a1a',
                border: isMine ? 'none' : '1px solid #e8e8e8',
                borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                padding: '8px 12px',
                boxShadow: '0 1px 2px rgba(0,0,0,.07)',
                wordBreak: 'break-word',
            }}>

                <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{msg.message}</div>
                <Text style={{ fontSize: 10, display: 'block', textAlign: 'right', marginTop: 3, color: isMine ? 'rgba(255,255,255,.65)' : '#aaa' }}>
                    {new Date(msg.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </div>
            {isMine && (
                <Avatar size={30} style={{ background: '#00b96b', marginLeft: 8, flexShrink: 0, alignSelf: 'flex-end', fontSize: 12 }}>
                    {/* {getInitials("Admin")} */}
                    <UserOutlined/>
                </Avatar>
            )}
        </div>
    );
};

// ─── Main page ────────────────────────────────────────────────────────────────
const AdminSupportPage = () => {
    const { user } = useAuth();
    const socket = getSocket();

    // All tickets (unfiltered) — source of truth for stats
    const [allTickets, setAllTickets] = useState([]);
    const [loadingTickets, setLoadingTickets] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');
    const [unread, setUnread] = useState({});

    // Active chat
    const [active, setActive] = useState(null);
    const [msgs, setMsgs] = useState([]);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [closing, setClosing] = useState(false);

    const bottomRef = useRef(null);

    // ── Derived: stats always from allTickets ──────────────────────────────────
    const stats = {
        open: allTickets.filter(t => t.status === 'open').length,
        closed: allTickets.filter(t => t.status === 'closed').length,
        total: allTickets.length,
    };

    // ── Derived: filtered display list ────────────────────────────────────────
    const displayTickets = allTickets.filter(t => {
        if (statusFilter && t.status !== statusFilter) return false;
        if (search) {
            const q = search.toLowerCase();
            return (
                t.subject?.toLowerCase().includes(q) ||
                t.user?.name?.toLowerCase().includes(q) ||
                t.user?.email?.toLowerCase().includes(q)
            );
        }
        return true;
    });

    // ── Fetch all tickets once ─────────────────────────────────────────────────
    const fetchTickets = async () => {
        setLoadingTickets(true);
        try {
            const res = await adminGetAllTickets({ page: 1, limit: 100 });
            setAllTickets(res.data?.data || []);
        } catch (err) {
            console.error('fetchTickets error:', err);
            message.error('Failed to load tickets');
        } finally {
            setLoadingTickets(false);
        }
    };

    useEffect(() => { fetchTickets(); }, []);

    // ── Socket: admin room ─────────────────────────────────────────────────────
    useEffect(() => {
        socket.emit('join_admin_support');

        const onNew = (data) => {
            notification.info({
                message: 'New support ticket',
                description: `${data.userName}: "${data.subject}"`,
                placement: 'topRight',
                duration: 5,
            });
            setAllTickets(prev => [data.ticket, ...prev]);
            setUnread(prev => ({ ...prev, [data.ticket.id]: (prev[data.ticket.id] || 0) + 1 }));
        };

        const onStatusChanged = ({ ticketId, status }) => {
            setAllTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status } : t));
            setActive(prev => (prev?.id === ticketId ? { ...prev, status } : prev));
        };

        socket.on('new_support_ticket', onNew);
        socket.on('ticket_status_changed', onStatusChanged);
        return () => {
            socket.off('new_support_ticket', onNew);
            socket.off('ticket_status_changed', onStatusChanged);
        };
    }, []);

    // ── Open a ticket / join room ──────────────────────────────────────────────
    const openChat = async (ticket) => {
        if (active?.id === ticket.id) return;
        if (active) socket.emit('leave_support_ticket', { ticketId: active.id });
        setActive(ticket);
        setMsgs([]);
        setLoadingMsgs(true);
        setUnread(prev => ({ ...prev, [ticket.id]: 0 }));
        socket.emit('join_support_ticket', { ticketId: ticket.id });

        try {
            const res = await adminGetTicketMessages(ticket.id);
            const payload = res.data?.data;
            setMsgs(
                Array.isArray(payload) ? payload
                    : Array.isArray(payload?.messages) ? payload.messages
                        : []
            );
        } catch {
            message.error('Failed to load messages');
        } finally {
            setLoadingMsgs(false);
        }
    };

    // ── Socket: incoming messages ──────────────────────────────────────────────
    useEffect(() => {
        const onMsg = (data) => {
            if (data.ticketId === active?.id) {
                setMsgs(prev => {
                    const idx = prev.findIndex(m => m._optimistic && m.message === data.message?.message);
                    if (idx !== -1) { const u = [...prev]; u[idx] = data.message; return u; }
                    return [...prev, data.message];
                });
            } else {
                setUnread(prev => ({ ...prev, [data.ticketId]: (prev[data.ticketId] || 0) + 1 }));
                setAllTickets(prev => prev.map(t =>
                    t.id === data.ticketId ? { ...t, _lastMsg: data.message?.message } : t
                ));
            }
        };
        socket.on('support_message', onMsg);
        return () => socket.off('support_message', onMsg);
    }, [active]);

    // ── Auto scroll ───────────────────────────────────────────────────────────
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [msgs]);

    // ── Send ──────────────────────────────────────────────────────────────────
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

    // ── Close ticket ──────────────────────────────────────────────────────────
    const handleClose = async () => {
        setClosing(true);
        try {
            await adminCloseTicket(active.id);
            socket.emit('close_ticket', { ticketId: active.id });
            setActive(prev => ({ ...prev, status: 'closed' }));
            setAllTickets(prev => prev.map(t => t.id === active.id ? { ...t, status: 'closed' } : t));
            message.success('Ticket closed');
        } catch {
            message.error('Failed to close ticket');
        } finally {
            setClosing(false);
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="fade-in" style={{ height: 'calc(100vh - 112px)', display: 'flex', flexDirection: 'column' }}>

            {/* Header */}
            <div style={{ marginBottom: 16, flexShrink: 0 }}>
                <Title level={4} style={{ margin: 0 }}>
                    <AuditOutlined style={{ marginRight: 8 }} />
                    Support
                </Title>
                <Text type="secondary">Manage and reply to class rep support tickets</Text>
            </div>

            {/* ── Stat cards ── */}
            <Row gutter={12} style={{ marginBottom: 16, flexShrink: 0 }}>
                {[
                    { key: '', label: 'Total', value: stats.total, color: '#595959', bg: '#fafafa' },
                    { key: 'open', label: 'Open', value: stats.open, color: '#1677ff', bg: '#e6f4ff' },
                    { key: 'closed', label: 'Closed', value: stats.closed, color: '#8c8c8c', bg: '#f5f5f5' },
                ].map(s => (
                    <Col xs={12} sm={5} key={s.key}>
                        <Card
                            size="small"
                            onClick={() => setStatusFilter(statusFilter === s.key ? '' : s.key)}
                            style={{
                                cursor: 'pointer',
                                border: statusFilter === s.key ? `1.5px solid ${s.color}` : '1px solid #e8e8e8',
                                borderRadius: 10,
                                background: statusFilter === s.key ? s.bg : '#fff',
                                transition: 'all .15s',
                            }}
                            styles={{ body: { padding: '12px 16px' } }}
                        >
                            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>{s.label}</Text>
                            <Text style={{ fontSize: 24, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</Text>
                        </Card>
                    </Col>
                ))}
            </Row>

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
                    <div style={{ padding: '12px 12px 10px', borderBottom: '1px solid #f0f0f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Text strong style={{ fontSize: 14 }}>
                                Tickets
                                {statusFilter && (
                                    <Tag
                                        closable
                                        onClose={() => setStatusFilter('')}
                                        color={statusConfig[statusFilter]?.color}
                                        style={{ marginLeft: 8, fontSize: 11 }}
                                    >
                                        {statusConfig[statusFilter]?.label}
                                    </Tag>
                                )}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>{displayTickets.length} shown</Text>
                        </div>
                        <Input
                            prefix={<SearchOutlined style={{ color: '#bbb' }} />}
                            placeholder="Search..."
                            size="small"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ borderRadius: 20 }}
                            allowClear
                        />
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {loadingTickets ? (
                            <TicketListSkeleton />
                        ) : displayTickets.length === 0 ? (
                            <Empty description="No tickets" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ marginTop: 40 }} />
                        ) : (
                            displayTickets.map(ticket => {
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
                                            background: isActive ? '#e6f7ee' : 'transparent',
                                            borderLeft: isActive ? '3px solid #00b96b' : '3px solid transparent',
                                            transition: 'background .15s',
                                        }}
                                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f0f0f0'; }}
                                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                                    >
                                        <Badge count={unreadCount} size="small">
                                            <Avatar size={38} style={{ background: avatarColor(ticket.user?.id), fontSize: 14, flexShrink: 0 }}>
                                                {getInitials(ticket.user?.name)}
                                            </Avatar>
                                        </Badge>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text strong style={{ fontSize: 13 }} ellipsis>{ticket.user?.name || '—'}</Text>
                                                <Text style={{ fontSize: 10, color: '#bbb', flexShrink: 0 }}>
                                                    {new Date(ticket.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                                </Text>
                                            </div>
                                            <Text style={{ fontSize: 12, color: '#555', display: 'block' }} ellipsis>{ticket.subject}</Text>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                                                <Text type="secondary" style={{ fontSize: 11 }} ellipsis>
                                                    {ticket._lastMsg || ticket.user?.school?.name || ''}
                                                </Text>
                                                <Tag color={cfg.color} style={{ fontSize: 10, margin: 0, lineHeight: '16px', padding: '0 4px' }}>
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
                        <AuditOutlined style={{ fontSize: 48, marginBottom: 12, color: '#d9d9d9' }} />
                        <Text type="secondary" style={{ fontSize: 15 }}>Select a ticket to start chatting</Text>
                    </div>
                ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

                        {/* Chat header */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '12px 20px', borderBottom: '1px solid #f0f0f0',
                            background: '#fff', flexShrink: 0,
                        }}>
                            <Avatar size={38} style={{ background: avatarColor(active.user?.id), fontSize: 14, flexShrink: 0 }}>
                                {getInitials(active.user?.name)}
                            </Avatar>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <Text strong style={{ display: 'block', fontSize: 14 }}>{active.user?.name}</Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {active.subject}
                                    {active.user?.school?.name ? ` · ${active.user.school.name}` : ''}
                                    {active.user?.class?.name ? ` · ${active.user.class.name}` : ''}
                                </Text>
                            </div>
                            <Space>
                                <Tag color={statusConfig[active.status]?.color} icon={statusConfig[active.status]?.icon} style={{ marginRight: 0 }}>
                                    {statusConfig[active.status]?.label}
                                </Tag>
                                {active.status !== 'closed' && (
                                    <Popconfirm
                                        title="Close this ticket?"
                                        description="The conversation will be marked as closed."
                                        onConfirm={handleClose}
                                        okText="Close" cancelText="Cancel" okType="danger"
                                    >
                                        <Button size="small" danger icon={<LockOutlined />} loading={closing}>Close</Button>
                                    </Popconfirm>
                                )}
                            </Space>
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
                                    {(Array.isArray(msgs) ? msgs : []).map((m, i) => (
                                        <Bubble key={m.id ?? i} msg={m} currentUserId={user.id} />
                                    ))}
                                    <div ref={bottomRef} />
                                </>
                            )}
                        </div>

                        {/* Input */}
                        {active.status === 'closed' ? (
                            <div style={{ padding: '14px 20px', borderTop: '1px solid #f0f0f0', background: '#fff', textAlign: 'center', flexShrink: 0 }}>
                                <Tag icon={<LockOutlined />} color="default" style={{ fontSize: 13, padding: '4px 12px' }}>
                                    This ticket is closed
                                </Tag>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', gap: 10, padding: '12px 16px', borderTop: '1px solid #f0f0f0', background: '#fff', alignItems: 'flex-end', flexShrink: 0 }}>
                                <TextArea
                                    value={text}
                                    onChange={e => setText(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Type a reply… (Enter to send, Shift+Enter for new line)"
                                    autoSize={{ minRows: 1, maxRows: 5 }}
                                    style={{ flex: 1, borderRadius: 22, resize: 'none', paddingTop: 8, paddingBottom: 8 }}
                                />
                                <Button
                                    type="primary" shape="circle" icon={<SendOutlined />}
                                    onClick={send} loading={sending} disabled={!text.trim()}
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

export default AdminSupportPage;
