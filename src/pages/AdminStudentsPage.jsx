import React, { useState, useEffect } from 'react';
import {
    Table, Card, Typography, Space, Button, Input,
    message, Modal, Tag, Select, Avatar, Drawer,
    Descriptions, Dropdown, Divider
} from 'antd';
import {
    UserOutlined, DeleteOutlined, ExclamationCircleOutlined,
    SearchOutlined, EyeOutlined, MoreOutlined, WarningOutlined
} from '@ant-design/icons';
import {
    adminGetStudents, adminGetStudentDetails,
    adminDeleteStudent, adminPermanentDeleteStudent,
    getAllClasses, getAllSchools,
} from '../api/api';

const { Title, Text } = Typography;

const ORDER_STATUS_OPTIONS = [
    { label: 'All', value: '' },
    { label: 'Saved', value: 'saved' },
    { label: 'Completed', value: 'completed' },
    { label: 'No Order', value: 'no_order' },
];

const STUDENT_STATUS_OPTIONS = [
    { label: 'All', value: '' },
    { label: 'Active', value: 0 },
    { label: 'Inactive', value: 1 },
    ];

const AdminStudentsPage = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);

    const [schools, setSchools] = useState([]);
    const [classes, setClasses] = useState([]);

    const [search, setSearch] = useState('');
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [selectedClass, setSelectedClass] = useState(null);
    const [studentStatus, setStudentStatus] = useState('');
    const [orderStatus, setOrderStatus] = useState('');

    const [pagination, setPagination] = useState({ current: 1, limit: 15, total: 0, totalPages: 1 });

    // Drawer state
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerStudent, setDrawerStudent] = useState(null);
    const [drawerLoading, setDrawerLoading] = useState(false);

    // ─── Fetch ───────────────────────────────────────────────────────────────────

    const fetchSchools = async () => {
        try {
            const res = await getAllSchools({ limit: 1000 });
            setSchools(res.data?.data || []);
        } catch { /* silent */ }
    };

    const fetchClasses = async (schoolId) => {
        try {
            const res = await getAllClasses({ school_id: schoolId || undefined, limit: 1000 });
            setClasses(res.data?.data || []);
        } catch { /* silent */ }
    };

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const body = { page: pagination.current, limit: pagination.limit };
            if (search) body.search = search;
            if (selectedSchool) body.school_id = selectedSchool;
            if (selectedClass) body.class_id = selectedClass;
            if (studentStatus !== '') body.status = studentStatus;
            if (orderStatus) body.order_status = orderStatus;

            const res = await adminGetStudents(body);
            setStudents(res.data?.data || []);
            const pg = res.data?.pagination || {};
            setPagination(prev => ({
                ...prev,
                total: pg.total ?? (res.data?.data?.length || 0),
                totalPages: pg.totalPages ?? 1,
            }));
        } catch {
            message.error('Failed to fetch students');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSchools(); fetchClasses(); }, []);

    useEffect(() => {
        fetchClasses(selectedSchool || undefined);
        setSelectedClass(null);
    }, [selectedSchool]);

    useEffect(() => {
        setPagination(prev => ({ ...prev, current: 1 }));
    }, [search, selectedSchool, selectedClass, studentStatus, orderStatus]);

    useEffect(() => { fetchStudents(); }, [
        pagination.current, pagination.limit,
        search, selectedSchool, selectedClass, studentStatus, orderStatus
    ]);

    // ─── Drawer ──────────────────────────────────────────────────────────────────

    const openDrawer = async (record) => {
        // Show basic info immediately from list data
        setDrawerStudent(record);
        setDrawerOpen(true);
        setDrawerLoading(true);
        try {
            const res = await adminGetStudentDetails(record.id);
            setDrawerStudent(res.data?.data || res.data || record);
        } catch {
            // keep the list-level data
        } finally {
            setDrawerLoading(false);
        }
    };

    // ─── Delete actions ──────────────────────────────────────────────────────────

    const handleSoftDelete = (record) => {
        Modal.confirm({
            title: `Delete "${record.name}"?`,
            icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
            content: (
                <div>
                    <p>This will <b>soft delete</b> the student.</p>
                    <ul style={{ color: '#faad14', paddingLeft: 20, margin: '8px 0' }}>
                        <li>Student account will be deactivated</li>
                        <li>All unpaid orders will be soft deleted</li>
                        <li>Paid / partial-paid orders will be preserved</li>
                    </ul>
                    <p>An admin can reverse this if needed.</p>
                </div>
            ),
            okText: 'Yes, Delete',
            cancelText: 'Cancel',
            okButtonProps: { danger: true },
            centered: true,
            onOk: async () => {
                try {
                    await adminDeleteStudent(record.id);
                    message.success(`${record.name} deleted`);
                    setDrawerOpen(false);
                    fetchStudents();
                } catch (err) {
                    message.error(err.response?.data?.message || 'Delete failed');
                }
            },
        });
    };

    const handlePermanentDelete = (record) => {
        Modal.confirm({
            title: `Permanently delete "${record.name}"?`,
            icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
            content: (
                <div>
                    <p><b>This action cannot be undone.</b></p>
                    <ul style={{ color: '#ff4d4f', paddingLeft: 20, margin: '8px 0' }}>
                        <li>Student account and all personal data</li>
                        <li>All order records (paid and unpaid)</li>
                        <li>All associated files and uploads</li>
                    </ul>
                    <p style={{ color: '#ff4d4f', fontWeight: 600 }}>
                        Blocked if any order records exist.
                    </p>
                </div>
            ),
            okText: 'Yes, Permanently Delete',
            cancelText: 'Cancel',
            okButtonProps: { danger: true },
            centered: true,
            onOk: async () => {
                try {
                    await adminPermanentDeleteStudent(record.id);
                    message.success(`${record.name} permanently deleted`);
                    setDrawerOpen(false);
                    fetchStudents();
                } catch (err) {
                    message.error(err.response?.data?.message || 'Permanent delete failed');
                }
            },
        });
    };

    // ─── Columns ─────────────────────────────────────────────────────────────────

    const columns = [
        {
            title: 'Student',
            dataIndex: 'name',
            key: 'name',
            render: (name, record) => (
                <Space>
                    <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#00b96b' }} />
                    <button
                        onClick={() => openDrawer(record)}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 600, color: '#1677ff' }}
                    >
                        {name}
                    </button>
                </Space>
            ),
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            render: val => val || <Text type="secondary">—</Text>,
        },
        {
            title: 'School',
            key: 'school',
            render: (_, r) => r.school?.name || <Text type="secondary">—</Text>,
        },
        {
            title: 'Class',
            key: 'class',
            render: (_, r) => r.class?.name
                ? <Tag color="blue">{r.class.name}</Tag>
                : <Text type="secondary">—</Text>,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                if (status === 2) return <Tag color="error">Deleted</Tag>;
                if (status === 1) return <Tag color="warning">Inactive</Tag>;
                return <Tag color="success">Active</Tag>;
            },
        },
        {
            title: '',
            key: 'actions',
            align: 'center',
            width: 48,
            render: (_, record) => {
                const menuItems = [
                    {
                        key: 'view',
                        label: 'View Details',
                        icon: <EyeOutlined />,
                        onClick: () => openDrawer(record),
                    },
                    { type: 'divider' },
                    {
                        key: 'soft-delete',
                        label: 'Delete',
                        icon: <DeleteOutlined />,
                        disabled: record.status === 2,
                        onClick: () => handleSoftDelete(record),
                    },
                    {
                        key: 'perm-delete',
                        label: 'Permanent Delete',
                        icon: <WarningOutlined />,
                        danger: true,
                        onClick: () => handlePermanentDelete(record),
                    },
                ];
                return (
                    <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
                        <Button type="text" icon={<MoreOutlined />} />
                    </Dropdown>
                );
            },
        },
    ];

    // ─── Render ──────────────────────────────────────────────────────────────────

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>Student Management</Title>
                <Text type="secondary">Search and manage students across all schools and classes</Text>
            </div>

            {/* Filters */}
            <Card style={{ marginBottom: 16, border: 'none' }} className="glass-card">
                <Space wrap>
                    <Input
                        placeholder="Search name or email..."
                        prefix={<SearchOutlined />}
                        style={{ width: 220 }}
                        allowClear
                        onChange={(e) => {
                            const val = e.target.value;
                            clearTimeout(window._studentSearchTimer);
                            window._studentSearchTimer = setTimeout(() => setSearch(val), 400);
                        }}
                    />
                    <Select
                        placeholder="Filter by School"
                        allowClear
                        showSearch
                        style={{ width: 200 }}
                        options={schools.map(s => ({ label: s.name, value: s.id }))}
                        onChange={(val) => setSelectedSchool(val ?? null)}
                        filterOption={(input, opt) =>
                            opt.label.toLowerCase().includes(input.toLowerCase())
                        }
                    />
                    <Select
                        placeholder="Filter by Class"
                        allowClear
                        showSearch
                        style={{ width: 200 }}
                        value={selectedClass}
                        options={classes.map(c => ({ label: c.name, value: c.id }))}
                        onChange={(val) => setSelectedClass(val ?? null)}
                        filterOption={(input, opt) =>
                            opt.label.toLowerCase().includes(input.toLowerCase())
                        }
                    />
                    <Select
                        placeholder="Student Status"
                        style={{ width: 160 }}
                        defaultValue=""
                        options={STUDENT_STATUS_OPTIONS}
                        onChange={(val) => setStudentStatus(val)}
                    />
                    <Select
                        placeholder="Order Status"
                        style={{ width: 160 }}
                        defaultValue=""
                        options={ORDER_STATUS_OPTIONS}
                        onChange={(val) => setOrderStatus(val)}
                    />
                </Space>
            </Card>

            <Card className="glass-card" style={{ border: 'none' }}>
                <Table
                    columns={columns}
                    dataSource={students}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        current: pagination.current,
                        pageSize: pagination.limit,
                        total: pagination.total,
                        showSizeChanger: true,
                        showTotal: (total, range) =>
                            `Showing ${range[0]}-${range[1]} of ${total}`,
                        onChange: (page, pageSize) =>
                            setPagination(prev => ({ ...prev, current: page, limit: pageSize })),
                    }}
                    locale={{ emptyText: 'No students found. Adjust filters to search.' }}
                />
            </Card>

            {/* ── Student Detail Drawer ─────────────────────────────────────── */}
            <Drawer
                title={
                    <Space>
                        <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#00b96b' }} />
                        <span>{drawerStudent?.name || 'Student Details'}</span>
                        {drawerStudent && (
                            drawerStudent.status === 2 ? <Tag color="error">Deleted</Tag> :
                            drawerStudent.status === 1 ? <Tag color="warning">Inactive</Tag> :
                            <Tag color="success">Active</Tag>
                        )}
                    </Space>
                }
                open={drawerOpen}
                onClose={() => { setDrawerOpen(false); setDrawerStudent(null); }}
                width={480}
                extra={
                    <Space>
                        <Button
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            disabled={drawerStudent?.status === 2}
                            onClick={() => drawerStudent && handleSoftDelete(drawerStudent)}
                        >
                            Delete
                        </Button>
                        <Button
                            danger
                            type="primary"
                            size="small"
                            icon={<WarningOutlined />}
                            onClick={() => drawerStudent && handlePermanentDelete(drawerStudent)}
                        >
                            Permanent Delete
                        </Button>
                    </Space>
                }
            >
                {drawerLoading ? (
                    <div style={{ textAlign: 'center', padding: 48, color: '#bbb' }}>Loading...</div>
                ) : drawerStudent ? (
                    <>
                        {/* Personal Info */}
                        <Descriptions
                            title="Personal Information"
                            column={1}
                            size="small"
                            bordered
                            style={{ marginBottom: 24 }}
                        >
                            <Descriptions.Item label="Name">{drawerStudent.name || '—'}</Descriptions.Item>
                            <Descriptions.Item label="Email">{drawerStudent.email || '—'}</Descriptions.Item>
                            <Descriptions.Item label="Phone">{drawerStudent.phone_number || drawerStudent.phone || '—'}</Descriptions.Item>
                            <Descriptions.Item label="Year of Birth">{drawerStudent.year_of_birth || '—'}</Descriptions.Item>
                            <Descriptions.Item label="School">{drawerStudent.school?.name || '—'}</Descriptions.Item>
                            <Descriptions.Item label="Class">
                                {drawerStudent.class?.name
                                    ? <Tag color="blue">{drawerStudent.class.name}</Tag>
                                    : '—'}
                            </Descriptions.Item>
                        </Descriptions>

                        <Divider />

                        {/* Order Info — from list-level fields or nested orders object */}
                        {(() => {
                            const ord = drawerStudent.orders && !Array.isArray(drawerStudent.orders)
                                ? drawerStudent.orders
                                : null;
                            const orderStatus = drawerStudent.order_status || ord?.process_status;
                            const paymentStatus = drawerStudent.payment_status || ord?.payment_status;
                            const totalAmount = drawerStudent.total_amount ?? ord?.total_amount;
                            const amountPaid = drawerStudent.amount_paid ?? ord?.amount_paid;
                            const orderId = drawerStudent.order_id || ord?.id;

                            return (
                                <Descriptions
                                    title="Order Information"
                                    column={1}
                                    size="small"
                                    bordered
                                    style={{ marginBottom: 24 }}
                                >
                                    <Descriptions.Item label="Order Status">
                                        {orderStatus
                                            ? <Tag color={{ completed: 'success', in_progress: 'processing', saved: 'processing', pending_payment: 'warning', cancelled: 'error' }[orderStatus] || 'default'}>
                                                {orderStatus.replace(/_/g, ' ')}
                                              </Tag>
                                            : '—'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Payment Status">
                                        {paymentStatus
                                            ? <Tag color={{ paid: 'success', partial: 'warning', unpaid: 'default' }[paymentStatus] || 'default'}>
                                                {paymentStatus}
                                              </Tag>
                                            : '—'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Amount Paid">
                                        {amountPaid != null ? amountPaid : '—'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Total Amount">
                                        {totalAmount != null ? totalAmount : '—'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Balance Due">
                                        {totalAmount != null && amountPaid != null
                                            ? <Text type={Number(totalAmount) - Number(amountPaid) > 0 ? 'danger' : 'success'}>
                                                {Number(totalAmount) - Number(amountPaid)}
                                              </Text>
                                            : '—'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Order ID">
                                        {orderId ? `#${orderId}` : '—'}
                                    </Descriptions.Item>
                                </Descriptions>
                            );
                        })()}

                        {/* Full orders list — only if orders is an array (from details API) */}
                        {Array.isArray(drawerStudent.orders) && drawerStudent.orders.length > 0 && (
                            <>
                                <Divider />
                                <Title level={5} style={{ marginBottom: 12 }}>
                                    All Orders ({drawerStudent.orders.length})
                                </Title>
                                {drawerStudent.orders.map(order => (
                                    <Card
                                        key={order.id}
                                        size="small"
                                        style={{ marginBottom: 8, background: '#fafafa' }}
                                    >
                                        <Descriptions column={2} size="small">
                                            <Descriptions.Item label="Order #">{order.id}</Descriptions.Item>
                                            <Descriptions.Item label="Status">
                                                <Tag color={{ completed: 'success', in_progress: 'processing', saved: 'processing', pending_payment: 'warning', cancelled: 'error' }[order.order_status || order.process_status] || 'default'}>
                                                    {(order.order_status || order.process_status || '—').replace(/_/g, ' ')}
                                                </Tag>
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Payment">
                                                <Tag color={{ paid: 'success', partial: 'warning', unpaid: 'default' }[order.payment_status] || 'default'}>
                                                    {order.payment_status || 'unpaid'}
                                                </Tag>
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Amount">
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

export default AdminStudentsPage;
