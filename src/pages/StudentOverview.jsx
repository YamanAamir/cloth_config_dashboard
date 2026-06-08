import React, { useState, useEffect } from 'react';
import {
    Table, Card, Typography, Space, Input, Tag,
    message, Avatar, Drawer, Descriptions, Divider, Button
} from 'antd';
import {
    UserOutlined, SearchOutlined, EyeOutlined,
    CheckCircleOutlined, ClockCircleOutlined,
    CloseCircleOutlined, MinusCircleOutlined
} from '@ant-design/icons';
import { getStudents, crGetStudentDetails } from '../api/api';

const { Title, Text } = Typography;

// ── Order status helpers ──────────────────────────────────────────────────────

const ORDER_STATUS_MAP = {
    completed:        { label: 'Gennemført',       color: 'success',    icon: <CheckCircleOutlined /> },
    in_progress:      { label: 'I gang',            color: 'processing', icon: <ClockCircleOutlined /> },
    pending_payment:  { label: 'Afventer betaling', color: 'warning',    icon: <ClockCircleOutlined /> },
    saved:            { label: 'Gemt',              color: 'blue',       icon: <ClockCircleOutlined /> },
    cancelled:        { label: 'Annulleret',        color: 'error',      icon: <CloseCircleOutlined /> },
    no_order:         { label: 'Ingen ordre',       color: 'default',    icon: <MinusCircleOutlined /> },
};

const PAYMENT_STATUS_MAP = {
    paid:    { label: 'Betalt',         color: 'success' },
    partial: { label: 'Delbetalt',      color: 'warning' },
    unpaid:  { label: 'Ikke betalt',    color: 'error' },
};

const OrderStatusTag = ({ status }) => {
    const cfg = ORDER_STATUS_MAP[status] || { label: status || 'Ukendt', color: 'default' };
    return <Tag color={cfg.color} icon={cfg.icon}>{cfg.label}</Tag>;
};

const PaymentTag = ({ status }) => {
    if (!status) return <Text type="secondary">—</Text>;
    const cfg = PAYMENT_STATUS_MAP[status] || { label: status, color: 'default' };
    return <Tag color={cfg.color}>{cfg.label}</Tag>;
};

// ── Component ─────────────────────────────────────────────────────────────────

