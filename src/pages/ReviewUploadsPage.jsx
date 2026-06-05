import React, { useState, useEffect, useRef } from 'react';
import {
    Table, Button, Card, Typography, Space, Tag, Tabs,
    message, Image, Popconfirm, Tooltip, Input, Select, Modal, Upload, Form
} from 'antd';
import {
    CheckCircleOutlined, CloseCircleOutlined, EyeOutlined,
    FileImageOutlined, ClockCircleOutlined, PlusOutlined, InboxOutlined, DeleteOutlined
} from '@ant-design/icons';
import {
    getAllLogos, approveLogo, rejectLogo, adminPermanentDeleteLogo,
    getAllBackDesigns, approveBackDesign, rejectBackDesign, adminPermanentDeleteBackDesign,
    adminUploadLogo, adminUploadBackDesign,
    getAllSchools, getAllClasses
} from '../api/api';
import { Status, getUploadsUrl } from '../utils/constants';

const { Title } = Typography;
const { TabPane } = Tabs;

const STATUS_FILTER_OPTIONS = [
    { value: '', label: 'All' },
    { value: '0', label: 'Approved' },
    { value: '2', label: 'Rejected' },
];

const ReviewUploadsPage = () => {
    const [logos, setLogos] = useState([]);
    const [backDesigns, setBackDesigns] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('1');
    const [designColor, setDesignColor] = useState('white');

    // Admin upload state
    const [uploadLogoModal, setUploadLogoModal] = useState(false);
    const [uploadDesignModal, setUploadDesignModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadPreview, setUploadPreview] = useState(null);
    const [schools, setSchools] = useState([]);
    const [classes, setClasses] = useState([]);
    const [logoForm] = Form.useForm();
    const [designForm] = Form.useForm();
    const [logoPagination, setLogoPagination] = useState({
        current: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
        search: '',
        status: '',
    });
    const [designPagination, setDesignPagination] = useState({
        current: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
        search: '',
        status: '',
    });

    const fetchLogos = async () => {
        setLoading(true);
        try {
            const response = await getAllLogos({
                page: logoPagination.current,
                limit: logoPagination.limit,
                search: logoPagination.search,
                ...(logoPagination.status !== '' && { status: logoPagination.status }),
            });
            const { limit, page, total, totalPages } = response.data.pagination || {};
            setLogos(response.data.data || []);
            setLogoPagination(prev => ({
                ...prev,
                limit: limit ?? prev.limit,
                current: page ?? prev.current,
                total: total ?? 0,
                totalPages: totalPages ?? 1,
            }));
        } catch (error) {
            message.error('Failed to fetch logos');
        } finally {
            setLoading(false);
        }
    };

    const fetchBackDesigns = async () => {
        setLoading(true);
        try {
            const response = await getAllBackDesigns({
                page: designPagination.current,
                limit: designPagination.limit,
                search: designPagination.search,
                ...(designPagination.status !== '' && { status: designPagination.status }),
            });
            const { limit, page, total, totalPages } = response.data.pagination || {};
            setBackDesigns(response.data.data.filter(i => i.isFromConfigurator == false) || []);
            setDesignPagination(prev => ({
                ...prev,
                limit: limit ?? prev.limit,
                current: page ?? prev.current,
                total: total ?? 0,
                totalPages: totalPages ?? 1,
            }));
        } catch (error) {
            message.error('Failed to fetch back designs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === '1') fetchLogos();
    }, [activeTab, logoPagination.current, logoPagination.limit, logoPagination.search, logoPagination.status]);

    useEffect(() => {
        if (activeTab === '2') fetchBackDesigns();
    }, [activeTab, designPagination.current, designPagination.limit, designPagination.search, designPagination.status]);

    const handleApprove = async (id, type) => {
        try {
            if (type === 'logo') {
                await approveLogo(id);
                message.success('Logo approved');
                fetchLogos();
            } else {
                await approveBackDesign(id);
                message.success('Back design approved');
                fetchBackDesigns();
            }
        } catch (error) {
            message.error(error.response?.data?.error || 'Operation failed');
        }
    };

    const handleReject = async (id, type) => {
        let reason = '';
        Modal.confirm({
            title: `Reject this ${type === 'logo' ? 'logo' : 'back design'}?`,
            content: (
                <div style={{ marginTop: 12 }}>
                    <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                        Reason for rejection (optional — will be visible to class rep):
                    </Typography.Text>
                    <Input.TextArea
                        rows={3}
                        placeholder="e.g. Image resolution too low, please re-upload at 300dpi"
                        onChange={e => { reason = e.target.value; }}
                    />
                </div>
            ),
            okText: 'Reject',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    const body = reason.trim() ? { comment: reason.trim() } : {};
                    if (type === 'logo') {
                        await rejectLogo(id, body);
                        message.success('Logo rejected');
                        fetchLogos();
                    } else {
                        await rejectBackDesign(id, body);
                        message.success('Back design rejected');
                        fetchBackDesigns();
                    }
                } catch (error) {
                    message.error(error.response?.data?.error || 'Operation failed');
                }
            }
        });
    };

    const handlePermanentDelete = async (id, type, name) => {
        Modal.confirm({
            title: `Permanently delete this ${type === 'logo' ? 'logo' : 'back design'}?`,
            content: (
                <div>
                    <Typography.Text type="danger" strong>
                        This action cannot be undone!
                    </Typography.Text>
                    <br />
                    <Typography.Text>
                        This will permanently remove "{name}" and its file from the system.
                        This action is irreversible.
                    </Typography.Text>
                </div>
            ),
            okText: 'Permanently Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    if (type === 'logo') {
                        await adminPermanentDeleteLogo(id);
                        message.success('Logo permanently deleted');
                        fetchLogos();
                    } else {
                        await adminPermanentDeleteBackDesign(id);
                        message.success('Back design permanently deleted');
                        fetchBackDesigns();
                    }
                } catch (error) {
                    message.error(error.response?.data?.message || 'Permanent delete failed');
                }
            }
        });
    };

    // Fetch schools and classes for upload modals
    useEffect(() => {
        getAllSchools({ limit: 100 }).then(r => setSchools(r.data.data || [])).catch(() => { });
        getAllClasses({ limit: 100 }).then(r => setClasses(r.data.data || [])).catch(() => { });
    }, []);

    const handleFileSelect = (file) => {
        // Check if this is for back design upload (based on current modal state)
        const isBackDesign = uploadDesignModal;

        if (isBackDesign) {
            // No dimension restrictions for any upload type
            setUploadFile(file);
            setUploadPreview(URL.createObjectURL(file));
            return false;
        } else {
            // For logos, no dimension restriction
            setUploadFile(file);
            setUploadPreview(URL.createObjectURL(file));
            return false;
        }
    };

    const handleAdminUploadLogo = async (values) => {
        if (!uploadFile) { message.error('Select a file'); return; }
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('name', values.name);
            fd.append('school_id', values.school_id);
            fd.append('logo', uploadFile);
            await adminUploadLogo(fd);
            message.success('Logo uploaded & approved');
            setUploadLogoModal(false);
            logoForm.resetFields();
            setUploadFile(null); setUploadPreview(null);
            fetchLogos();
        } catch (err) { message.error(err.response?.data?.message || 'Upload failed'); }
        finally { setUploading(false); }
    };

    const handleAdminUploadDesign = async (values) => {
        if (!uploadFile) {
            message.error('Select a file');
            return;
        }

        setUploading(true);

        try {
            const fd = new FormData();

            fd.append('name', values.name);

            if (values.class_id) {
                fd.append('class_id', values.class_id);
            }

            fd.append('designColor', designColor); // <-- yahan

            fd.append('design', uploadFile);

            await adminUploadBackDesign(fd);

            message.success('Back design uploaded & approved');
            setUploadDesignModal(false);
            designForm.resetFields();
            setUploadFile(null);
            setUploadPreview(null);
            fetchBackDesigns();

        } catch (err) {
            message.error(err.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const getStatusTag = (status) => {
        if (status === Status.ACTIVE) return <Tag color="success" icon={<CheckCircleOutlined />}>Approved</Tag>;
        if (status === Status.INACTIVE) return <Tag color="warning" icon={<CheckCircleOutlined />}>Pending</Tag>;
        if (status === Status.DELETED) return <Tag color="error" icon={<CloseCircleOutlined />}>Rejected</Tag>;
        return <Tag color="default" icon={<ClockCircleOutlined />}>Pending</Tag>;
    };

    const logoColumns = [
        {
            title: 'Preview',
            dataIndex: 'file_path',
            key: 'file_path',
            render: (path) => (
                <Image
                    width={80}
                    height={80}
                    src={getUploadsUrl(path)}
                    fallback="https://via.placeholder.com/80?text=No+Logo"
                    style={{ borderRadius: 8, objectFit: 'contain', border: '1px solid #f0f0f0' }}
                />
            ),
        },
        { title: 'Name', dataIndex: 'name', key: 'name', render: (t) => <Typography.Text strong>{t || '—'}</Typography.Text> },
        {
            title: 'School',
            key: 'school',
            render: (_, record) => <Typography.Text>{record.school?.name || '—'}</Typography.Text>,
        },
        {
            title: 'Uploaded By',
            key: 'user',
            render: (_, record) => (
                <Space direction="vertical" size={0}>
                    <Typography.Text>{record.user?.name || '—'}</Typography.Text>
                    {record.user?.email && <Typography.Text type="secondary" style={{ fontSize: 12 }}>{record.user.email}</Typography.Text>}
                </Space>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => getStatusTag(status),
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Tooltip title="Approve">
                        <Popconfirm
                            title="Approve this logo?"
                            onConfirm={() => handleApprove(record.id, 'logo')}
                            okText="Yes"
                            cancelText="No"
                        >
                            <Button
                                type="text"
                                shape="circle"
                                icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                                disabled={record.status === Status.ACTIVE}
                            />
                        </Popconfirm>
                    </Tooltip>
                    <Tooltip title="Reject">
                        <Button
                            type="text"
                            shape="circle"
                            icon={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                            disabled={record.status === Status.DELETED}
                            onClick={() => handleReject(record.id, 'logo')}
                        />
                    </Tooltip>
                    <Tooltip title="Permanent Delete">
                        <Popconfirm
                            title="Permanently delete this logo?"
                            description="This action cannot be undone!"
                            onConfirm={() => handlePermanentDelete(record.id, 'logo', record.name)}
                            okText="Delete Forever"
                            okType="danger"
                            cancelText="Cancel"
                        >
                            <Button
                                type="text"
                                shape="circle"
                                icon={<DeleteOutlined style={{ color: '#ff4d4f' }} />}
                                danger
                            />
                        </Popconfirm>
                    </Tooltip>
                </Space>
            ),
        },
    ];

 const designColumns = [
    {
        title: 'Preview',
        dataIndex: 'file_path',
        key: 'file_path',
        render: (path) => (
            <Image
                width={80}
                height={80}
                src={getUploadsUrl(path)}
                fallback="https://via.placeholder.com/80?text=No+Design"
                style={{ borderRadius: 8, objectFit: 'contain', border: '1px solid #f0f0f0' }}
            />
        ),
    },
    {
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
        render: (t) => <Typography.Text strong>{t || '—'}</Typography.Text>
    },
    {
        title: 'Class',
        key: 'class',
        render: (_, record) => (
            <Typography.Text>
                {record.class?.name || '—'}
            </Typography.Text>
        ),
    },
    {
        title: 'School',
        key: 'school',
        render: (_, record) => (
            <Typography.Text>
                {record.class?.school?.name || '—'}
            </Typography.Text>
        ),
    },
    {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: (status) => getStatusTag(status),
    },
    {
        title: 'Action',
        key: 'action',
        render: (_, record) => (
            <Space>
                <Tooltip title="Approve">
                    <Popconfirm
                        title="Approve this design?"
                        onConfirm={() => handleApprove(record.id, 'design')}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button
                            type="text"
                            shape="circle"
                            icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                            disabled={record.status === Status.ACTIVE}
                        />
                    </Popconfirm>
                </Tooltip>

                <Tooltip title="Reject">
                    <Button
                        type="text"
                        shape="circle"
                        icon={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                        disabled={record.status === Status.DELETED}
                        onClick={() => handleReject(record.id, 'design')}
                    />
                </Tooltip>

                <Tooltip title="Permanent Delete">
                    <Popconfirm
                        title="Permanently delete this design?"
                        description="This action cannot be undone!"
                        onConfirm={() => handlePermanentDelete(record.id, 'design', record.name)}
                        okText="Delete Forever"
                        okType="danger"
                        cancelText="Cancel"
                    >
                        <Button
                            type="text"
                            shape="circle"
                            icon={<DeleteOutlined style={{ color: '#ff4d4f' }} />}
                            danger
                        />
                    </Popconfirm>
                </Tooltip>
            </Space>
        ),
    },
];

    return (
        <div className="fade-in">
            <div style={{ marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>Review Uploads</Title>
                <Typography.Text type="secondary">Review and approve class logos and back designs</Typography.Text>
            </div>

            <Card className="glass-card" style={{ border: 'none' }}>
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    animated={{ inkBar: true, tabPane: true }}
                    tabBarExtraContent={
                        activeTab === '1' ? (
                            <Button type="primary" size="small" icon={<PlusOutlined />}
                                onClick={() => { setUploadFile(null); setUploadPreview(null); logoForm.resetFields(); setUploadLogoModal(true); }}>
                                Upload Logo
                            </Button>
                        ) : (
                            <Button size="small" icon={<PlusOutlined />}
                                onClick={() => { setUploadFile(null); setUploadPreview(null); designForm.resetFields(); setUploadDesignModal(true); }}>
                                Upload Back Design
                            </Button>
                        )
                    }
                >
                    <TabPane
                        tab={
                            <span>
                                <FileImageOutlined />
                                Logos
                            </span>
                        }
                        key="1"
                    >
                        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                            <Select
                                placeholder="Status"
                                allowClear
                                style={{ width: 140 }}
                                options={STATUS_FILTER_OPTIONS}
                                value={logoPagination.status || undefined}
                                onChange={(v) => setLogoPagination(prev => ({ ...prev, status: v ?? '', current: 1 }))}
                            />
                            <Input.Search
                                placeholder="Search by name"
                                allowClear
                                enterButton
                                style={{ width: 260 }}
                                onSearch={(v) => setLogoPagination(prev => ({ ...prev, search: v ?? '', current: 1 }))}
                            />
                        </div>
                        <Table
                            columns={logoColumns}
                            dataSource={logos}
                            rowKey="id"
                            loading={loading}
                            pagination={{
                                current: logoPagination.current,
                                pageSize: logoPagination.limit,
                                total: logoPagination.total,
                                showSizeChanger: true,
                                showTotal: (total, range) =>
                                    `Showing ${range[0]}-${range[1]} of ${total} (Page ${logoPagination.current} of ${logoPagination.totalPages})`,
                                onChange: (page, pageSize) => {
                                    setLogoPagination(prev => ({
                                        ...prev,
                                        current: page,
                                        limit: pageSize,
                                    }));
                                },
                            }}
                        />
                    </TabPane>
                    <TabPane
                        tab={
                            <span>
                                <EyeOutlined />
                                Back Designs
                            </span>
                        }
                        key="2"
                    >
                        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                            <Select
                                placeholder="Status"
                                allowClear
                                style={{ width: 140 }}
                                options={STATUS_FILTER_OPTIONS}
                                value={designPagination.status || undefined}
                                onChange={(v) => setDesignPagination(prev => ({ ...prev, status: v ?? '', current: 1 }))}
                            />
                            <Input.Search
                                placeholder="Search by name"
                                allowClear
                                enterButton
                                style={{ width: 260 }}
                                onSearch={(v) => setDesignPagination(prev => ({ ...prev, search: v ?? '', current: 1 }))}
                            />
                        </div>
                        <Table
                            columns={designColumns}
                            dataSource={backDesigns}
                            rowKey="id"
                            loading={loading}
                            pagination={{
                                current: designPagination.current,
                                pageSize: designPagination.limit,
                                total: designPagination.total,
                                showSizeChanger: true,
                                showTotal: (total, range) =>
                                    `Showing ${range[0]}-${range[1]} of ${total} (Page ${designPagination.current} of ${designPagination.totalPages})`,
                                onChange: (page, pageSize) => {
                                    setDesignPagination(prev => ({
                                        ...prev,
                                        current: page,
                                        limit: pageSize,
                                    }));
                                },
                            }}
                        />
                    </TabPane>
                </Tabs>
            </Card>

            {/* Admin Upload Logo Modal */}
            <Modal title="Upload Logo (Approved)" open={uploadLogoModal}
                onCancel={() => { setUploadLogoModal(false); setUploadFile(null); setUploadPreview(null); }}
                footer={null} destroyOnHidden>
                <Form form={logoForm} layout="vertical" onFinish={handleAdminUploadLogo} style={{ marginTop: 16 }}>
                    <Form.Item name="name" label="Logo Name" rules={[{ required: true }]}>
                        <Input placeholder="e.g. School Logo 2025" />
                    </Form.Item>
                    <Form.Item name="school_id" label="School" rules={[{ required: true }]}>
                        <Select placeholder="Select school" options={schools.map(s => ({ value: s.id, label: s.name }))} showSearch optionFilterProp="label" />
                    </Form.Item>
                    <Form.Item label="Logo File" required>
                        {!uploadPreview && (
                            <Upload beforeUpload={handleFileSelect} showUploadList={false} accept="image/*">
                                <Button type="dashed" icon={<InboxOutlined />} block style={{ height: 80 }}>
                                    {uploadFile ? `✓ ${uploadFile.name}` : 'Click to select image'}
                                </Button>
                            </Upload>
                        )}
                        {uploadPreview && <img src={uploadPreview} alt="preview" style={{ marginTop: 8, maxWidth: '100%', maxHeight: 150, objectFit: 'contain' }} />}
                    </Form.Item>
                    <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
                        <Space>
                            <Button onClick={() => setUploadLogoModal(false)}>Cancel</Button>
                            <Button type="primary" htmlType="submit" loading={uploading}>Upload & Approve</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Admin Upload Back Design Modal */}
            <Modal title="Upload Back Design (Approved)" open={uploadDesignModal}
                onCancel={() => { setUploadDesignModal(false); setUploadFile(null); setUploadPreview(null); }}
                footer={null} destroyOnHidden>
                <Form form={designForm} layout="vertical" onFinish={handleAdminUploadDesign} style={{ marginTop: 16 }}>
                    <Form.Item name="name" label="Design Name" rules={[{ required: true }]}>
                        <Input placeholder="e.g. Berlin Back Design" />
                    </Form.Item>
                    <Form.Item name="class_id" label="Assign to Class (optional)" tooltip="Leave empty for library design">
                        <Select placeholder="Select class (optional)" allowClear options={classes.map(c => ({ value: c.id, label: `${c.name} — ${c.school?.name || ''}` }))} showSearch optionFilterProp="label" />
                    </Form.Item>
                    <Form.Item
                        name="designColor"
                        label="Design Color"
                        initialValue="white"
                    >
                        <div>
                            <Space style={{ marginTop: 8 }}>
                                {[
                                    { value: 'white', label: 'White', bg: '#ffffff', border: '#d9d9d9', printColor: 'Black print' },
                                    { value: 'black', label: 'Black', bg: '#1a1a1a', border: '#1a1a1a', printColor: 'White print' },
                                    { value: 'normal', label: 'Normal', bg: '#1a1a1a', border: '#1a1a1a', printColor: 'Orignal print' }
                                ].map(opt => (
                                    <div
                                        key={opt.value}
                                        onClick={() => {
                                            setDesignColor(opt.value);
                                            designForm.setFieldValue('designColor', opt.value);
                                        }}
                                        style={{
                                            padding: '6px 14px',
                                            borderRadius: 8,
                                            cursor: 'pointer',
                                            border: designColor === opt.value
                                                ? '2px solid #00b96b'
                                                : '1px solid #d9d9d9',
                                            background: designColor === opt.value
                                                ? '#f6ffed'
                                                : '#fff',
                                            fontWeight: 500
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 500 }}>{opt.label}</div>
                                            <div style={{ fontSize: 11, color: '#888' }}>{opt.printColor}</div>
                                        </div>
                                    </div>
                                ))}
                            </Space>
                        </div>
                    </Form.Item>
                    <Form.Item label="Design File" required>

                        {!uploadPreview && (
                            <Upload beforeUpload={handleFileSelect} showUploadList={false} accept="image/*">
                                <Button type="dashed" icon={<InboxOutlined />} block style={{ height: 80 }}>
                                    {uploadFile ? `✓ ${uploadFile.name}` : 'Click to select image'}
                                </Button>
                            </Upload>
                        )}
                        {uploadPreview && <img src={uploadPreview} alt="preview" style={{ marginTop: 8, maxWidth: '100%', maxHeight: 150, objectFit: 'contain' }} />}
                    </Form.Item>
                    <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
                        <Space>
                            <Button onClick={() => setUploadDesignModal(false)}>Cancel</Button>
                            <Button style={{ color: 'white' }} type="primary" htmlType="submit" loading={uploading}>Upload & Approve</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div >
    );
};

export default ReviewUploadsPage;
