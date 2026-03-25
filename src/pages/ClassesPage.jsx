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
    Empty,
    Image,
    Spin
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined, BankOutlined, CalendarOutlined, UserAddOutlined, EyeOutlined } from '@ant-design/icons';
import {
    getAllClasses,
    createClass,
    updateClass,
    deleteClass,
    toggleClassStatus,
    getAllSchools,
    getAllClassReps,
    assignClassRep,
    getClassBackDesign
} from '../api/api';
import { Status, getUploadsUrl } from '../utils/constants';

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
    
    // Back Design Drawer
    const [designDrawerOpen, setDesignDrawerOpen] = useState(false);
    const [selectedClassForDesign, setSelectedClassForDesign] = useState(null);
    const [classBackDesign, setClassBackDesign] = useState(null);
    const [loadingDesign, setLoadingDesign] = useState(false);
    
    const [pagination, setPagination] = useState({
        current: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
        search: '',
    });

    const fetchClasses = async () => {
        setLoading(true);
        try {
            const response = await getAllClasses({
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
            message.error('Failed to fetch classes');
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
        fetchClasses();
    }, [pagination.current, pagination.limit, pagination.search]);

    useEffect(() => {
        fetchDropdowns();
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
            fetchClasses();
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
            fetchClasses();
        } catch (error) {
            message.error(error.response?.data?.message || 'Assignment failed');
        }
    }

    const handleDelete = async (id) => {
        try {
            await deleteClass(id);
            message.success('Class deleted successfully');
            fetchClasses();
        } catch (error) {
            message.error('Delete failed');
        }
    };

    const handleToggleStatus = async (record) => {
        try {
            const newStatus = record.status === Status.ACTIVE ? Status.INACTIVE : Status.ACTIVE;
            await toggleClassStatus(record.id, { status: newStatus });
            message.success(`Status updated for ${record.name}`);
            fetchClasses();
        } catch (error) {
            message.error('Status update failed');
        }
    };

    const handleViewDesign = async (classRecord) => {
        setSelectedClassForDesign(classRecord);
        setDesignDrawerOpen(true);
        setLoadingDesign(true);
        setClassBackDesign(null);
        
        try {
            const response = await getClassBackDesign(classRecord.id);
            setClassBackDesign(response.data?.data);
        } catch (error) {
            message.error('Failed to load back design');
        } finally {
            setLoadingDesign(false);
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
                        Assigned
                    </Button>
                );
            }
        },
        {
            title: 'Back Design',
            key: 'back_design',
            render: (_, record) => (
                <Button
                    size="small"
                    type="default"
                    icon={<EyeOutlined />}
                    onClick={() => handleViewDesign(record)}
                >
                    View Design
                </Button>
            ),
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
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                    <Input.Search
                        placeholder="Search class or school name"
                        allowClear
                        enterButton
                        style={{ width: 300 }}
                        onChange={(e) => {
                            const value = e.target.value;
                            clearTimeout(window.searchTimerClasses);
                            window.searchTimerClasses = setTimeout(() => {
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

            {/* Back Design Drawer */}
            <Drawer
                title={`Back Design - ${selectedClassForDesign?.name || ''}`}
                placement="right"
                size="large"
                onClose={() => {
                    setDesignDrawerOpen(false);
                    setSelectedClassForDesign(null);
                    setClassBackDesign(null);
                }}
                open={designDrawerOpen}
            >
                {loadingDesign ? (
                    <div style={{ textAlign: 'center', padding: 48 }}>
                        <Spin size="large" />
                    </div>
                ) : !classBackDesign ? (
                    <Empty 
                        description="No back design selected for this class yet" 
                        style={{ padding: 48 }}
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                ) : (
                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                        <Card>
                            <Typography.Title level={5}>Design Name</Typography.Title>
                            <Typography.Text>{classBackDesign.name}</Typography.Text>
                        </Card>
                        
                        <Card>
                            <Typography.Title level={5}>Design Preview</Typography.Title>
                            <div style={{ 
                                padding: 16, 
                                background: '#fafafa', 
                                borderRadius: 8, 
                                textAlign: 'center',
                                border: '1px solid #f0f0f0'
                            }}>
                                <Image
                                    src={getUploadsUrl(classBackDesign.file_path)}
                                    alt={classBackDesign.name}
                                    style={{ maxWidth: '100%', maxHeight: 400, objectFit: 'contain' }}
                                />
                            </div>
                        </Card>

                        <Card>
                            <Typography.Title level={5}>Details</Typography.Title>
                            <Space direction="vertical">
                                <div>
                                    <Typography.Text type="secondary">Created: </Typography.Text>
                                    <Typography.Text>{new Date(classBackDesign.created_at).toLocaleDateString()}</Typography.Text>
                                </div>
                                <div>
                                    <Typography.Text type="secondary">Type: </Typography.Text>
                                    <Tag color={classBackDesign.is_library ? 'blue' : 'green'}>
                                        {classBackDesign.is_library ? 'Design Template' : 'Custom Back Design'}
                                    </Tag>
                                </div>
                            </Space>
                        </Card>
                    </Space>
                )}
            </Drawer>
        </div>
    );
};

export default ClassesPage;