const StudentOverview = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({
        current: 1, limit: 15, total: 0, totalPages: 1, search: '',
    });

    // Summary counts
    const [summary, setSummary] = useState({
        total: 0, completed: 0, inProgress: 0, noOrder: 0, awaitingPayment: 0,
    });

    // Detail drawer
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerStudent, setDrawerStudent] = useState(null);
    const [drawerLoading, setDrawerLoading] = useState(false);

    // ── Fetch ───────────────────────────────────────────────────────────────

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const res = await getStudents({
                page: pagination.current,
                limit: pagination.limit,
                search: pagination.search || undefined,
            });
            const data = res.data?.data || [];
            const pg = res.data?.pagination || {};
            setStudents(data);
            setPagination(prev => ({
                ...prev,
                total: pg.total ?? data.length,
                totalPages: pg.totalPages ?? 1,
            }));

            // Compute summary
            setSummary({
                total: pg.total ?? data.length,
                completed: data.filter(s => s.order_status === 'completed').length,
                inProgress: data.filter(s => ['in_progress', 'saved'].includes(s.order_status)).length,
                awaitingPayment: data.filter(s => s.order_status === 'pending_payment').length,
                noOrder: data.filter(s => !s.order_status || s.order_status === 'no_order').length,
            });
        } catch {
            message.error('Kunne ikke hente elever');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStudents(); }, [
        pagination.current, pagination.limit, pagination.search
    ]);

    // ── Drawer ──────────────────────────────────────────────────────────────

    const openDrawer = async (record) => {
        setDrawerStudent(record);
        setDrawerOpen(true);
        setDrawerLoading(true);
        try {
            const res = await crGetStudentDetails(record.id);
            setDrawerStudent(res.data?.data || res.data || record);
        } catch {
            // fall back to list data
        } finally {
            setDrawerLoading(false);
        }
    };

    // ── Columns ─────────────────────────────────────────────────────────────

    const columns = [
        {
            title: '#',
            key: 'sno',
            width: 50,
            render: (_, __, idx) =>
                (pagination.current - 1) * pagination.limit + idx + 1,
        },
        {
            title: 'Elev',
            dataIndex: 'name',
            key: 'name',
            render: (name, record) => (
                <Space>
                    <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#00b96b' }} />
                    <button
                        onClick={() => openDrawer(record)}
                        style={{
                            background: 'none', border: 'none', padding: 0,
                            cursor: 'pointer', fontWeight: 600, color: '#1677ff',
                        }}
                    >
                        {name}
                    </button>
                </Space>
            ),
        },
        {
            title: 'E-mail',
            dataIndex: 'email',
            key: 'email',
            render: val => val || <Text type="secondary">—</Text>,
        },
        {
            title: 'Ordrestatus',
            key: 'order_status',
            render: (_, r) => {
                const s = r.order_status;
                if (!s || s === 'no_order') return <Tag color="default" icon={<MinusCircleOutlined />}>Ingen ordre</Tag>;
                return <OrderStatusTag status={s} />;
            },
        },
        {
            title: 'Betaling',
            key: 'payment_status',
            render: (_, r) => <PaymentTag status={r.payment_status} />,
        },
        {
            title: 'Betalt / Total',
            key: 'amount',
            render: (_, r) => {
                if (r.total_amount == null) return <Text type="secondary">—</Text>;
                const balance = Number(r.total_amount) - Number(r.amount_paid ?? 0);
                return (
                    <Space direction="vertical" size={0}>
                        <Text>{r.amount_paid ?? 0} / {r.total_amount}</Text>
                        {balance > 0 && (
                            <Text type="danger" style={{ fontSize: 11 }}>
                                Mangler: {balance}
                            </Text>
                        )}
                    </Space>
                );
            },
        },
        {
            title: '',
            key: 'actions',
            width: 48,
            render: (_, record) => (
                <Button
                    type="text"
                    icon={<EyeOutlined style={{ color: '#1677ff' }} />}
                    onClick={() => openDrawer(record)}
                />
            ),
        },
    ];

    // ── Summary cards ────────────────────────────────────────────────────────

    const summaryCards = [
        { label: 'Elever i alt',        value: summary.total,          color: '#1677ff' },
        { label: 'Gennemført',           value: summary.completed,       color: '#52c41a' },
        { label: 'I gang / Gemt',        value: summary.inProgress,      color: '#faad14' },
        { label: 'Afventer betaling',    value: summary.awaitingPayment, color: '#fa8c16' },
        { label: 'Ingen ordre endnu',    value: summary.noOrder,         color: '#bfbfbf' },
    ];

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="fade-in">
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>Elevers oversigt</Title>
                <Text type="secondary">
                    Se alle elevers ordrestatus og betalingsoverblik for din klasse
                </Text>
            </div>

            {/* Summary strip */}
            <div style={{
                display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap',
            }}>
                {summaryCards.map(c => (
                    <Card
                        key={c.label}
                        size="small"
                        style={{ flex: '1 1 140px', minWidth: 120, border: 'none', background: '#fafafa' }}
                    >
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 26, fontWeight: 700, color: c.color }}>{c.value}</div>
                            <Text type="secondary" style={{ fontSize: 11 }}>{c.label}</Text>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Table */}
            <Card className="glass-card" style={{ border: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                    <Input
                        placeholder="Søg elevers navn..."
                        prefix={<SearchOutlined />}
                        allowClear
                        style={{ width: 280 }}
                        onChange={(e) => {
                            const val = e.target.value;
                            clearTimeout(window._crStudentSearch);
                            window._crStudentSearch = setTimeout(() => {
                                setPagination(prev => ({ ...prev, current: 1, search: val }));
                            }, 400);
                        }}
                    />
                </div>

                <Table
                    columns={columns}
                    dataSource={students}
                    rowKey="id"
                    loading={loading}
                    scroll={{ x: 700 }}
                    locale={{ emptyText: 'Ingen elever fundet' }}
                    pagination={{
                        current: pagination.current,
                        pageSize: pagination.limit,
                        total: pagination.total,
                        showSizeChanger: true,
                        showTotal: (total, range) =>
                            `Viser ${range[0]}–${range[1]} af ${total}`,
                        onChange: (page, pageSize) =>
                            setPagination(prev => ({ ...prev, current: page, limit: pageSize })),
                    }}
                />
            </Card>

            {/* ── Detail Drawer ─────────────────────────────────────────────── */}
            <Drawer
                title={
                    <Space>
                        <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#00b96b' }} />
                        <span>{drawerStudent?.name || 'Elevdetaljer'}</span>
                        {drawerStudent && (
                            <OrderStatusTag status={drawerStudent.order_status || 'no_order'} />
                        )}
                    </Space>
                }
                open={drawerOpen}
                onClose={() => { setDrawerOpen(false); setDrawerStudent(null); }}
                width={460}
            >
                {drawerLoading ? (
                    <div style={{ textAlign: 'center', padding: 48, color: '#bbb' }}>
                        Indlæser...
                    </div>
                ) : drawerStudent ? (
                    <>
                        {/* Personal */}
                        <Descriptions
                            title="Personlige oplysninger"
                            column={1}
                            size="small"
                            bordered
                            style={{ marginBottom: 24 }}
                        >
                            <Descriptions.Item label="Navn">{drawerStudent.name || '—'}</Descriptions.Item>
                            <Descriptions.Item label="E-mail">{drawerStudent.email || '—'}</Descriptions.Item>
                            <Descriptions.Item label="Telefon">
                                {drawerStudent.phone_number || drawerStudent.phone || '—'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Fødselsår">
                                {drawerStudent.year_of_birth || '—'}
                            </Descriptions.Item>
                        </Descriptions>

                        <Divider />

                        {/* Order info */}
                        {(() => {
                            const ord = drawerStudent.orders && !Array.isArray(drawerStudent.orders)
                                ? drawerStudent.orders : null;
                            const orderStatus   = drawerStudent.order_status   || ord?.process_status;
                            const paymentStatus = drawerStudent.payment_status || ord?.payment_status;
                            const totalAmount   = drawerStudent.total_amount   ?? ord?.total_amount;
                            const amountPaid    = drawerStudent.amount_paid    ?? ord?.amount_paid;
                            const orderId       = drawerStudent.order_id       || ord?.id;
                            const balance = totalAmount != null && amountPaid != null
                                ? Number(totalAmount) - Number(amountPaid) : null;

                            return (
                                <Descriptions
                                    title="Ordreoplysninger"
                                    column={1}
                                    size="small"
                                    bordered
                                    style={{ marginBottom: 24 }}
                                >
                                    <Descriptions.Item label="Ordrestatus">
                                        <OrderStatusTag status={orderStatus || 'no_order'} />
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Betalingsstatus">
                                        <PaymentTag status={paymentStatus} />
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Betalt beløb">
                                        {amountPaid != null ? amountPaid : '—'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Samlet beløb">
                                        {totalAmount != null ? totalAmount : '—'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Restbeløb">
                                        {balance != null
                                            ? <Text type={balance > 0 ? 'danger' : 'success'}>{balance}</Text>
                                            : '—'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Ordre-ID">
                                        {orderId ? `#${orderId}` : '—'}
                                    </Descriptions.Item>
                                </Descriptions>
                            );
                        })()}

                        {/* Full orders array — if details API returns it */}
                        {Array.isArray(drawerStudent.orders) && drawerStudent.orders.length > 0 && (
                            <>
                                <Divider />
                                <Title level={5} style={{ marginBottom: 12 }}>
                                    Alle ordrer ({drawerStudent.orders.length})
                                </Title>
                                {drawerStudent.orders.map(order => (
                                    <Card
                                        key={order.id}
                                        size="small"
                                        style={{ marginBottom: 8, background: '#fafafa' }}
                                    >
                                        <Descriptions column={2} size="small">
                                            <Descriptions.Item label="Ordre #">{order.id}</Descriptions.Item>
                                            <Descriptions.Item label="Status">
                                                <OrderStatusTag
                                                    status={order.order_status || order.process_status || 'no_order'}
                                                />
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Betaling">
                                                <PaymentTag status={order.payment_status} />
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Beløb">
                                                {order.amount_paid ?? 0} / {order.total_amount ?? '—'}
                                            </Descriptions.Item>
                                        </Descriptions>
                                    </Card>
                                ))}
                            </>
                        )}
                    </>
                ) : null}
            </Drawer>
        </div>
    );
};

export default StudentOverview;
