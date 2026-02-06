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
    Tag
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined, BankOutlined, CalendarOutlined, UserAddOutlined } from '@ant-design/icons';
import {
    getAllClasses,
    createClass,
    updateClass,
    deleteClass,
    toggleClassStatus,
    getAllSchools,
    getAllClassReps,
    assignClassRep
} from '../api/api';
import { Status } from '../utils/constants';

const { Title } = Typography;
const { Option } = Select;

const ClassesPage = () => {
    const [classes, setClasses] = useState([]);
    const [schools, setSchools] = useState([]);
    const [classReps, setClassReps] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState(null);
    const [selectedClass, setSelectedClass] = useState(null);
    const [form] = Form.useForm();
    const [assignForm] = Form.useForm();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [classesRes, schoolsRes, repsRes] = await Promise.all([
                getAllClasses(),
                getAllSchools(),
                getAllClassReps()
            ]);
            setClasses(classesRes.data.data || []);
            setSchools(schoolsRes.data.data || []);
            setClassReps(repsRes.data.data || []);
        } catch (error) {
            message.error('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddEdit = async (values) => {
        try {
            const payload = {
                ...values,
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
            fetchData();
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
            fetchData();
        } catch (error) {
            message.error(error.response?.data?.message || 'Assignment failed');
        }
    }

    const handleDelete = async (id) => {
        try {
            await deleteClass(id);
            message.success('Class deleted successfully');
            fetchData();
        } catch (error) {
            message.error('Delete failed');
        }
    };

    const handleToggleStatus = async (record) => {
        try {
            const newStatus = record.status === Status.ACTIVE ? Status.INACTIVE : Status.ACTIVE;
            await toggleClassStatus(record.id, { status: newStatus });
            message.success(`Status updated for ${record.name}`);
            fetchData();
        } catch (error) {
            message.error('Status update failed');
        }
    };

    const columns = [
        {
            title: 'Class Name',
            dataIndex: 'name',
            key: 'name',
            render: (text) => <span style={{ fontWeight: 600 }}>{text}</span>,
        },
        {
            title: 'School',
            key: 'school',
            render: (_, record) => {
                const school = record.school;

                if (!school) return '-';

                return (
                    <Space direction="vertical" size={0}>
                        <Space>
                            <BankOutlined style={{ color: '#1890ff' }} />
                            <strong>{school.name}</strong>
                        </Space>
                        <span style={{ fontSize: 12, color: '#888' }}>
                            {school.education_type}
                        </span>
                    </Space>
                );
            },
        },

        {
            title: 'Graduation Year',
            dataIndex: 'graduation_year',
            key: 'graduation_year',
            render: (year) => (
                <Tag color="cyan">
                    <CalendarOutlined style={{ marginRight: 4 }} />
                    {year}
                </Tag>
            )
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status, record) => {
                if (status === Status.DELETED) return <Tag color="error">Deleted</Tag>;
                return (
                    <Switch
                        checked={status === Status.ACTIVE}
                        onChange={() => handleToggleStatus(record)}
                        checkedChildren="Active"
                        unCheckedChildren="Inactive"
                        size="small"
                    />
                );
            },
        },
        {
            title: "Assigned Reps",
            dataIndex: "users",
            key: "assigned_reps",
            render: (users, record) => {
                if (!users || users.length === 0) {
                    return (
                        <Button
                            size="small"
                            type="dashed"
                            danger
                            icon={<UserAddOutlined />}
                            onClick={() => {
                                setSelectedClass(record);
                                assignForm.resetFields();
                                setIsAssignModalOpen(true);
                            }}
                        >
                            Assign Rep
                        </Button>
                    );
                }
                return (
                    <Button
                        size="small"
                        type="primary"
                        icon={<TeamOutlined />}
                        onClick={() => {
                            setSelectedClass(record);
                            assignForm.setFieldsValue({
                                class_rep_id: record.users?.[0]?.id
                            });
                            setIsAssignModalOpen(true);
                        }}
                    >
                        {/* {users.length} Reps */}
                        Assigned
                    </Button>
                );
            }
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
                            setEditingClass(record);
                            form.setFieldsValue({
                                ...record,
                                status: record.status === Status.ACTIVE,
                                school_id: record.school_id,
                                user_id: record.users?.[0]?.id || record.user_id
                            });
                            setIsModalOpen(true);
                        }}
                    />
                    <Popconfirm
                        title="Delete Class"
                        description="Are you sure you want to delete this class?"
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
                    <Title level={4} style={{ margin: 0 }}>Class Management</Title>
                    <Typography.Text type="secondary">Manage classes, schools, and assigned representatives</Typography.Text>
                </div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                        setEditingClass(null);
                        form.resetFields();
                        setIsModalOpen(true);
                    }}
                    size="large"
                >
                    Add New Class
                </Button>
            </div>

            <Card className="glass-card" style={{ border: 'none' }}>
                <Table
                    columns={columns}
                    dataSource={classes}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            {/* Create/Edit Modal */}
            <Modal
                title={editingClass ? "Edit Class" : "Add New Class"}
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
                destroyOnClose
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
        </div>
    );
};

export default ClassesPage;
