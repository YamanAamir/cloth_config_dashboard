import React, { useState, useEffect } from 'react';
import {
    Table,
    Button,
    Card,
    Typography,
    Space,
    Modal,
    Form,
    Input,
    Switch,
    message,
    Popconfirm,
    Select,
    Tag,
    Drawer,
    Descriptions,
    Divider,
    Image,
    List,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined, BankOutlined, CalendarOutlined, UserAddOutlined, EyeOutlined, HistoryOutlined, UserOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';
import {
    getAllClasses,
    createClass,
    updateClass,
    deleteClass,
    toggleClassStatus,
    getAllSchools,
    getAllClassReps,
    assignClassRep,
    getAllOrders,
    getOrderDetails,
    getOrderHistory,
    getStudents,
    unlockOrder,
    lockOrder
} from '../api/api';
import { Status, Role } from '../utils/constants';
import { useAuth } from '../context/AuthContext';
import useSocket from '../hooks/useSocket';

const { Title } = Typography;
const { Option } = Select;

const OrderList = () => {
    const { user } = useAuth();
    const isClassRep = user?.role === Role.CLASS_REPRESENTATIVE;

    const [classes, setClasses] = useState([]);
    const [schools, setSchools] = useState([]);
    const [classReps, setClassReps] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState(null);
    const [selectedClass, setSelectedClass] = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
    const [drawerLoading, setDrawerLoading] = useState(false);
    const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
    const [orderHistory, setOrderHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [form] = Form.useForm();
    const [assignForm] = Form.useForm();
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

    const fetchDropdowns = async () => {
        try {
            const [schoolsRes, repsRes] = await Promise.all([
                getAllSchools({ limit: 1000 }),
                getAllClassReps({ limit: 1000 })
            ]);
            setSchools(schoolsRes.data.data || []);
            setClassReps(repsRes.data.data || []);
        } catch (error) {
            message.error('Failed to fetch dropdown data');
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [pagination.current, pagination.limit, pagination.search]);

    useEffect(() => {
        fetchDropdowns();
    }, []);

    // Real-time update: refresh orders when any student saves/pays
    useSocket('admin_room', 'new_order_admin', () => {
        console.log('🔔 Real-time: new order activity detected. Refreshing...');
        fetchOrders();
    });

    const handleAddEdit = async (values) => {
        try {
            const payload = {
                ...values,
                change_deadline: values.change_deadline ? new Date(values.change_deadline).toISOString() : null,
                status: values.status ? Status.ACTIVE : Status.INACTIVE
            };

            if (editingClass) {
                await updateClass(editingClass.id, payload);
                message.success('Class updated successfully');
            } else {
                await createClass(payload);
                message.success('Class created successfully');
            }
            setIsModalOpen(false);
            form.resetFields();
            setEditingClass(null);
            fetchOrders();
        } catch (error) {
            message.error(error.response?.data?.message || 'Operation failed');
        }
    };

    const handleAssignRep = async (values) => {
        try {
            const payload = {
                class_id: selectedClass.id,
                class_rep_id: values.class_rep_id
            };
            await assignClassRep(payload);
            message.success('Representative assigned successfully');
            setIsAssignModalOpen(false);
            assignForm.resetFields();
            fetchOrders();
        } catch (error) {
            message.error(error.response?.data?.message || 'Assignment failed');
        }
    }

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

    const handleDelete = async (id) => {
        try {
            await deleteClass(id);
            message.success('Class deleted successfully');
            fetchOrders();
        } catch (error) {
            message.error('Delete failed');
        }
    };

    const handleToggleStatus = async (record) => {
        try {
            const newStatus = record.status === Status.ACTIVE ? Status.INACTIVE : Status.ACTIVE;
            await toggleClassStatus(record.id, { status: newStatus });
            message.success(`Status updated for ${record.name}`);
            fetchOrders();
        } catch (error) {
            message.error('Status update failed');
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
            title: 'Order Items',
            key: 'order_items',
            width: 230,
            render: (_, record) => {
                const items = record.order_items || [];
                if (items.length === 0) return <span style={{ color: '#bbb', fontSize: 12 }}>No items placed</span>;
                return (
                    <Space direction="vertical" size={4}>
                        {items.map((item) => (
                            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <Tag
                                    color={item.status === 1 ? 'success' : 'warning'}
                                    style={{ fontSize: 10, margin: 0, lineHeight: '16px' }}
                                >
                                    {item.status === 1 ? '✓ PAID' : 'UNPAID'}
                                </Tag>
                                <span style={{ fontSize: 12 }}>
                                    {item.product_type}
                                    {item.selectedColor ? ` · ${item.selectedColor}` : ''}
                                    {item.selectedSize ? ` · ${item.selectedSize}` : ''}
                                </span>
                                <span style={{ fontSize: 11, color: '#888', marginLeft: 'auto' }}>
                                    {getItemPrice(item.product_type)} DKK
                                </span>
                            </div>
                        ))}
                    </Space>
                );
            },
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
                        icon={<EditOutlined style={{ color: '#fa8c16' }} />}
                        onClick={() => {
                            const classData = record.class || {};
                            const classId = classData.id || record.class_id;
                            if (!classId) { message.error('Class ID not found'); return; }
                            setEditingClass({ ...classData, id: classId, order_id: record.id });
                            form.setFieldsValue({
                                name: classData.name,
                                graduation_year: classData.graduation_year,
                                school_id: classData.school_id,
                                change_deadline: classData.change_deadline ? classData.change_deadline.split('T')[0] : undefined,
                                status: classData.status === Status.ACTIVE
                            });
                            setIsModalOpen(true);
                        }}
                        title="Edit Class"
                    />
                    <Button
                        type="text"
                        icon={<HistoryOutlined style={{ color: '#1890ff' }} />}
                        onClick={() => handleViewHistory(record.id)}
                        title="View History"
                    />
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

            {/* Create/Edit Modal */}
            <Modal
                title={editingClass ? "Edit Class" : "Add New Class"}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                destroyOnHidden
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleAddEdit}
                    initialValues={{ status: true }}
                    style={{ marginTop: 20 }}
                >
                    <Form.Item
                        name="name"
                        label="Class Name"
                        rules={[{ required: true, message: 'Please enter class name' }]}
                    >
                        <Input prefix={<TeamOutlined />} placeholder="e.g. Class of 2025 A" />
                    </Form.Item>

                    <Form.Item
                        name="graduation_year"
                        label="Graduation Year"
                        rules={[{ required: true, message: 'Please enter graduation year' }]}
                    >
                        <Input type="number" prefix={<CalendarOutlined />} placeholder="e.g. 2025" />
                    </Form.Item>

                    <Form.Item
                        name="change_deadline"
                        label="Ordering Deadline"
                        tooltip="The date when students can no longer place or edit orders"
                    >
                        <Input type="date" prefix={<CalendarOutlined />} />
                    </Form.Item>

                    <Form.Item
                        name="school_id"
                        label="Assign School"
                        rules={[{ required: true, message: 'Please select a school' }]}
                    >
                        <Select placeholder="Select a school">
                            {schools.map(school => (
                                <Option key={school.id} value={school.id}>{school.name}</Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item name="status" label="Status" valuePropName="checked">
                        <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
                            <Button type="primary" htmlType="submit">
                                {editingClass ? 'Update Class' : 'Create Class'}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Assign Representative Modal */}
            <Modal
                title={`Assign Representative to ${selectedClass?.name}`}
                open={isAssignModalOpen}
                onCancel={() => setIsAssignModalOpen(false)}
                footer={null}
                destroyOnHidden
            >
                <Form
                    form={assignForm}
                    layout="vertical"
                    onFinish={handleAssignRep}
                    style={{ marginTop: 20 }}
                >
                    <Form.Item
                        name="class_rep_id"
                        label="Select Representative"
                        rules={[{ required: true, message: 'Please select a representative' }]}
                    >
                        <Select
                            placeholder="Search and select representative"
                            showSearch
                            optionFilterProp="children"
                        >
                            {classReps.map(rep => (
                                <Option key={rep.id} value={rep.id}>
                                    {rep.name} ({rep.email}) - {rep.school?.name}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => setIsAssignModalOpen(false)}>Cancel</Button>
                            <Button type="primary" htmlType="submit">
                                Assign Representative
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

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

                        <Title level={5}>Order Items</Title>
                        <List
                            grid={{ gutter: 16, column: 1 }}
                            dataSource={selectedOrderDetails.order_items}
                            renderItem={(item) => (
                                <List.Item>
                                    <Card
                                        type="inner"
                                        title={`${item.product_type} - ${item.selectedColor}${item.selectedSize ? ` (${item.selectedSize})` : ''}`}
                                        extra={<Tag color="blue">{item.id}</Tag>}
                                    >
                                        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                                            <div style={{ flex: 1, minWidth: '300px' }}>
                                                <Descriptions bordered size="small" column={1}>
                                                    {item.design_config?.leftChestType && (
                                                        <Descriptions.Item label="Left Chest">
                                                            {item.design_config.leftChestType}: {item.design_config.leftChestText}
                                                            {item.design_config.leftChestFlag && ` (${item.design_config.leftChestFlag})`}
                                                        </Descriptions.Item>
                                                    )}
                                                    {item.design_config?.rightChestType && (
                                                        <Descriptions.Item label="Right Chest">
                                                            {item.design_config.rightChestType}: {item.design_config.rightChestText}
                                                            {item.design_config.rightChestFlag && ` (${item.design_config.rightChestFlag})`}
                                                        </Descriptions.Item>
                                                    )}
                                                    {item.design_config?.leftSleeveType && (
                                                        <Descriptions.Item label="Left Sleeve">
                                                            {item.design_config.leftSleeveType}: {item.design_config.leftSleeveText}
                                                            {item.design_config.leftSleeveFlag && ` (${item.design_config.leftSleeveFlag})`}
                                                        </Descriptions.Item>
                                                    )}
                                                    {item.design_config?.rightSleeveType && (
                                                        <Descriptions.Item label="Right Sleeve">
                                                            {item.design_config.rightSleeveType}: {item.design_config.rightSleeveText}
                                                            {item.design_config.rightSleeveFlag && ` (${item.design_config.rightSleeveFlag})`}
                                                        </Descriptions.Item>
                                                    )}
                                                </Descriptions>
                                            </div>

                                            {item.design_config?.backDesign?.src && (
                                                <div style={{ textAlign: 'center' }}>
                                                    <div style={{ marginBottom: 5, fontWeight: 'bold' }}>Back Design</div>
                                                    <Image
                                                        width={120}
                                                        src={item.design_config.backDesign.src}
                                                        fallback="https://via.placeholder.com/120?text=No+Design"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                </List.Item>
                            )}
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