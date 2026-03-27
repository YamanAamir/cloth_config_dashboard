import React, { useState, useEffect } from 'react';
import {
    Table, Button, Card, Typography, Space,
    Input, message, Popconfirm, Tag,
    Drawer, Descriptions, Divider, Image, List, Row, Col,
} from 'antd';
import { CalendarOutlined, EyeOutlined, HistoryOutlined, LockOutlined, UnlockOutlined, MailOutlined } from '@ant-design/icons';
import {
    getAllOrders,
    getOrderDetails,
    getOrderHistory,
    unlockOrder,
    lockOrder,
    sendDeadlineReminder
} from '../api/api';
import { Status, Role } from '../utils/constants';
import { useAuth } from '../context/AuthContext';
import useSocket from '../hooks/useSocket';

const { Title } = Typography;

const OrderList = () => {
    const { user } = useAuth();
    const isClassRep = user?.role === Role.CLASS_REPRESENTATIVE;

    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
    const [drawerLoading, setDrawerLoading] = useState(false);
    const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
    const [orderHistory, setOrderHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [pagination, setPagination] = useState({
        current: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
        search: '',
    });

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const response = await getAllOrders({
                page: pagination.current,
                limit: pagination.limit,
                search: pagination.search,
            });
            const { limit, page, total, totalPages } = response.data.pagination || {};
            setClasses(response.data.data || []);
            setPagination(prev => ({
                ...prev,
                limit: limit ?? prev.limit,
                current: page ?? prev.current,
                total: total ?? (response.data.data?.length || 0),
                totalPages: totalPages ?? 1,
            }));
        } catch (error) {
            message.error('Failed to fetch orders');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [pagination.current, pagination.limit, pagination.search]);

    // Real-time update
    useSocket('admin_room', 'new_order_admin', () => {
        fetchOrders();
    });

    const handleView = async (record) => {
        setDrawerLoading(true);
        setIsDrawerOpen(true);
        try {
            const response = await getOrderDetails(record.id);
            setSelectedOrderDetails(response.data.data);
        } catch (error) {
            message.error('Failed to fetch order details');
            setIsDrawerOpen(false);
        } finally {
            setDrawerLoading(false);
        }
    };

    const handleViewHistory = async (orderId) => {
        setHistoryLoading(true);
        setHistoryDrawerOpen(true);
        try {
            const response = await getOrderHistory(orderId);
            setOrderHistory(response.data.data || []);
        } catch (error) {
            message.error('Failed to fetch order history');
            setHistoryDrawerOpen(false);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleSendReminder = async (classId) => {
        try {
            await sendDeadlineReminder(classId);
            message.success('Deadline reminder email sent successfully');
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to send reminder');
        }
    };

    const handleToggleLock = async (record) => {
        try {
            if (record.is_locked) {
                await unlockOrder(record.id);
                message.success('Order unlocked successfully');
            } else {
                await lockOrder(record.id);
                message.success('Order locked successfully');
            }
            fetchOrders();
        } catch (error) {
            message.error(error.response?.data?.message || 'Lock toggle failed');
        }
    };

    // Shared price map for display
    const ITEM_PRICES = {
        'T-SHIRT': 200, 'SWEATSHIRT': 350, 'HOODIE': 450,
        'ZIPPERHOODIE': 500, 'SWEATPANTS': 300, 'SHORTS': 250,
    };
    const getItemPrice = (type) => ITEM_PRICES[type?.toUpperCase()] || 0;

    const columns = [
        {
            title: 'Student',
            key: 'student',
            width: 180,
            render: (_, record) => (
                <Space direction="vertical" size={0}>
                    <strong style={{ fontSize: 13 }}>{record.student?.name || '-'}</strong>
                    <span style={{ fontSize: 11, color: '#888' }}>{record.student?.email}</span>
                </Space>
            ),
        },
        {
            title: 'Class',
            key: 'class_name',
            width: 150,
            render: (_, record) => (
                <Space direction="vertical" size={0}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{record.class?.name || '-'}</span>
                    {record.class?.graduation_year && (
                        <span style={{ fontSize: 11, color: '#888' }}>Class of {record.class.graduation_year}</span>
                    )}
                    {record.class?.change_deadline && (() => {
                        const isPast = new Date() > new Date(record.class.change_deadline);
                        return (
                            <Tag color={isPast ? 'volcano' : 'blue'} style={{ marginTop: 2, fontSize: 10 }}>
                                <CalendarOutlined style={{ marginRight: 2 }} />
                                {new Date(record.class.change_deadline).toLocaleDateString()}
                            </Tag>
                        );
                    })()}
                </Space>
            ),
        },
        {
            title: 'Financials',
            key: 'financials',
            width: 140,
            render: (_, record) => {
                const total = parseFloat(record.total_amount || 0);
                const paid = parseFloat(record.amount_paid || 0);
                const balance = Math.max(0, total - paid);
                const isFullyPaid = paid >= total && total > 0;
                return (
                    <Space direction="vertical" size={2}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{total} DKK</div>
                        <div style={{ fontSize: 11, color: isFullyPaid ? '#52c41a' : '#faad14' }}>
                            Paid: {paid} DKK
                        </div>
                        {!isFullyPaid && total > 0 && (
                            <div style={{ fontSize: 11, color: '#ff4d4f' }}>Due: {balance} DKK</div>
                        )}
                    </Space>
                );
            },
        },
        {
            title: 'Status',
            key: 'combined_status',
            width: 130,
            render: (_, record) => {
                const pStatus = record.process_status;
                const payStatus = record.payment_status;

                const pColorMap = {
                    saved: 'blue', in_progress: 'processing',
                    completed: 'success', partial_paid: 'cyan',
                };
                const payColorMap = { unpaid: 'error', partial: 'warning', paid: 'success' };

                return (
                    <Space direction="vertical" size={4}>
                        <Tag color={pColorMap[pStatus] || 'default'} style={{ fontSize: 11 }}>
                            {pStatus?.replace(/_/g, ' ').toUpperCase() || 'UNKNOWN'}
                        </Tag>
                        <Tag color={payColorMap[payStatus] || 'default'} style={{ fontSize: 10 }}>
                            {payStatus?.toUpperCase() || 'UNPAID'}
                        </Tag>
                    </Space>
                );
            },
        },
        {
            title: 'Lock',
            key: 'is_locked',
            width: 120,
            render: (_, record) => {
                const now = new Date();
                const isPastDeadline = record.class?.change_deadline && now > new Date(record.class.change_deadline);
                const isPastEditWindow = record.edit_deadline && now > new Date(record.edit_deadline);

                if (record.is_locked) return <Tag color="error" style={{ fontWeight: 600 }}>Locked (Manual)</Tag>;
                if (isPastDeadline) return <Tag color="error" style={{ fontWeight: 600 }}>Locked (Deadline)</Tag>;
                if (record.payment_status === 'paid' && isPastEditWindow) return <Tag color="volcano">Edit Window Done</Tag>;

                return (
                    <Space direction="vertical" size={2}>
                        <Tag color="success">Open</Tag>
                        {record.edit_deadline && (
                            <span style={{ fontSize: 10, color: '#888' }}>
                                Edit until: {new Date(record.edit_deadline).toLocaleDateString()}
                            </span>
                        )}
                    </Space>
                );
            },
        },
        {
            title: 'Action',
            key: 'action',
            width: 130,
            render: (_, record) => (
                <Space size="small">
                    <Button
                        type="text"
                        icon={<EyeOutlined style={{ color: '#00b96b' }} />}
                        onClick={() => handleView(record)}
                        title="View Order Details"
                    />
                    <Button
                        type="text"
                        icon={<HistoryOutlined style={{ color: '#1890ff' }} />}
                        onClick={() => handleViewHistory(record.id)}
                        title="View History"
                    />
                    <Popconfirm
                        title="Send deadline reminder email to this student?"
                        onConfirm={() => handleSendReminder(record.class_id)}
                        okText="Send" cancelText="No"
                    >
                        <Button
                            type="text"
                            icon={<MailOutlined style={{ color: '#722ed1' }} />}
                            title="Send Deadline Reminder"
                        />
                    </Popconfirm>
                    <Popconfirm
                        title={`${record.is_locked ? 'Unlock' : 'Lock'} this order?`}
                        onConfirm={() => handleToggleLock(record)}
                        okText="Yes" cancelText="No"
                    >
                        <Button
                            type="text"
                            icon={record.is_locked
                                ? <UnlockOutlined style={{ color: '#52c41a' }} />
                                : <LockOutlined style={{ color: '#d9d9d9' }} />}
                            title={record.is_locked ? 'Unlock Order' : 'Lock Order'}
                        />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <Title level={4} style={{ margin: 0 }}>Orders</Title>
                    <Typography.Text type="secondary">Manage class orders and statuses</Typography.Text>
                </div>
            </div>

            <Card className="glass-card" style={{ border: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                    <Input.Search
                        placeholder="Search student or class name"
                        allowClear
                        enterButton
                        style={{ width: 300 }}
                        onChange={(e) => {
                            const value = e.target.value;
                            clearTimeout(window.searchTimerOrders);
                            window.searchTimerOrders = setTimeout(() => {
                                setPagination(prev => ({ ...prev, current: 1, search: value }));
                            }, 500);
                        }}
                    />
                </div>
                <Table
                    columns={columns}
                    dataSource={classes}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        current: pagination.current,
                        pageSize: pagination.limit,
                        total: pagination.total,
                        showSizeChanger: true,
                        showTotal: (total, range) =>
                            `Showing ${range[0]}-${range[1]} of ${total} (Page ${pagination.current} of ${pagination.totalPages})`,
                        onChange: (page, pageSize) => {
                            setPagination(prev => ({
                                ...prev,
                                current: page,
                                limit: pageSize,
                            }));
                        },
                    }}
                />
            </Card>

            {/* Order Details Drawer */}
            <Drawer
                title={`Order Details - #${selectedOrderDetails?.id}`}
                placement="right"
                size="large"
                onClose={() => setIsDrawerOpen(false)}
                open={isDrawerOpen}
                loading={drawerLoading}
                className="order-details-drawer"
            >
                {selectedOrderDetails && (
                    <div style={{ padding: '0 10px' }}>
                        <Descriptions title="Order Info" bordered column={2}>
                            <Descriptions.Item label="Order ID">{selectedOrderDetails.id}</Descriptions.Item>
                            <Descriptions.Item label="Status">
                                <Tag color={selectedOrderDetails.process_status === 'completed' ? 'success' : 'processing'}>
                                    {selectedOrderDetails.process_status.toUpperCase()}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Locked">
                                {(() => {
                                    const isPastDeadline = selectedOrderDetails.class?.change_deadline && new Date() > new Date(selectedOrderDetails.class.change_deadline);
                                    const isLocked = selectedOrderDetails.is_locked || isPastDeadline;
                                    return (
                                        <Tag color={isLocked ? 'error' : 'success'}>
                                            {isLocked ? (isPastDeadline && !selectedOrderDetails.is_locked ? 'YES (AUTO-LOCKED)' : 'YES') : 'NO'}
                                        </Tag>
                                    );
                                })()}
                            </Descriptions.Item>
                            <Descriptions.Item label="Deadline">
                                {selectedOrderDetails.class?.change_deadline ? (
                                    <Tag color={new Date() > new Date(selectedOrderDetails.class.change_deadline) ? 'volcano' : 'blue'}>
                                        {new Date(selectedOrderDetails.class.change_deadline).toLocaleString()}
                                    </Tag>
                                ) : '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Created At">
                                {new Date(selectedOrderDetails.created_at).toLocaleString()}
                            </Descriptions.Item>
                        </Descriptions>

                        <Divider />

                        <Descriptions title="Student & Class" bordered column={2}>
                            <Descriptions.Item label="Student Name">{selectedOrderDetails.student?.name}</Descriptions.Item>
                            <Descriptions.Item label="Student Email">{selectedOrderDetails.student?.email}</Descriptions.Item>
                            <Descriptions.Item label="Class Name">{selectedOrderDetails.class?.name}</Descriptions.Item>
                            <Descriptions.Item label="Graduation Year">{selectedOrderDetails.class?.graduation_year}</Descriptions.Item>
                        </Descriptions>

                        <Divider />

                        {selectedOrderDetails.delivery_details && (
                            <>
                                <Descriptions title="Delivery Details" bordered column={2}>
                                    {Object.entries(JSON.parse(selectedOrderDetails.delivery_details)).map(([key, value]) => (
                                        <Descriptions.Item key={key} label={key.charAt(0).toUpperCase() + key.slice(1)}>
                                            {value || '-'}
                                        </Descriptions.Item>
                                    ))}
                                </Descriptions>
                                <Divider />
                            </>
                        )}

                        <Title level={5}>Order Items ({selectedOrderDetails.order_items?.length || 0})</Title>
                        <List
                            grid={{ gutter: 16, column: 1 }}
                            dataSource={selectedOrderDetails.order_items}
                            renderItem={(item) => {
                                const d = item.design_config || {};
                                const hasLeftChest = d.leftChestText;
                                const hasRightChest = d.rightChestText;
                                const hasLeftSleeve = d.leftSleeveText;
                                const hasRightSleeve = d.rightSleeveText;
                                return (
                                <List.Item>
                                    <Card
                                        type="inner"
                                        title={
                                            <Space wrap>
                                                <Tag color="blue">{item.product_type}</Tag>
                                                <Tag color="default">{item.selectedColor}</Tag>
                                                {item.selectedSize && <Tag color="cyan">Size: {item.selectedSize}</Tag>}
                                                <Tag color={item.status === 1 ? 'success' : 'warning'}>
                                                    {item.status === 1 ? '✓ PAID' : 'UNPAID'}
                                                </Tag>
                                            </Space>
                                        }
                                        extra={<span style={{ color: '#888', fontSize: 12 }}>#{item.id}</span>}
                                    >
                                        <Row gutter={[16, 16]}>
                                            <Col xs={24} md={d.backDesign?.src ? 16 : 24}>
                                                <Descriptions bordered size="small" column={1}>
                                                    {hasLeftChest && (
                                                        <Descriptions.Item label="Left Chest">
                                                            {d.leftChestText}
                                                            {d.leftChestFlag && <Tag style={{ marginLeft: 6 }}>{d.leftChestFlag}</Tag>}
                                                        </Descriptions.Item>
                                                    )}
                                                    {hasRightChest && (
                                                        <Descriptions.Item label="Right Chest">
                                                            {d.rightChestText}
                                                            {d.rightChestFlag && <Tag style={{ marginLeft: 6 }}>{d.rightChestFlag}</Tag>}
                                                        </Descriptions.Item>
                                                    )}
                                                    {hasLeftSleeve && (
                                                        <Descriptions.Item label="Left Sleeve">
                                                            {d.leftSleeveText}
                                                            {d.leftSleeveFlag && <Tag style={{ marginLeft: 6 }}>{d.leftSleeveFlag}</Tag>}
                                                        </Descriptions.Item>
                                                    )}
                                                    {hasRightSleeve && (
                                                        <Descriptions.Item label="Right Sleeve">
                                                            {d.rightSleeveText}
                                                            {d.rightSleeveFlag && <Tag style={{ marginLeft: 6 }}>{d.rightSleeveFlag}</Tag>}
                                                        </Descriptions.Item>
                                                    )}
                                                    {!hasLeftChest && !hasRightChest && !hasLeftSleeve && !hasRightSleeve && (
                                                        <Descriptions.Item label="Print Areas">
                                                            <span style={{ color: '#bbb' }}>No text added</span>
                                                        </Descriptions.Item>
                                                    )}
                                                </Descriptions>
                                            </Col>
                                            {d.backDesign?.src && (
                                                <Col xs={24} md={8} style={{ textAlign: 'center' }}>
                                                    <div style={{ marginBottom: 6, fontWeight: 600, fontSize: 12, color: '#666' }}>Back Design</div>
                                                    <Image
                                                        width={120}
                                                        src={d.backDesign.src}
                                                        style={{ borderRadius: 6, border: '1px solid #f0f0f0' }}
                                                        fallback="https://via.placeholder.com/120?text=No+Design"
                                                    />
                                                </Col>
                                            )}
                                        </Row>
                                    </Card>
                                </List.Item>
                                );
                            }}
                        />
                    </div>
                )}
            </Drawer>

            {/* Order History Drawer */}
            <Drawer
                title="Order History & Versions"
                placement="right"
                size="large"
                onClose={() => setHistoryDrawerOpen(false)}
                open={historyDrawerOpen}
                loading={historyLoading}
            >
                {orderHistory.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40 }}>
                        <HistoryOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
                        <div style={{ color: '#999' }}>No history available</div>
                    </div>
                ) : (
                    <List
                        dataSource={orderHistory}
                        renderItem={(item) => {
                            const prevItems = item.changes?.previousItems || [];
                            const prevTotal = item.changes?.previousTotal;
                            const prevDelivery = item.changes?.previousDelivery
                                ? (typeof item.changes.previousDelivery === 'string'
                                    ? JSON.parse(item.changes.previousDelivery)
                                    : item.changes.previousDelivery)
                                : null;

                            const actionColorMap = {
                                created: 'green',
                                updated: 'orange',
                                payment_initiation: 'purple',
                                payment_received: 'cyan',
                            };

                            return (
                                <List.Item key={item.id}>
                                    <Card style={{ width: '100%' }} size="small">
                                        <Space direction="vertical" style={{ width: '100%' }} size="small">
                                            {/* Header Row */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                                <Space>
                                                    <Tag color="blue">V{item.version}</Tag>
                                                    <Tag color={actionColorMap[item.action] || 'default'}>
                                                        {item.action?.toUpperCase().replace(/_/g, ' ')}
                                                    </Tag>
                                                </Space>
                                                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                                    {new Date(item.created_at).toLocaleString()}
                                                </Typography.Text>
                                            </div>

                                            {item.changes_summary && (
                                                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                                    {item.changes_summary}
                                                </Typography.Text>
                                            )}

                                            <Divider style={{ margin: '8px 0' }} />

                                            <Descriptions size="small" column={2} bordered>
                                                <Descriptions.Item label="Changed By">
                                                    User #{item.changed_by || '-'}
                                                </Descriptions.Item>
                                                {prevTotal != null && (
                                                    <Descriptions.Item label="Amount at Version">
                                                        <strong>{prevTotal} DKK</strong>
                                                    </Descriptions.Item>
                                                )}
                                                {prevDelivery?.city && (
                                                    <Descriptions.Item label="Delivery (City)" span={2}>
                                                        {prevDelivery.city}, {prevDelivery.country || ''}
                                                    </Descriptions.Item>
                                                )}
                                            </Descriptions>

                                            {/* Per-item breakdown */}
                                            {prevItems.length > 0 && (
                                                <div style={{ marginTop: 8 }}>
                                                    <Typography.Text strong style={{ fontSize: 12 }}>Garments in this version:</Typography.Text>
                                                    <List
                                                        size="small"
                                                        style={{ marginTop: 6 }}
                                                        dataSource={prevItems}
                                                        renderItem={(orderItem) => {
                                                            const isPaymentAction = item.action === 'payment_received' || item.action === 'payment_initiation';
                                                            return (
                                                                <List.Item
                                                                    style={{ padding: '6px 0' }}
                                                                    extra={isPaymentAction ? (
                                                                        <Tag color={orderItem.status === 1 ? 'success' : 'warning'} style={{ margin: 0, fontSize: 10 }}>
                                                                            {orderItem.status === 1 ? 'PAID' : 'UNPAID'}
                                                                        </Tag>
                                                                    ) : null}
                                                                >
                                                                    <Typography.Text style={{ fontSize: 12 }}>
                                                                        <strong>{orderItem.product_type}</strong>
                                                                        {orderItem.selectedColor && ` · ${orderItem.selectedColor}`}
                                                                        {orderItem.selectedSize && ` · Size: ${orderItem.selectedSize}`}
                                                                    </Typography.Text>
                                                                </List.Item>
                                                            );
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </Space>
                                    </Card>
                                </List.Item>
                            );
                        }}
                    />
                )}
            </Drawer>
        </div>
    );
};

export default OrderList;