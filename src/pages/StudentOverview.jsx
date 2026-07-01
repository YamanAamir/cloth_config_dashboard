import React, { useState, useEffect } from 'react';
import {
    Table, Card, Typography, Space, Input, Tag,
    message, Avatar, Drawer, Descriptions, Divider, Button,
    Row, Col, List, Image,
} from 'antd';
import {
    UserOutlined, SearchOutlined, EyeOutlined,
    CheckCircleOutlined, ClockCircleOutlined,
    CloseCircleOutlined, MinusCircleOutlined
} from '@ant-design/icons';
import { getStudents, adminGetStudentDetails } from '../api/api';

const { Title, Text } = Typography;

// ── Order status helpers ──────────────────────────────────────────────────────

const ORDER_STATUS_MAP = {
    completed:        { label: 'Gennemført',       color: 'success',    icon: <CheckCircleOutlined /> },
    in_progress:      { label: 'I gang',            color: 'processing', icon: <ClockCircleOutlined /> },
    pending_payment:  { label: 'Afventer betaling', color: 'warning',    icon: <ClockCircleOutlined /> },
    saved:            { label: 'Gemt',              color: 'blue',       icon: <ClockCircleOutlined /> },
    paid:             { label: 'Betalt',            color: 'success',    icon: <CheckCircleOutlined /> },
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
            const res = await adminGetStudentDetails(record.id);
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

    // ── Print area helper ────────────────────────────────────────────────────

    const renderPrintArea = (label, area) => {
        if (!area) return null;
        const hasContent = area.text || area.flag || area.flagUrl || area.logoUrl || area.logo;
        if (!hasContent) return null;
        return (
            <Descriptions.Item label={label} key={label}>
                <Space wrap size={6} align="center">
                    {area.flagUrl && (
                        <img src={area.flagUrl} alt={area.flag}
                            style={{ width: 30, height: 20, objectFit: 'cover', borderRadius: 2, border: '1px solid #eee', verticalAlign: 'middle' }} />
                    )}
                    {area.flag && <Tag style={{ margin: 0 }}>{area.flag}</Tag>}
                    {area.logoUrl && (
                        <img src={area.logoUrl} alt={area.logo}
                            style={{ width: 30, height: 30, objectFit: 'contain', borderRadius: 3, border: '1px solid #eee', background: '#fafafa', verticalAlign: 'middle' }} />
                    )}
                    {area.logo && !area.logoUrl && (
                        <Tag color="purple" style={{ margin: 0 }}>{area.logo}</Tag>
                    )}
                    {area.text && (
                        <span style={{
                            background: '#f5f5f5', border: '1px solid #ddd',
                            padding: '1px 8px', borderRadius: 3, fontSize: 12,
                        }}>
                            {area.text}
                        </span>
                    )}
                </Space>
            </Descriptions.Item>
        );
    };

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
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
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
                    </Space>
                }
                open={drawerOpen}
                onClose={() => { setDrawerOpen(false); setDrawerStudent(null); }}
                width={520}
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
                            <Descriptions.Item label="Skole">
                                {drawerStudent.school?.name || '—'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Klasse">
                                <Tag color="blue">{drawerStudent.class?.name || '—'}</Tag>
                                {drawerStudent.class?.graduation_year && (
                                    <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>
                                        Klasse af {drawerStudent.class.graduation_year}
                                    </Text>
                                )}
                            </Descriptions.Item>
                        </Descriptions>

                        <Divider />

                        {/* Order info — from first order */}
                        {(() => {
                            const firstOrder = drawerStudent.orders?.[0];
                            const orderStatus   = firstOrder?.process_status || drawerStudent.order_status;
                            const paymentStatus = firstOrder?.payment_status  || drawerStudent.payment_status;
                            const totalAmount   = firstOrder?.total_amount    ?? drawerStudent.total_amount;
                            const amountPaid    = firstOrder?.amount_paid     ?? drawerStudent.amount_paid;
                            const orderId       = firstOrder?.id              || drawerStudent.order_id;
                            const balanceDue    = firstOrder?.balance_due;
                            const editWindow    = firstOrder?.edit_window_open;

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
                                        {amountPaid != null ? `${amountPaid} DKK` : '—'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Samlet beløb">
                                        {totalAmount != null ? `${totalAmount} DKK` : '—'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Restbeløb">
                                        {balanceDue != null
                                            ? <Text type={Number(balanceDue) > 0 ? 'danger' : 'success'}>{balanceDue} DKK</Text>
                                            : '—'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Ordre-ID">
                                        {orderId ? `#${orderId}` : '—'}
                                    </Descriptions.Item>
                                    {firstOrder != null && (
                                        <Descriptions.Item label="Redigeringsvindue">
                                            <Tag color={editWindow ? 'success' : 'default'}>
                                                {editWindow ? 'Åben' : 'Lukket'}
                                            </Tag>
                                        </Descriptions.Item>
                                    )}
                                </Descriptions>
                            );
                        })()}

                        {/* All orders */}
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
                                        style={{ marginBottom: 12, background: '#fafafa' }}
                                        title={
                                            <Space wrap>
                                                <span style={{ fontWeight: 600 }}>Ordre #{order.id}</span>
                                                <Tag color="blue">
                                                    {order.process_status?.replace(/_/g, ' ').toUpperCase() || 'UNKNOWN'}
                                                </Tag>
                                            </Space>
                                        }
                                    >
                                        {/* Payment summary */}
                                        <Space wrap style={{ marginBottom: 8 }}>
                                            <PaymentTag status={order.payment_status} />
                                            <Text style={{ fontSize: 12 }}>
                                                {order.amount_paid ?? 0} / {order.total_amount ?? '—'} DKK
                                            </Text>
                                        </Space>

                                        {/* Delivery location */}
                                        {order.delivery_details && (
                                            <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
                                                📍 {[
                                                    order.delivery_details.address,
                                                    order.delivery_details.city,
                                                    order.delivery_details.postalCode,
                                                    order.delivery_details.country,
                                                ].filter(Boolean).join(', ')}
                                            </div>
                                        )}

                                        {/* Order items */}
                                        {Array.isArray(order.order_items) && order.order_items.length > 0 && (
                                            <>
                                                <Divider style={{ margin: '8px 0' }} />
                                                <List
                                                    size="small"
                                                    dataSource={order.order_items}
                                                    renderItem={(item) => {
                                                        const d = item.design_config || {};
                                                        const isSweatpants = item.product_type?.toUpperCase() === 'SWEATPANTS';

                                                        const printRows = isSweatpants
                                                            ? [
                                                                renderPrintArea('Left Leg',  { text: d.leftLegText,  flag: d.leftLegFlag,  flagUrl: d.leftLegFlagUrl,  logo: d.leftLegLogoCustom  || d.leftLegLogoPredefined }),
                                                                renderPrintArea('Right Leg', { text: d.rightLegText, flag: d.rightLegFlag, flagUrl: d.rightLegFlagUrl, logo: d.rightLegLogoCustom || d.rightLegLogoPredefined }),
                                                            ].filter(Boolean)
                                                            : [
                                                                renderPrintArea('Left Chest',   { text: d.leftChestText,   flag: d.leftChestFlag,   flagUrl: d.leftChestFlagUrl,  logo: d.leftChestLogoCustom   || d.leftChestLogoPredefined }),
                                                                renderPrintArea('Right Chest',  { text: d.rightChestText,  flag: d.rightChestFlag,  flagUrl: d.rightChestFlagUrl, logo: d.rightChestLogoCustom  || d.rightChestLogoPredefined }),
                                                                renderPrintArea('Left Sleeve',  { text: d.leftSleeveText,  flag: d.leftSleeveFlag,  flagUrl: d.leftSleeveFlagUrl  || d.leftSleeveFlagUrl2,  logo: d.leftSleeveLogoCustom  || d.leftSleeveLogoPredefined,  logoUrl: d.leftSleeveLogoPredefinedUrl }),
                                                                renderPrintArea('Right Sleeve', { text: d.rightSleeveText, flag: d.rightSleeveFlag, flagUrl: d.rightSleeveFlagUrl || d.rightSleeveFlagUrl2, logo: d.rightSleeveLogoCustom || d.rightSleeveLogoPredefined, logoUrl: d.rightSleeveLogoPredefinedUrl }),
                                                            ].filter(Boolean);

                                                        return (
                                                            <List.Item key={item.id} style={{ padding: '8px 0' }}>
                                                                <div style={{ width: '100%' }}>
                                                                    <Space wrap style={{ marginBottom: 6 }}>
                                                                        <Tag color="blue">{item.product_type}</Tag>
                                                                        <Tag color="default">{item.selectedColor}</Tag>
                                                                        {item.selectedSize && <Tag color="cyan">Size: {item.selectedSize}</Tag>}
                                                                        {item.price != null && (
                                                                            <Text style={{ fontSize: 12, color: '#888' }}>{item.price} DKK</Text>
                                                                        )}
                                                                    </Space>

                                                                    <Row gutter={[8, 8]}>
                                                                        <Col xs={24} md={d.backDesign?.src ? 16 : 24}>
                                                                            {printRows.length > 0 ? (
                                                                                <Descriptions bordered size="small" column={1}>
                                                                                    {printRows}
                                                                                </Descriptions>
                                                                            ) : (
                                                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                                                    Ingen printområder konfigureret
                                                                                </Text>
                                                                            )}
                                                                        </Col>
                                                                        {d.backDesign?.src && (
                                                                            <Col xs={24} md={8} style={{ textAlign: 'center' }}>
                                                                                <div style={{ fontSize: 11, color: '#666', marginBottom: 4, fontWeight: 600 }}>
                                                                                    Back Design
                                                                                </div>
                                                                                <Image
                                                                                    width={80}
                                                                                    src={d.backDesign.src}
                                                                                    style={{ borderRadius: 4, border: '1px solid #f0f0f0' }}
                                                                                    fallback="https://via.placeholder.com/80?text=No+Design"
                                                                                />
                                                                            </Col>
                                                                        )}
                                                                    </Row>
                                                                </div>
                                                            </List.Item>
                                                        );
                                                    }}
                                                />
                                            </>
                                        )}
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
