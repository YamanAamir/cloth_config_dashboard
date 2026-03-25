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
    Avatar,
    Tag
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, MailOutlined } from '@ant-design/icons';
import { getAllClassReps, createClassRep, updateClassRep, deleteClassRep, toggleClassRepStatus, getAllSchools } from '../api/api';

const { Title } = Typography;
const { Option } = Select;

const ClassRepsPage = () => {
    const [reps, setReps] = useState([]);
    const [schools, setSchools] = useState([]); // To populate dropdown
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRep, setEditingRep] = useState(null);
    const [form] = Form.useForm();
    const [pagination, setPagination] = useState({
        current: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
        search: '',
    });

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
        } catch (error) {
            message.error('Failed to fetch representatives');
        } finally {
            setLoading(false);
        }
    };

    const fetchSchools = async () => {
        try {
            const schoolsRes = await getAllSchools({ limit: 1000 });
            setSchools(schoolsRes.data.data || []);
        } catch (error) {
            message.error('Failed to fetch schools');
        }
    };

    useEffect(() => {
        fetchReps();
    }, [pagination.current, pagination.limit, pagination.search]);

    useEffect(() => {
        fetchSchools();
    }, []);

    const handleAddEdit = async (values) => {
        try {
            // New logic: 0 = active, 1 = inactive
            const payload = { ...values, status: values.status ? 0 : 1 };

            // Don't send empty password during update
            if (editingRep && !payload.password) {
                delete payload.password;
            }

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
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteClassRep(id);
            message.success('Representative removed');
            fetchReps();
        } catch (error) {
            message.error('Delete failed');
        }
    };

    const handleToggleStatus = async (record) => {
        try {
            // Toggle logic: if 0 (active) -> set to 1 (inactive). if 1 -> set to 0.
            const newStatus = record.status === 0 ? 1 : 0;
            await toggleClassRepStatus(record.id, { status: newStatus });
            message.success(`Status updated for ${record.name}`);
            fetchReps();
        } catch (error) {
            message.error('Status update failed');
        }
    };

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
                <Space direction="horizontal" size={0}>
                    <Tag color="blue">{school?.name || 'No School'}</Tag>
                    <Tag color="black">{school?.education_type || 'No School'}</Tag>
                </Space>
            )
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
            render: (_, record) => (
                <Space size="middle">
                    <Button
                        type="text"
                        icon={<EditOutlined style={{ color: '#00b96b' }} />}
                        onClick={() => {
                            setEditingRep(record);
                            form.setFieldsValue({
                                ...record,
                                status: record.status === 0,
                                school_id: record.school_id
                            });
                            setIsModalOpen(true);
                        }}
                    />
                    <Popconfirm
                        title="Remove representative"
                        description="Are you sure?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
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
                    <Title level={4} style={{ margin: 0 }}>Class Representatives</Title>
                    <Typography.Text type="secondary">Manage class reps and their assigned schools</Typography.Text>
                </div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                        setEditingRep(null);
                        form.resetFields();
                        setIsModalOpen(true);
                    }}
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
                            setPagination(prev => ({
                                ...prev,
                                current: page,
                                limit: pageSize,
                            }));
                        },
                    }}
                />
            </Card>

            <Modal
                title={editingRep ? "Edit Representative" : "Add New Representative"}
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
                        label="Full Name"
                        rules={[{ required: true, message: 'Please enter name' }]}
                    >
                        <Input prefix={<UserOutlined />} placeholder="Enter representative name" />
                    </Form.Item>

                    <Form.Item
                        name="email"
                        label="Email Address"
                        rules={[
                            { required: true, message: 'Please enter email' },
                            { type: 'email', message: 'Please enter a valid email' }
                        ]}
                    >
                        <Input prefix={<MailOutlined />} placeholder="email@example.com" />
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
                                {editingRep ? 'Update Rep' : 'Create Rep'}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default ClassRepsPage;
