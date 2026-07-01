import React, { useState, useEffect, useRef } from 'react';
import {
    Table, Button, Card, Typography, Space, Tag, Tabs,
    message, Image, Popconfirm, Tooltip, Input, Select, Modal, Upload, Form, Checkbox, Dropdown
} from 'antd';
import {
    CheckCircleOutlined, CloseCircleOutlined, EyeOutlined,
    FileImageOutlined, ClockCircleOutlined, PlusOutlined, InboxOutlined, DeleteOutlined, GlobalOutlined, EditOutlined, MoreOutlined
} from '@ant-design/icons';
import {
    getAllLogos, approveLogo, rejectLogo, adminPermanentDeleteLogo,
    getAllBackDesigns, approveBackDesign, rejectBackDesign, adminPermanentDeleteBackDesign,
    adminUploadLogo, adminUploadBackDesign, adminEditBackDesign,
    getAllSchools, getAllClasses
} from '../api/api';
import { Status, getUploadsUrl, getBackDesignDisplayUrl } from '../utils/constants';

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
    const [adminForAllStudents, setAdminForAllStudents] = useState(false);

    // Admin upload state
    const [uploadLogoModal, setUploadLogoModal] = useState(false);
    const [uploadDesignModal, setUploadDesignModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadPreview, setUploadPreview] = useState(null);
    // Back design — two files
    const [uploadWhiteFile, setUploadWhiteFile] = useState(null);
    const [uploadWhitePreview, setUploadWhitePreview] = useState(null);
    const [uploadBlackFile, setUploadBlackFile] = useState(null);
    const [uploadBlackPreview, setUploadBlackPreview] = useState(null);

    // Edit back design state
    const [editDesignModal, setEditDesignModal] = useState(false);
    const [editingDesign, setEditingDesign] = useState(null);
    const [editDesignForm] = Form.useForm();
    const [editWhiteFile, setEditWhiteFile] = useState(null);
    const [editWhitePreview, setEditWhitePreview] = useState(null);
    const [editBlackFile, setEditBlackFile] = useState(null);
    const [editBlackPreview, setEditBlackPreview] = useState(null);
    const [editUploading, setEditUploading] = useState(false);
    const [editForAllStudents, setEditForAllStudents] = useState(false);
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
        if (!uploadWhiteFile) { message.error('Select the White design file'); return; }
        if (!uploadBlackFile) { message.error('Select the Black design file'); return; }

        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('name', values.name);
            if (values.class_id) fd.append('class_id', values.class_id);
            fd.append('design', uploadWhiteFile);
            fd.append('designColor', 'white');
            fd.append('design_2', uploadBlackFile);
            fd.append('designColor_2', 'black');
            fd.append('forAllStudents', adminForAllStudents ? 'true' : 'false');

            await adminUploadBackDesign(fd);

            message.success('Back design uploaded & approved');
            setUploadDesignModal(false);
            designForm.resetFields();
            setUploadWhiteFile(null); setUploadWhitePreview(null);
            setUploadBlackFile(null); setUploadBlackPreview(null);
            setAdminForAllStudents(false);
            fetchBackDesigns();
        } catch (err) {
            message.error(err.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const openEditDesignModal = (record) => {
        setEditingDesign(record);
        editDesignForm.setFieldsValue({
            name: record.name,
            class_id: record.class_id || undefined,
        });
        setEditForAllStudents(Boolean(record.forAllStudents));
        setEditWhiteFile(null);
        setEditWhitePreview(record.configured_file_path || record.file_path ? getBackDesignDisplayUrl(record) : null);
        setEditBlackFile(null);
        setEditBlackPreview(record.file_path_2 ? getUploadsUrl(record.file_path_2) : null);
        setEditDesignModal(true);
    };

    const handleEditDesign = async (values) => {
        if (!editingDesign) return;
        setEditUploading(true);
        try {
            const fd = new FormData();
            fd.append('name', values.name);
            if (values.class_id) {
                fd.append('class_id', values.class_id);
            } else {
                fd.append('class_id', '');
            }
            fd.append('forAllStudents', editForAllStudents ? 'true' : 'false');
            if (editWhiteFile) { fd.append('design', editWhiteFile); fd.append('designColor', 'white'); }
            if (editBlackFile) { fd.append('design_2', editBlackFile); fd.append('designColor_2', 'black'); }
            await adminEditBackDesign(editingDesign.id, fd);
            message.success('Back design updated');
            setEditDesignModal(false);
            setEditingDesign(null);
            setEditForAllStudents(false);
            fetchBackDesigns();
        } catch (err) {
            message.error(err.response?.data?.message || 'Update failed');
        } finally {
            setEditUploading(false);
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
            width: 60,
            render: (_, record) => (
                <Dropdown
                    trigger={['click']}
                    placement="bottomRight"
                    menu={{
                        items: [
                            {
                                key: 'approve',
                                icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
                                label: 'Approve',
                                disabled: record.status === Status.ACTIVE,
                                onClick: () => handleApprove(record.id, 'logo'),
                            },
                            {
                                key: 'reject',
                                icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
                                label: 'Reject',
                                disabled: record.status === Status.DELETED,
                                onClick: () => handleReject(record.id, 'logo'),
                            },
                            { type: 'divider' },
                            {
                                key: 'delete',
                                icon: <DeleteOutlined />,
                                label: 'Permanent Delete',
                                danger: true,
                                onClick: () => handlePermanentDelete(record.id, 'logo', record.name),
                            },
                        ],
                    }}
                >
                    <Button type="text" icon={<MoreOutlined style={{ fontSize: 18 }} />} />
                </Dropdown>
            ),
        },
    ];

    const designColumns = [
        {
            title: 'Preview',
            key: 'preview',
            width: 180,
            render: (_, record) => (
                <Tabs size="small" defaultActiveKey="white" style={{ width: 160 }} tabBarStyle={{ marginBottom: 4 }}>
                    <TabPane tab="White" key="white">
                        <div style={{ background: '#fafafa', borderRadius: 4, padding: 4, textAlign: 'center' }}>
                            <Image
                                width={80} height={70}
                                src={getBackDesignDisplayUrl(record)}
                                fallback="https://via.placeholder.com/80?text=—"
                                style={{ objectFit: 'contain' }}
                            />
                        </div>
                    </TabPane>
                    <TabPane tab="Black" key="black">
                        <div style={{ background: '#1a1a1a', borderRadius: 4, padding: 4, textAlign: 'center' }}>
                            {record.file_path_2 ? (
                                <Image
                                    width={80} height={70}
                                    src={getUploadsUrl(record.file_path_2)}
                                    fallback="https://via.placeholder.com/80?text=—"
                                    style={{ objectFit: 'contain' }}
                                />
                            ) : (
                                <Typography.Text style={{ color: '#555', fontSize: 10 }}>—</Typography.Text>
                            )}
                        </div>
                    </TabPane>
                </Tabs>
            ),
        },
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (t, record) => (
                <Space direction="vertical" size={2}>
                    <Typography.Text strong>{t || '—'}</Typography.Text>
                </Space>
            ),
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
            width: 60,
            render: (_, record) => (
                <Dropdown
                    trigger={['click']}
                    placement="bottomRight"
                    menu={{
                        items: [
                            {
                                key: 'edit',
                                icon: <EditOutlined style={{ color: '#00b96b' }} />,
                                label: 'Edit',
                                onClick: () => openEditDesignModal(record),
                            },
                            { type: 'divider' },
                            {
                                key: 'approve',
                                icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
                                label: 'Approve',
                                disabled: record.status === Status.ACTIVE,
                                onClick: () => handleApprove(record.id, 'design'),
                            },
                            {
                                key: 'reject',
                                icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
                                label: 'Reject',
                                disabled: record.status === Status.DELETED,
                                onClick: () => handleReject(record.id, 'design'),
                            },
                            { type: 'divider' },
                            {
                                key: 'delete',
                                icon: <DeleteOutlined />,
                                label: 'Permanent Delete',
                                danger: true,
                                onClick: () => handlePermanentDelete(record.id, 'design', record.name),
                            },
                        ],
                    }}
                >
                    <Button type="text" icon={<MoreOutlined style={{ fontSize: 18 }} />} />
                </Dropdown>
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
                                onClick={() => { setUploadFile(null); setUploadPreview(null); designForm.resetFields(); setAdminForAllStudents(false); setUploadDesignModal(true); }}>
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
                                    {uploadFile ? `${uploadFile.name}` : 'Click to select image'}
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
                onCancel={() => {
                    setUploadDesignModal(false);
                    setUploadFile(null); setUploadPreview(null);
                    setUploadWhiteFile(null); setUploadWhitePreview(null);
                    setUploadBlackFile(null); setUploadBlackPreview(null);
                    setAdminForAllStudents(false);
                }}
                footer={null} destroyOnHidden width={620}>
                <Form form={designForm} layout="vertical" onFinish={handleAdminUploadDesign} style={{ marginTop: 16 }}>
                    <Form.Item name="name" label="Design Name" rules={[{ required: true }]}>
                        <Input placeholder="e.g. Berlin Back Design" />
                    </Form.Item>
                    <Form.Item name="class_id" label="Assign to Class (optional)" tooltip="Leave empty for library design">
                        <Select placeholder="Select class (optional)" allowClear options={classes.map(c => ({ value: c.id, label: `${c.name} — ${c.school?.name || ''}` }))} showSearch optionFilterProp="label" />
                    </Form.Item>

                    {/* White design file */}
                    <Form.Item label="White Garment Design (Black print) *" required>
                        <Upload
                            beforeUpload={(file) => {
                                setUploadWhiteFile(file);
                                setUploadWhitePreview(URL.createObjectURL(file));
                                return false;
                            }}
                            showUploadList={false}
                            accept="image/*"
                        >
                            <Button type="dashed" icon={<InboxOutlined />} block style={{ height: 70 }}>
                                {uploadWhiteFile ? `${uploadWhiteFile.name}` : 'Click to select white version'}
                            </Button>
                        </Upload>
                        {uploadWhitePreview && (
                            <img src={uploadWhitePreview} alt="white preview"
                                style={{ marginTop: 8, maxWidth: '100%', maxHeight: 120, objectFit: 'contain', borderRadius: 6, background: '#fafafa', padding: 4 }} />
                        )}
                    </Form.Item>

                    {/* Black design file */}
                    <Form.Item label="Black Garment Design (White print) *" required>
                        <Upload
                            beforeUpload={(file) => {
                                setUploadBlackFile(file);
                                setUploadBlackPreview(URL.createObjectURL(file));
                                return false;
                            }}
                            showUploadList={false}
                            accept="image/*"
                        >
                            <Button type="dashed" icon={<InboxOutlined />} block style={{ height: 70 }}>
                                {uploadBlackFile ? `${uploadBlackFile.name}` : 'Click to select black version'}
                            </Button>
                        </Upload>
                        {uploadBlackPreview && (
                            <div style={{ marginTop: 8, background: '#1a1a1a', padding: 8, borderRadius: 6, textAlign: 'center' }}>
                                <img src={uploadBlackPreview} alt="black preview"
                                    style={{ maxWidth: '100%', maxHeight: 120, objectFit: 'contain' }} />
                            </div>
                        )}
                    </Form.Item>

                    <Form.Item label="For alle elever (Studietur bibliotek)">
                        <div
                            style={{
                                padding: '12px 16px', borderRadius: 8,
                                border: adminForAllStudents ? '1.5px solid #7c3aed' : '1px solid #f0f0f0',
                                background: adminForAllStudents ? '#f5f0ff' : '#fafafa', cursor: 'pointer',
                            }}
                            onClick={() => setAdminForAllStudents(v => !v)}
                        >
                            <Checkbox
                                checked={adminForAllStudents}
                                onChange={e => setAdminForAllStudents(e.target.checked)}
                                onClick={e => e.stopPropagation()}
                            >
                                <Space size={6}>
                                    <GlobalOutlined style={{ color: '#7c3aed' }} />
                                    <Typography.Text strong style={{ fontSize: 13 }}>For alle elever</Typography.Text>
                                </Space>
                            </Checkbox>
                            <div style={{ marginTop: 4, paddingLeft: 24, fontSize: 12, color: '#888' }}>
                                Markér dette for at tilføje designet til studietur-biblioteket (is_library: true)
                            </div>
                        </div>
                    </Form.Item>

                    <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
                        <Space>
                            <Button onClick={() => setUploadDesignModal(false)}>Cancel</Button>
                            <Button style={{ color: 'white' }} type="primary" htmlType="submit" loading={uploading}
                                disabled={!uploadWhiteFile || !uploadBlackFile}>
                                Upload & Approve
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
            {/* Edit Back Design Modal */}
            <Modal
                title="Edit Back Design"
                open={editDesignModal}
                onCancel={() => {
                    setEditDesignModal(false);
                    setEditingDesign(null);
                    setEditForAllStudents(false);
                }}
                footer={null}
                destroyOnHidden
                width={620}
            >
                <Form form={editDesignForm} layout="vertical" onFinish={handleEditDesign} style={{ marginTop: 16 }}>
                    <Form.Item name="name" label="Design Name" rules={[{ required: true }]}>
                        <Input placeholder="e.g. Berlin Back Design" />
                    </Form.Item>
                    <Form.Item name="class_id" label="Assign to Class (optional)" tooltip="Leave empty for library design">
                        <Select
                            placeholder="Select class (optional)"
                            allowClear
                            options={classes.map(c => ({ value: c.id, label: `${c.name} — ${c.school?.name || ''}` }))}
                            showSearch
                            optionFilterProp="label"
                        />
                    </Form.Item>

                    {/* White version */}
                    <Form.Item label="White Garment Design">
                        <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>
                            Leave empty to keep current file
                        </Typography.Text>
                        {editWhitePreview && (
                            <div style={{ marginBottom: 8, textAlign: 'center', background: '#fafafa', padding: 8, borderRadius: 6 }}>
                                <img src={editWhitePreview} alt="white" style={{ maxHeight: 100, maxWidth: '100%', objectFit: 'contain' }} />
                            </div>
                        )}
                        <Upload
                            beforeUpload={(file) => { setEditWhiteFile(file); setEditWhitePreview(URL.createObjectURL(file)); return false; }}
                            showUploadList={false} accept="image/*"
                        >
                            <Button type="dashed" icon={<InboxOutlined />} block style={{ height: 60 }}>
                                {editWhiteFile ? `${editWhiteFile.name}` : 'Click to replace white version'}
                            </Button>
                        </Upload>
                    </Form.Item>


                    {/* Black version */}
                    <Form.Item label="Black Garment Design">
                        <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>
                            Leave empty to keep current file
                        </Typography.Text>
                        {editBlackPreview && (
                            <div style={{ marginBottom: 8, textAlign: 'center', background: '#1a1a1a', padding: 8, borderRadius: 6 }}>
                                <img src={editBlackPreview} alt="black" style={{ maxHeight: 100, maxWidth: '100%', objectFit: 'contain' }} />
                            </div>
                        )}
                        <Upload
                            beforeUpload={(file) => { setEditBlackFile(file); setEditBlackPreview(URL.createObjectURL(file)); return false; }}
                            showUploadList={false} accept="image/*"
                        >
                            <Button type="dashed" icon={<InboxOutlined />} block style={{ height: 60 }}>
                                {editBlackFile ? `${editBlackFile.name}` : 'Click to replace black version'}
                            </Button>
                        </Upload>
                    </Form.Item>
                    <Form.Item label="For alle elever (Studietur bibliotek)">
                        <div
                            style={{
                                padding: '12px 16px', borderRadius: 8,
                                border: editForAllStudents ? '1.5px solid #7c3aed' : '1px solid #f0f0f0',
                                background: editForAllStudents ? '#f5f0ff' : '#fafafa', cursor: 'pointer',
                            }}
                            onClick={() => setEditForAllStudents(v => !v)}
                        >
                            <Checkbox
                                checked={editForAllStudents}
                                onChange={e => setEditForAllStudents(e.target.checked)}
                                onClick={e => e.stopPropagation()}
                            >
                                <Space size={6}>
                                    <GlobalOutlined style={{ color: '#7c3aed' }} />
                                    <Typography.Text strong style={{ fontSize: 13 }}>For alle elever</Typography.Text>
                                </Space>
                            </Checkbox>
                            <div style={{ marginTop: 4, paddingLeft: 24, fontSize: 12, color: '#888' }}>
                                Markér dette for at tilføje designet til studietur-biblioteket (is_library: true)
                            </div>
                        </div>
                    </Form.Item>

                    <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
                        <Space>
                            <Button onClick={() => setEditDesignModal(false)}>Cancel</Button>
                            <Button type="primary" htmlType="submit" loading={editUploading} style={{ color: 'white' }}>
                                Save Changes
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div >
    );
};

export default ReviewUploadsPage;
