import React, { useState, useEffect } from 'react';
import {
    Table, Button, Card, Typography, Space, Modal,
    Form, Input, Switch, message, Select, Avatar, Tag, Dropdown, Spin
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    UserOutlined, MailOutlined, KeyOutlined,
    MoreOutlined, TeamOutlined, UserAddOutlined,
    ExclamationCircleOutlined
} from '@ant-design/icons';
import {
    getAllClassReps, createClassRep, updateClassRep, deleteClassRep,
    toggleClassRepStatus, getAllSchools, resetUserPassword,
    getAllClasses, assignClassRep
} from '../api/api';

const { Title } = Typography;

const ClassRepsPage = () => {
    const [reps, setReps] = useState([]);
    const [schools, setSchools] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Add/Edit modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRep, setEditingRep] = useState(null);
    const [form] = Form.useForm();

    // Assign class modal
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [assigningRep, setAssigningRep] = useState(null);
    const [unassignedClasses, setUnassignedClasses] = useState([]);
    const [loadingClasses, setLoadingClasses] = useState(false);
    const [assignForm] = Form.useForm();
    const [assigning, setAssigning] = useState(false);

    const [pagination, setPagination] = useState({
        current: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
        search: '',
    });

    // ─── Fetch ───────────────────────────────────────────────────────────────────

    const fetchReps = async () => {
        setLoading(true);
        try {
            const response = await getAllClassReps({
                page: pagination.current,
                limit: pagination.limit,
                search: pagination.search,
            });
            const { limit, page, total, totalPages } = response.data.pagination || {};
            setReps(response.data.data || []);
            setPagination(prev => ({
                ...prev,
                limit: limit ?? prev.limit,
                current: page ?? prev.current,
                total: total ?? (response.data.data?.length || 0),
                totalPages: totalPages ?? 1,
            }));
        } catch {
            message.error('Failed to fetch representatives');
        } finally {
            setLoading(false);
        }
    };

    const fetchSchools = async () => {
        try {
            const res = await getAllSchools({ limit: 1000 });
            const data = res.data?.data || res.data?.schools || res.data?.result || [];
            setSchools(data);
        } catch {
            message.error('Failed to fetch schools');
        }
    };

    // Fetch unassigned classes that belong to this rep's school
    const fetchUnassignedClassesForRep = async (rep) => {
        setLoadingClasses(true);
        setUnassignedClasses([]);
        try {
            const res = await getAllClasses({
                school_id: rep.school?.id || rep.school_id,
                unassigned_only: true,
                limit: 200,
                page: 1,
            });
            const data = res.data?.data || [];
            // Also include the currently assigned class so rep can be re-assigned to it
            const currentClass = rep.class || rep.classes?.[0];
            const alreadyInList = currentClass && data.some(c => c.id === currentClass.id);
            if (currentClass && !alreadyInList) {
                setUnassignedClasses([{ ...currentClass, _isCurrent: true }, ...data]);
            } else {
                setUnassignedClasses(data);
            }
        } catch {
            message.error('Failed to fetch classes');
        } finally {
            setLoadingClasses(false);
        }
    };

    useEffect(() => { fetchReps(); }, [pagination.current, pagination.limit, pagination.search]);
    useEffect(() => { fetchSchools(); }, []);

    // ─── Handlers ────────────────────────────────────────────────────────────────

    const handleAddEdit = async (values) => {
        if (submitting) return;
        setSubmitting(true);
        try {
            const payload = { ...values, status: values.status ? 0 : 1 };
            if (editingRep && !payload.password) delete payload.password;

            if (editingRep) {
                await updateClassRep(editingRep.id, payload);
                message.success('Class representative updated');
            } else {
                await createClassRep(payload);
                message.success('Class representative created');
            }
            setIsModalOpen(false);
            form.resetFields();
            setEditingRep(null);
            fetchReps();
        } catch (error) {
            message.error(error.response?.data?.message || 'Operation failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteClassRep(id);
            message.success('Representative removed');
            fetchReps();
        } catch {
            message.error('Delete failed');
        }
    };

    const handleResetPassword = async (id, name) => {
        try {
            await resetUserPassword(id);
            message.success(`Password reset email sent to ${name}`);
        } catch (error) {
            message.error(error.response?.data?.message || 'Password reset failed');
        }
    };

    const handleToggleStatus = async (record) => {
        try {
            const newStatus = record.status === 0 ? 1 : 0;
            await toggleClassRepStatus(record.id, { status: newStatus });
            message.success(`Status updated for ${record.name}`);
            fetchReps();
        } catch {
            message.error('Status update failed');
        }
    };

    const openAssignModal = (rep) => {
        setAssigningRep(rep);
        assignForm.resetFields();
        // Pre-select currently assigned class if exists
        const currentClass = rep.class || rep.classes?.[0];
        if (currentClass) {
            assignForm.setFieldsValue({ class_id: currentClass.id });
        }
        setIsAssignModalOpen(true);
        fetchUnassignedClassesForRep(rep);
    };

    const handleAssignClass = async (values) => {
        setAssigning(true);
        try {
            await assignClassRep({
                class_id: values.class_id,
                class_rep_id: assigningRep.id,
            });
            message.success(`Class assigned to ${assigningRep.name}`);
            setIsAssignModalOpen(false);
            assignForm.resetFields();
            fetchReps();
        } catch (error) {
            message.error(error.response?.data?.message || 'Assignment failed');
        } finally {
            setAssigning(false);
        }
    };

    // ─── Table columns ────────────────────────────────────────────────────────────

    const columns = [
        {
            title: 'Representative',
            dataIndex: 'name',
            key: 'name',
            render: (text) => (
                <Space>
                    <Avatar icon={<UserOutlined />} />
                    <span style={{ fontWeight: 600 }}>{text}</span>
                </Space>
            ),
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: 'School',
            dataIndex: 'school',
            key: 'school',
            render: (school) => (
                <span >{school?.name || 'No School'}</span>
            ),
        },
        {
            title: 'Assigned Class',
            key: 'assigned_class',
            render: (_, record) => {
                const cls = record.class || record.classes?.[0];
                if (cls) {
                    return (
                        <Tag
                            color="blue"
                            style={{ cursor: 'pointer',width:'100%', textAlign:"center" }}
                            onClick={() => openAssignModal(record)}
                        >
                            <TeamOutlined style={{ marginRight: 4 }} />
                            {cls.name}
                        </Tag>
                    );
                }
                return (
                    <Button
                        size="small"
                        type="dashed"
                        
                        icon={<UserAddOutlined />}
                        onClick={() => openAssignModal(record)}
                    >
                        Assign Class
                    </Button>
                );
            },
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status, record) => {
                if (status === 2) return <Tag color="error">Deleted</Tag>;
                return (
                    <Switch
                        checked={status === 0}
                        onChange={() => handleToggleStatus(record)}
                        checkedChildren="Active"
                        unCheckedChildren="Inactive"
                    />
                );
            },
        },
        {
            title: 'Action',
            key: 'action',
            align: 'center',
            render: (_, record) => {
                const menuItems = [
                    {
                        key: 'edit',
                        label: 'Edit',
                        icon: <EditOutlined />,
                        onClick: () => {
                            setEditingRep(record);
                            form.setFieldsValue({
                                ...record,
                                status: record.status === 0,
                                school_id: record.school?.id || record.school_id || undefined,
                            });
                            setIsModalOpen(true);
                        },
                    },
                    {
                        key: 'assign',
                        label: 'Assign Class',
                        icon: <UserAddOutlined />,
                        onClick: () => openAssignModal(record),
                    },
                    {
                        key: 'reset',
                        label: 'Reset Password',
                        icon: <KeyOutlined />,
                        onClick: () => {
                            Modal.confirm({
                                title: 'Reset password?',
                                content: `A new password will be sent to ${record.email}.`,
                                okText: 'Yes, Reset',
                                onOk: () => handleResetPassword(record.id, record.name),
                            });
                        },
                    },
                    { type: 'divider' },
                    {
                        key: 'delete',
                        label: <span style={{  fontWeight: 600 }}>Delete</span>,
                        icon: <ExclamationCircleOutlined  />,
                        danger: true,
                        onClick: () => {
                            Modal.confirm({
                                title: 'Permanently delete representative?',
                                icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
                                content: (
                                    <div>
                                        <p><b>This action cannot be undone.</b></p>
                                        <p style={{ color: '#ff4d4f' }}>
                                            It may also remove all related data linked to this representative.
                                        </p>
                                    </div>
                                ),
                                okText: 'Yes, Delete Permanently',
                                cancelText: 'Cancel',
                                okButtonProps: { danger: true },
                                centered: true,
                                onOk: () => handleDelete(record.id),
                            });
                        },
                    }
                ];

                return (
                    <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
                        <Button type="text" icon={<MoreOutlined />} />
                    </Dropdown>
                );
            },
        },
    ];

    // ─── Render ───────────────────────────────────────────────────────────────────

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <Title level={4} style={{ margin: 0 }}>Class Representatives</Title>
                    <Typography.Text type="secondary">Manage class reps and their assigned schools</Typography.Text>
                </div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => { setEditingRep(null); form.resetFields(); setIsModalOpen(true); }}
                    size="large"
                >
                    Add New Representative
                </Button>
            </div>

            <Card className="glass-card" style={{ border: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                    <Input.Search
                        placeholder="Search by name or email"
                        allowClear
                        enterButton
                        style={{ width: 300 }}
                        onChange={(e) => {
                            const value = e.target.value;
                            clearTimeout(window.searchTimerReps);
                            window.searchTimerReps = setTimeout(() => {
                                setPagination(prev => ({ ...prev, current: 1, search: value }));
                            }, 500);
                        }}
                    />
                </div>
                <Table
                    columns={columns}
                    dataSource={reps}
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
                            setPagination(prev => ({ ...prev, current: page, limit: pageSize }));
                        },
                    }}
                />
            </Card>

            {/* ── Add / Edit Rep Modal ─────────────────────────────────────────── */}
            <Modal
                title={editingRep ? 'Edit Representative' : 'Add New Representative'}
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
                    <Form.Item name="name" label="Full Name"
                        rules={[{ required: true, message: 'Please enter name' }]}>
                        <Input prefix={<UserOutlined />} placeholder="Enter representative name" />
                    </Form.Item>

                    <Form.Item name="email" label="Email Address"
                        rules={[
                            { required: true, message: 'Please enter email' },
                            { type: 'email', message: 'Please enter a valid email' }
                        ]}>
                        <Input prefix={<MailOutlined />} placeholder="email@example.com" />
                    </Form.Item>

                    <Form.Item name="school_id" label="Assign School"
                        rules={[{ required: true, message: 'Please select a school' }]}>
                        <Select
                            placeholder="Select a school"
                            showSearch
                            options={schools.map(s => ({ label: s.name, value: s.id }))}
                        />
                    </Form.Item>

                    <Form.Item name="status" label="Status" valuePropName="checked">
                        <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
                            <Button type="primary" htmlType="submit" loading={submitting}>
                                {editingRep ? 'Update Rep' : 'Create Rep'}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* ── Assign Class Modal ───────────────────────────────────────────── */}
            <Modal
                title={
                    <Space>
                        <UserAddOutlined />
                        {(assigningRep?.class || assigningRep?.classes?.[0])
                            ? `Reassign Class — ${assigningRep?.name}`
                            : `Assign Class — ${assigningRep?.name}`
                        }
                    </Space>
                }
                open={isAssignModalOpen}
                onCancel={() => setIsAssignModalOpen(false)}
                footer={null}
                destroyOnHidden
            >
                <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                    Showing classes from <strong>{assigningRep?.school?.name || 'this school'}</strong>
                    {(assigningRep?.class || assigningRep?.classes?.[0]) && (
                        <Tag color="green" style={{ marginLeft: 8 }}>
                            Currently: {(assigningRep?.class || assigningRep?.classes?.[0])?.name}
                        </Tag>
                    )}
                </Typography.Text>

                {loadingClasses ? (
                    <div style={{ textAlign: 'center', padding: 32 }}>
                        <Spin />
                        <div style={{ marginTop: 8, color: '#888' }}>Loading classes...</div>
                    </div>
                ) : unassignedClasses.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 32, color: '#888' }}>
                        <TeamOutlined style={{ fontSize: 32, marginBottom: 8, display: 'block' }} />
                        No unassigned classes found for this school.
                    </div>
                ) : (
                    <Form
                        form={assignForm}
                        layout="vertical"
                        onFinish={handleAssignClass}
                    >
                        <Form.Item name="class_id" label="Select Class"
                            rules={[{ required: true, message: 'Please select a class' }]}>
                            <Select
                                placeholder="Select a class"
                                showSearch
                                options={unassignedClasses.map(c => ({
                                    label: c._isCurrent ? `${c.name} (currently assigned)` : c.name,
                                    value: c.id,
                                }))}
                            />
                        </Form.Item>

                        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                            <Space>
                                <Button onClick={() => setIsAssignModalOpen(false)}>Cancel</Button>
                                <Button type="primary" htmlType="submit" loading={assigning}>
                                    {(assigningRep?.class || assigningRep?.classes?.[0]) ? 'Reassign Class' : 'Assign Class'}
                                </Button>
                            </Space>
                        </Form.Item>
                    </Form>
                )}
            </Modal>
        </div>
    );
};

export default ClassRepsPage;
