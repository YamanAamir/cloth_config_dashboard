import React, { useState, useEffect } from 'react';
import {
    Table,
    Button,
    Card,
    Typography,
    Space,
    Tag,
    Modal,
    Form,
    Input,
    Switch,
    message,
    Popconfirm,
    Select
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, BankOutlined } from '@ant-design/icons';
import { getAllSchools, createSchool, updateSchool, deleteSchool, toggleSchoolStatus } from '../api/api';
import { EducationType, Status } from '../utils/constants';

const { Title } = Typography;
const { Option } = Select;

const SchoolsPage = () => {
    const [schools, setSchools] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSchool, setEditingSchool] = useState(null);
    const [form] = Form.useForm();
    const [pagination, setPagination] = useState({
        current: 1,
        limit: 10,
        total: 0,
        search: '',
    });


    const fetchSchools = async () => {
        setLoading(true);
        try {
            const response = await getAllSchools({
                page: pagination.current,
                limit: pagination.limit,
                search: pagination.search
            });
            const { limit, page, total, totalPages } = response.data.pagination || {};
            // Based on response: { success: true, data: [...] }
            setSchools(response.data.data || []);
            setPagination(prev => ({
                ...prev,
                limit: limit,
                current: page,
                total: total,
                totalPages: totalPages
            }));
        } catch (error) {
            message.error('Failed to fetch schools');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSchools();
    }, [pagination.current, pagination.limit, pagination.search]);

    const handleAddEdit = async (values) => {
        try {
            // New logic: 0 = active, 1 = inactive
            const payload = { ...values, status: values.status ? 0 : 1 };
            if (editingSchool) {
                await updateSchool(editingSchool.id, payload);
                message.success('School updated successfully');
            } else {
                await createSchool(payload);
                message.success('School created successfully');
            }
            setIsModalOpen(false);
            form.resetFields();
            setEditingSchool(null);
            fetchSchools();
        } catch (error) {
            message.error(error.response?.data?.message || 'Operation failed');
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteSchool(id);
            message.success('School deleted');
            fetchSchools();
        } catch (error) {
            message.error('Delete failed');
        }
    };

    const handleToggleStatus = async (record) => {
        try {
            // Toggle logic: if 0 (active) -> set to 1 (inactive). if 1 -> set to 0.
            const newStatus = record.status === 0 ? 1 : 0;
            await toggleSchoolStatus(record.id, { status: newStatus });
            message.success(`Status updated for ${record.name}`);
            fetchSchools();
        } catch (error) {
            message.error('Status update failed');
        }
    };

    const columns = [
        {
            title: 'S/N',
            key: 'serial',
            render: (_, record, index) => index + 1,
        },
        {
            title: 'School Name',
            dataIndex: 'name',
            key: 'name',
            render: (text) => <span style={{ fontWeight: 600 }}>{text}</span>,
        },
        {
            title: 'Education Type',
            dataIndex: 'education_type',
            key: 'education_type',
            render: (type) => <Tag color="blue">{type}</Tag>
        },
        {
            title: 'Created At',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date) => new Date(date).toLocaleDateString(),
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
                            setEditingSchool(record);
                            form.setFieldsValue({
                                ...record,
                                status: record.status === 0
                            });
                            setIsModalOpen(true);
                        }}
                    />
                    <Popconfirm
                        title="Delete school"
                        description="Are you sure you want to delete this school?"
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
                    <Title level={4} style={{ margin: 0 }}>School Management</Title>
                    <Typography.Text type="secondary">Create and manage participating schools</Typography.Text>
                </div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                        setEditingSchool(null);
                        form.resetFields();
                        setIsModalOpen(true);
                    }}
                    size="large"
                >
                    Add New School
                </Button>
            </div>

            <Card className="glass-card" style={{ border: 'none' }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    marginBottom: 16
                }}>
                    <Input.Search
                        placeholder="Search school name"
                        allowClear
                        enterButton
                        style={{ width: 300 }}
                        onChange={(e) => {
                            const value = e.target.value;
                            clearTimeout(window.searchTimer);
                            window.searchTimer = setTimeout(() => {
                                setPagination(prev => ({
                                    ...prev,
                                    current: 1,
                                    search: value
                                }));
                            }, 500);
                        }}

                    />
                </div>

                <Table
                    columns={columns}
                    dataSource={schools}
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
                                limit: pageSize
                            }));
                        }
                    }}
                />

            </Card>


            <Modal
                title={editingSchool ? "Edit School" : "Add New School"}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                destroyOnClose
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
                        label="School Name"
                        rules={[{ required: true, message: 'Please enter school name' }]}
                    >
                        <Input prefix={<BankOutlined />} placeholder="Enter school name" />
                    </Form.Item>

                    <Form.Item
                        name="education_type"
                        label="Education Type"
                        rules={[{ required: true, message: 'Please select education type' }]}
                    >
                        <Select placeholder="Select education type">
                            {Object.values(EducationType).map(type => (
                                <Option key={type} value={type}>{type}</Option>
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
                                {editingSchool ? 'Update School' : 'Create School'}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default SchoolsPage;
