import React, { useState, useEffect } from 'react';
import {
    Table, Button, Card, Typography, Space, Modal,
    Form, Input, Switch, message, Popconfirm, Select,
    Tag, Drawer, Empty, Image, Spin, Dropdown} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined, BankOutlined, CalendarOutlined, UserAddOutlined, EyeOutlined, LockOutlined, UnlockOutlined, FileZipOutlined, FilePdfOutlined, FileExcelOutlined, MoreOutlined, MailOutlined } from '@ant-design/icons';
import {
    getAllClasses, createClass, updateClass, deleteClass,
    toggleClassStatus, getAllSchools, getAllClassReps,
    assignClassRep, getClassBackDesign, lockClass, unlockClass,
    generateProductionFiles, sendStatusEmail, sendFollowupEmail,
    updateClassProcessStatus, sendDeadlineReminder
} from '../api/api';
import { Status, getUploadsUrl } from '../utils/constants';
import AdminStudentCountModal from '../components/AdminStudentCountModal';

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

    // Production files
    const [generatingFiles, setGeneratingFiles] = useState(false);
    const [productionFiles, setProductionFiles] = useState(null);
    const [productionModalOpen, setProductionModalOpen] = useState(false);

    // View Details Drawer
    const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
    const [viewingClass, setViewingClass] = useState(null);
    const [viewBackDesign, setViewBackDesign] = useState(null);
    const [loadingViewDesign, setLoadingViewDesign] = useState(false);
    
    // Student Count Modal
    const [studentCountModalOpen, setStudentCountModalOpen] = useState(false);
    const [selectedClassForCount, setSelectedClassForCount] = useState(null);
    
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
            const schoolsRes = await getAllSchools({ limit: 1000 });
            setSchools(schoolsRes.data.data || []);
        } catch (error) {
            message.error('Failed to fetch dropdown data');
        }
    };

    const fetchFilteredReps = async (schoolId) => {
        try {
            const repsRes = await getAllClassReps({
                school_id: schoolId,
                unassigned_only: true,
                page: 1,
                limit: 50
            });
            setClassReps(repsRes.data.data || []);
        } catch (error) {
            message.error('Failed to fetch representatives');
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

    const handleToggleClassLock = async (record) => {
        try {
            if (record.order_locked) {
                await unlockClass(record.id);
                message.success(`Class "${record.name}" unlocked`);
            } else {
                await lockClass(record.id);
                message.success(`Class "${record.name}" locked`);
            }
            fetchClasses();
        } catch (error) {
            message.error(error.response?.data?.message || 'Lock toggle failed');
        }
    };

    const handleGenerateFiles = async (record) => {
        setGeneratingFiles(true);
        try {
            const response = await generateProductionFiles(record.id);
            const { pdf, excel } = response.data?.data || {};
            message.success(`Production files generated for "${record.name}"`);
            setProductionFiles({ pdf, excel });
            setProductionModalOpen(true);
        } catch (error) {
            message.error(error.response?.data?.message || 'Generation failed');
        } finally {
            setGeneratingFiles(false);
        }
    };

    const handleSendEmail = async (type, classId, className) => {
        try {
            if (type === 'status') {
                await sendStatusEmail(classId);
                message.success(`Status email sent for "${className}"`);
            } else if (type === 'followup') {
                await sendFollowupEmail(classId);
                message.success(`Follow-up email sent for "${className}"`);
            }
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to send email');
        }
    };

    const handleUpdateProcessStatus = (record, status) => {
        if (status === 'shipped') {
            // Ask for tracking code
            let trackingCode = '';
            Modal.confirm({
                title: 'Mark as Shipped',
                content: (
                    <div style={{ marginTop: 12 }}>
                        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                            Enter tracking code (optional):
                        </Typography.Text>
                        <Input
                            placeholder="e.g. ABC123"
                            onChange={(e) => { trackingCode = e.target.value; }}
                        />
                    </div>
                ),
                okText: 'Send & Update',
                onOk: async () => {
                    try {
                        await updateClassProcessStatus(record.id, { process_status: 'shipped', trackingCode });
                        message.success(`Class marked as shipped — email sent`);
                        fetchClasses();
                    } catch (error) {
                        message.error(error.response?.data?.message || 'Failed');
                    }
                }
            });
        } else {
            Modal.confirm({
                title: `Mark class as "${status}"?`,
                content: 'This will trigger an automatic email to all students.',
                okText: 'Confirm',
                onOk: async () => {
                    try {
                        await updateClassProcessStatus(record.id, { process_status: status });
                        message.success(`Status updated to "${status}" — email sent`);
                        fetchClasses();
                    } catch (error) {
                        message.error(error.response?.data?.message || 'Failed');
                    }
                }
            });
        }
    };

    const handleDownloadFile = (filePath) => {
        if (!filePath) return;
        // filePath is already "uploads/production_files/filename.pdf"
        const url = getUploadsUrl(filePath);
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.download = filePath.split(/[\\/]/).pop();
        a.click();
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

        // {
        //     title: 'Graduation Year',
        //     dataIndex: 'graduation_year',
        //     key: 'graduation_year',
        //     render: (year) => (
        //         <Tag color="cyan">
        //             <CalendarOutlined style={{ marginRight: 4 }} />
        //             {year}
        //         </Tag>
        //     )
        // },
        // {
        //     title: 'Ordering Deadline',
        //     dataIndex: 'change_deadline',
        //     key: 'change_deadline',
        //     render: (deadline) => {
        //         if (!deadline) return <span style={{ color: '#bbb', fontSize: 12 }}>Not set</span>;
        //         const isPast = new Date() > new Date(deadline);
        //         return (
        //             <Tag color={isPast ? 'volcano' : 'blue'}>
        //                 <CalendarOutlined style={{ marginRight: 4 }} />
        //                 {new Date(deadline).toLocaleDateString()}
        //             </Tag>
        //         );
        //     }
        // },
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
                                fetchFilteredReps(record.school_id);
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
                            fetchFilteredReps(record.school_id);
                        }}
                    >
                        Assigned
                    </Button>
                );
            }
        },
        {
            title: 'Lock',
            key: 'order_locked',
            render: (_, record) => (
                <Popconfirm
                    title={`${record.order_locked ? 'Unlock' : 'Lock'} class "${record.name}"?`}
                    onConfirm={() => handleToggleClassLock(record)}
                    okText="Yes" cancelText="No"
                >
                    <Button
                        size="small"
                        type={record.order_locked ? 'primary' : 'default'}
                        danger={record.order_locked}
                        icon={record.order_locked ? <LockOutlined /> : <UnlockOutlined />}
                    >
                        {record.order_locked ? 'Locked' : 'Unlocked'}
                    </Button>
                </Popconfirm>
            ),
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => {
                const menuItems = [
                    {
                        key: 'view',
                        label: 'View Details',
                        icon: <EyeOutlined style={{ color: '#1890ff' }} />,
                        onClick: async () => {
                            setViewingClass(record);
                            setViewDrawerOpen(true);
                            setViewBackDesign(null);
                            setLoadingViewDesign(true);
                            try {
                                const res = await getClassBackDesign(record.id);
                                setViewBackDesign(res.data?.data);
                            } catch { /* no design */ }
                            finally { setLoadingViewDesign(false); }
                        }
                    },
                    {
                        key: 'student-count',
                        label: 'Student Count',
                        icon: <TeamOutlined style={{ color: '#52c41a' }} />,
                        onClick: () => {
                            setSelectedClassForCount(record);
                            setStudentCountModalOpen(true);
                        }
                    },
                    {
                        key: 'edit',
                        label: 'Edit',
                        icon: <EditOutlined />,
                        onClick: () => {
                            setEditingClass(record);
                            form.setFieldsValue({
                                ...record,
                                status: record.status === Status.ACTIVE,
                                school_id: record.school_id,
                                user_id: record.users?.[0]?.id || record.user_id,
                                change_deadline: record.change_deadline
                                    ? record.change_deadline.split('T')[0]
                                    : undefined
                            });
                            setIsModalOpen(true);
                        }
                    },
                    ...(record.order_locked ? [
                        { type: 'divider' },
                        {
                            key: 'generate',
                            label: generatingFiles ? 'Generating...' : 'Generate Production Files',
                            icon: <FileZipOutlined style={{ color: '#00b96b' }} />,
                            onClick: () => handleGenerateFiles(record),
                            disabled: generatingFiles,
                        },
                        ...(productionFiles ? [
                            {
                                key: 'pdf',
                                label: 'Download PDF',
                                icon: <FilePdfOutlined style={{ color: '#ff4d4f' }} />,
                                onClick: () => handleDownloadFile(productionFiles.pdf),
                                disabled: !productionFiles.pdf,
                            },
                            {
                                key: 'excel',
                                label: 'Download Excel',
                                icon: <FileExcelOutlined style={{ color: '#52c41a' }} />,
                                onClick: () => handleDownloadFile(productionFiles.excel),
                                disabled: !productionFiles.excel,
                            },
                        ] : []),
                        { type: 'divider' },
                        {
                            key: 'reminder',
                            label: 'Send Deadline Reminder',
                            icon: <MailOutlined style={{ color: '#00b96b' }} />,
                            onClick: async () => {
                                try {
                                    await sendDeadlineReminder(record.id);
                                    message.success(`Deadline reminder sent for "${record.name}"`);
                                } catch (err) {
                                    message.error(err.response?.data?.message || 'Failed to send reminder');
                                }
                            },
                        },
                        {
                            key: 'shipped',
                            label: 'Mark as Shipped',
                            icon: <MailOutlined style={{ color: '#1890ff' }} />,
                            onClick: () => handleUpdateProcessStatus(record, 'shipped'),
                            disabled: record.process_status === 'shipped' || record.process_status === 'completed',
                        },
                        {
                            key: 'completed',
                            label: 'Mark as Completed',
                            icon: <MailOutlined style={{ color: '#722ed1' }} />,
                            onClick: () => handleUpdateProcessStatus(record, 'completed'),
                            disabled: record.process_status === 'completed',
                        },
                    ] : []),
                    { type: 'divider' },
                    {
                        key: 'delete',
                        label: 'Delete',
                        icon: <DeleteOutlined />,
                        danger: true,
                        onClick: () => handleDelete(record.id),
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
                        name="change_deadline"
                        label="Ordering Deadline"
                        tooltip="Students cannot place or edit orders after this date"
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
                            optionFilterProp="label"
                            options={[
                                // Currently assigned rep (if any) shown at top
                                ...(selectedClass?.users?.length > 0 ? [{
                                    value: selectedClass.users[0].id,
                                    label: `${selectedClass.users[0].name} (${selectedClass.users[0].email}) — Currently Assigned`,
                                    style: { color: '#00b96b' }
                                }] : []),
                                // Unassigned reps from backend
                                ...classReps.map(rep => ({
                                    value: rep.id,
                                    label: `${rep.name} (${rep.email})`
                                }))
                            ]}
                        />
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

            {/* View Details Drawer */}
            <Drawer
                title={viewingClass?.name}
                placement="right"
                size="large"
                onClose={() => { setViewDrawerOpen(false); setViewingClass(null); setViewBackDesign(null); }}
                open={viewDrawerOpen}
            >
                {viewingClass && (
                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                        <Card size="small" title="Class Info">
                            <Space direction="vertical" style={{ width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography.Text type="secondary">Class Name</Typography.Text>
                                    <Typography.Text strong>{viewingClass.name}</Typography.Text>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography.Text type="secondary">Graduation Year</Typography.Text>
                                    <Tag color="cyan">{viewingClass.graduation_year}</Tag>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography.Text type="secondary">Ordering Deadline</Typography.Text>
                                    {viewingClass.change_deadline ? (
                                        <Tag color={new Date() > new Date(viewingClass.change_deadline) ? 'volcano' : 'blue'}>
                                            {new Date(viewingClass.change_deadline).toLocaleDateString()}
                                        </Tag>
                                    ) : <Typography.Text type="secondary">Not set</Typography.Text>}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography.Text type="secondary">Status</Typography.Text>
                                    <Tag color={viewingClass.status === Status.ACTIVE ? 'success' : 'default'}>
                                        {viewingClass.status === Status.ACTIVE ? 'Active' : 'Inactive'}
                                    </Tag>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography.Text type="secondary">Orders Locked</Typography.Text>
                                    <Tag color={viewingClass.order_locked ? 'error' : 'success'} icon={viewingClass.order_locked ? <LockOutlined /> : <UnlockOutlined />}>
                                        {viewingClass.order_locked ? 'Locked' : 'Unlocked'}
                                    </Tag>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography.Text type="secondary">Process Status</Typography.Text>
                                    <Tag color={{
                                        active: 'blue', orders_locked: 'orange',
                                        production_ready: 'cyan', shipped: 'purple', completed: 'success'
                                    }[viewingClass.process_status] || 'default'}>
                                        {viewingClass.process_status?.replace(/_/g, ' ').toUpperCase() || '—'}
                                    </Tag>
                                </div>                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography.Text type="secondary">Name List Locked</Typography.Text>
                                    <Tag color={viewingClass.name_list_locked ? 'error' : 'success'}>
                                        {viewingClass.name_list_locked ? 'Locked' : 'Unlocked'}
                                    </Tag>
                                </div>
                            </Space>
                        </Card>

                        <Card size="small" title="School">
                            <Space direction="vertical" style={{ width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography.Text type="secondary">School Name</Typography.Text>
                                    <Typography.Text strong>{viewingClass.school?.name || '—'}</Typography.Text>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography.Text type="secondary">Education Type</Typography.Text>
                                    <Tag color="blue">{viewingClass.school?.education_type || '—'}</Tag>
                                </div>
                            </Space>
                        </Card>

                        <Card size="small" title="Class Representatives">
                            {viewingClass.users?.length > 0 ? (
                                viewingClass.users.map(u => (
                                    <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <Typography.Text strong>{u.name}</Typography.Text>
                                        <Typography.Text type="secondary">{u.email}</Typography.Text>
                                    </div>
                                ))
                            ) : (
                                <Typography.Text type="secondary">No representative assigned</Typography.Text>
                            )}
                        </Card>

                        <Card size="small" title="Back Design">
                            {loadingViewDesign ? (
                                <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
                            ) : !viewBackDesign ? (
                                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No back design selected" style={{ padding: 16 }} />
                            ) : (
                                <Space direction="vertical" style={{ width: '100%' }}>
                                    <div style={{ textAlign: 'center', background: '#fafafa', borderRadius: 8, padding: 16 }}>
                                        <Image
                                            src={getUploadsUrl(viewBackDesign.file_path)}
                                            alt={viewBackDesign.name}
                                            style={{ maxWidth: '100%', maxHeight: 300, objectFit: 'contain' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography.Text type="secondary">Name</Typography.Text>
                                        <Typography.Text strong>{viewBackDesign.name}</Typography.Text>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography.Text type="secondary">Type</Typography.Text>
                                        <Tag color={viewBackDesign.is_library ? 'blue' : 'green'}>
                                            {viewBackDesign.is_library ? 'Design Template' : 'Custom Upload'}
                                        </Tag>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography.Text type="secondary">Status</Typography.Text>
                                        <Tag color={viewBackDesign.process_status === 'approved' ? 'success' : 'warning'}>
                                            {viewBackDesign.process_status}
                                        </Tag>
                                    </div>
                                </Space>
                            )}
                        </Card>
                    </Space>
                )}
            </Drawer>

            {/* Student Count Modal */}
            <AdminStudentCountModal
                open={studentCountModalOpen}
                onCancel={() => {
                    setStudentCountModalOpen(false);
                    setSelectedClassForCount(null);
                }}
                classId={selectedClassForCount?.id}
                className={selectedClassForCount?.name}
            />
        </div>
    );
};

export default ClassesPage;
