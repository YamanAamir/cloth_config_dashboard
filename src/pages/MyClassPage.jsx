import React, { useState, useEffect } from 'react';
import {
    Button,
    Card,
    Typography,
    Space,
    Tag,
    Modal,
    message,
    Statistic,
    Row,
    Col,
    Spin,
    Drawer,
    Empty,
    Image,
    Upload,
    Tooltip,
    Input
} from 'antd';
import {
    TeamOutlined,
    BankOutlined,
    CalendarOutlined,
    LinkOutlined,
    PlusOutlined,
    UnorderedListOutlined,
    InboxOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    CloseCircleOutlined
} from '@ant-design/icons';
import {
    getMyClass,
    generateRegistrationLink,
    getMyLogos,
    uploadLogo,
    getAllBackDesignTemplates,
    selectBackDesignForClass,
    getClassBackDesign
} from '../api/api';
import NameListManager from '../components/NameListManager';
import { getUploadsUrl, Status } from '../utils/constants';

const { Title } = Typography;

const STATUS_MAP = {
    [Status.ACTIVE]: { label: 'Approved', color: 'success', icon: <CheckCircleOutlined /> },
    [Status.INACTIVE]: { label: 'Pending', color: 'processing', icon: <ClockCircleOutlined /> },
    [Status.DELETED]: { label: 'Rejected', color: 'error', icon: <CloseCircleOutlined /> },
};

const getStatusTag = (status) => {
    const s = STATUS_MAP[status] ?? STATUS_MAP[Status.INACTIVE];
    return <Tag color={s.color} icon={s.icon}>{s.label}</Tag>;
};

const MyClassPage = () => {
    const [myClass, setMyClass] = useState(null);
    const [loading, setLoading] = useState(false);
    const [registrationLinkModalOpen, setRegistrationLinkModalOpen] = useState(false);
    const [registrationLink, setRegistrationLink] = useState('');
    const [linkLoading, setLinkLoading] = useState(false);
    
    // Logo Gallery
    const [logos, setLogos] = useState([]);
    const [logosLoading, setLogosLoading] = useState(false);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [selectedLogoFile, setSelectedLogoFile] = useState(null);
    const [selectedLogoPreview, setSelectedLogoPreview] = useState(null);
    const [uploading, setUploading] = useState(false);

    // Back Design Selection
    const [backDesignModalOpen, setBackDesignModalOpen] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [templatesLoading, setTemplatesLoading] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [selectingDesign, setSelectingDesign] = useState(false);
    const [currentBackDesign, setCurrentBackDesign] = useState(null);
    const [loadingCurrentDesign, setLoadingCurrentDesign] = useState(false);

    const fetchMyClass = async () => {
        setLoading(true);
        try {
            const classRes = await getMyClass();
            setMyClass(classRes.data.data?.[0]);
        } catch (error) {
            message.error('Failed to fetch class details');
        } finally {
            setLoading(false);
        }
    };

    const fetchLogos = async () => {
        setLogosLoading(true);
        try {
            const response = await getMyLogos({ page: 1, limit: 50 });
            setLogos(response.data?.data ?? []);
        } catch (error) {
            message.error('Failed to load logos');
        } finally {
            setLogosLoading(false);
        }
    };

    const fetchTemplates = async () => {
        setTemplatesLoading(true);
        try {
            const response = await getAllBackDesignTemplates({ page: 1, limit: 100 });
            setTemplates(response.data?.data ?? []);
        } catch (error) {
            message.error('Failed to load templates');
        } finally {
            setTemplatesLoading(false);
        }
    };

    const fetchCurrentBackDesign = async () => {
        if (!myClass?.id) return;
        
        setLoadingCurrentDesign(true);
        try {
            const response = await getClassBackDesign(myClass.id);
            setCurrentBackDesign(response.data?.data);
        } catch (error) {
            console.error('Failed to load current back design');
        } finally {
            setLoadingCurrentDesign(false);
        }
    };

    useEffect(() => {
        fetchMyClass();
    }, []);

    useEffect(() => {
        if (myClass) {
            fetchLogos();
            fetchCurrentBackDesign();
        }
    }, [myClass]);

    useEffect(() => {
        return () => {
            if (selectedLogoPreview) URL.revokeObjectURL(selectedLogoPreview);
        };
    }, [selectedLogoPreview]);

    const handleGenerateRegistrationLink = async () => {
        setLinkLoading(true);
        try {
            const { data } = await generateRegistrationLink();
            const link = data?.data?.registrationLink || data?.registrationLink || '';
            setRegistrationLink(link);
            setRegistrationLinkModalOpen(true);
            if (link) message.success('Registration link generated');
            else message.warning('No link returned from server');
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to generate link');
        } finally {
            setLinkLoading(false);
        }
    };

    const copyRegistrationLink = () => {
        if (!registrationLink) return;
        navigator.clipboard.writeText(registrationLink).then(() => {
            message.success('Link copied to clipboard');
        }).catch(() => message.error('Failed to copy'));
    };

    const handleLogoFileSelect = (file) => {
        const isImage = file.type.startsWith('image/');
        if (!isImage) {
            message.error('Please select an image file');
            return false;
        }

        const isLt2M = file.size / 1024 / 1024 < 2;
        if (!isLt2M) {
            message.error('Image must be smaller than 2MB');
            return false;
        }

        if (selectedLogoPreview) URL.revokeObjectURL(selectedLogoPreview);
        setSelectedLogoFile(file);
        setSelectedLogoPreview(URL.createObjectURL(file));
        return false;
    };

    const handleLogoUpload = async () => {
        if (!selectedLogoFile) {
            message.error('Please select a logo file');
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            const name = selectedLogoFile.name ? selectedLogoFile.name.replace(/\.[^/.]+$/, '') : 'logo';
            formData.append('name', name);
            formData.append('logo', selectedLogoFile);

            await uploadLogo(formData);
            message.success('Logo uploaded successfully');
            
            // Reset and refresh
            if (selectedLogoPreview) URL.revokeObjectURL(selectedLogoPreview);
            setSelectedLogoFile(null);
            setSelectedLogoPreview(null);
            setUploadModalOpen(false);
            fetchLogos();
        } catch (error) {
            message.error(error.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleSelectBackDesign = async () => {
        if (!selectedTemplate) {
            message.error('Please select a template');
            return;
        }

        setSelectingDesign(true);
        try {
            await selectBackDesignForClass({ template_id: selectedTemplate });
            message.success('Back design selected successfully');
            setBackDesignModalOpen(false);
            setSelectedTemplate(null);
            fetchMyClass();
            fetchCurrentBackDesign();
        } catch (error) {
            message.error(error.response?.data?.message || 'Selection failed');
        } finally {
            setSelectingDesign(false);
        }
    };

    if (!myClass && !loading) {
        return (
            <Card className="glass-card" style={{ margin: 24, textAlign: 'center' }}>
                <Empty description="No class assigned to you yet." />
            </Card>
        );
    }

    if (loading) {
        return <Spin className="fade-in" style={{ display: 'block', margin: '24px auto' }} />;
    }

    return (
        <div className="fade-in">
            {/* Header */}
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <Title level={4} style={{ margin: 0 }}>My Class</Title>
                    <Typography.Text type="secondary">Manage class logos and student name list</Typography.Text>
                </div>
                <Space>
                    <Button
                        type="default"
                        icon={<LinkOutlined />}
                        loading={linkLoading}
                        onClick={handleGenerateRegistrationLink}
                    >
                        Registration Link
                    </Button>
                    {/* <Button
                        type="primary"
                        onClick={() => {
                            setBackDesignModalOpen(true);
                            fetchTemplates();
                        }}
                    >
                        Select Design Template
                    </Button> */}
                </Space>
            </div>

            {/* Class Info Cards */}
            <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} md={8}>
                    <Card className="glass-card" style={{ border: 'none' }}>
                        <Statistic
                            title={<span style={{ fontWeight: 500, color: '#666' }}>Class</span>}
                            value={myClass?.name}
                            prefix={
                                <div style={{
                                    background: '#00b96b15',
                                    padding: '8px',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: '12px'
                                }}>
                                    <TeamOutlined style={{ color: '#00b96b', fontSize: '30px' }} />
                                </div>
                            }
                            valueStyle={{ color: '#006d75', fontWeight: '500', fontSize: '30px' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <Card className="glass-card" style={{ border: 'none' }}>
                        <Statistic
                            title={<span style={{ fontWeight: 500, color: '#666' }}>School</span>}
                            value={myClass?.school?.name}
                            prefix={
                                <div style={{
                                    background: '#1890ff15',
                                    padding: '8px',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: '12px'
                                }}>
                                    <BankOutlined style={{ color: '#1890ff', fontSize: '30px' }} />
                                </div>
                            }
                            valueStyle={{ color: '#006d75', fontWeight: '500', fontSize: '30px' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <Card className="glass-card" style={{ border: 'none' }}>
                        <Statistic
                            title={<span style={{ fontWeight: 500, color: '#666' }}>Graduation Year</span>}
                            value={myClass?.graduation_year}
                            prefix={
                                <div style={{
                                    background: '#722ed115',
                                    padding: '8px',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: '12px'
                                }}>
                                    <CalendarOutlined style={{ color: '#722ed1', fontSize: '30px' }} />
                                </div>
                            }
                            valueStyle={{ color: '#006d75', fontWeight: '500', fontSize: '30px' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Logo Gallery */}
            <Card 
                className="glass-card" 
                style={{ border: 'none', marginBottom: 24 }}
                title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Current Back Design</span>
                    </div>
                }
            >
                {loadingCurrentDesign ? (
                    <div style={{ textAlign: 'center', padding: 48 }}>
                        <Spin size="large" />
                    </div>
                ) : !currentBackDesign ? (
                    <Empty 
                        description="No back design selected yet" 
                        style={{ padding: 48 }}
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                    >
                        {/* <Button 
                            type="primary"
                            onClick={() => {
                                setBackDesignModalOpen(true);
                                fetchTemplates();
                            }}
                        >
                            Select Design Template
                        </Button> */}
                    </Empty>
                ) : (
                    <Row gutter={[16, 16]}>
                        <Col xs={24} md={12}>
                            <div style={{ 
                                padding: 16, 
                                background: '#fafafa', 
                                borderRadius: 8,
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                minHeight: 300
                            }}>
                                <Image
                                    src={`${getUploadsUrl(currentBackDesign.file_path)}?t=${new Date(currentBackDesign.updated_at || currentBackDesign.created_at).getTime()}`}
                                    alt={currentBackDesign.name}
                                    style={{ maxWidth: '100%', maxHeight: 400, objectFit: 'contain' }}
                                    preview={{
                                        mask: 'View Full Size'
                                    }}
                                />
                            </div>
                        </Col>
                        <Col xs={24} md={12}>
                            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                <div>
                                    <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Design Name</Typography.Text>
                                    <Typography.Text strong style={{ fontSize: 16 }}>{currentBackDesign.name}</Typography.Text>
                                </div>
                                <div>
                                    <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Type</Typography.Text>
                                    <Tag color={currentBackDesign.is_library ? 'blue' : 'green'}>
                                        {currentBackDesign.is_library ? 'Design Template' : 'Custom Back Design'}
                                    </Tag>
                                </div>
                                <div>
                                    <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Status</Typography.Text>
                                    {getStatusTag(currentBackDesign.status)}
                                </div>
                                <div>
                                    <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Created</Typography.Text>
                                    <Typography.Text>{new Date(currentBackDesign.created_at).toLocaleDateString()}</Typography.Text>
                                </div>
                                {/* <Button 
                                    type="default"
                                    onClick={() => {
                                        setBackDesignModalOpen(true);
                                        fetchTemplates();
                                    }}
                                    block
                                >
                                    Change Design Template
                                </Button> */}
                            </Space>
                        </Col>
                    </Row>
                )}
            </Card>

            {/* Logo Gallery */}
            <Card 
                className="glass-card" 
                style={{ border: 'none' }}
                title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Class Logo Gallery</span>
                        {/* <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setUploadModalOpen(true)}
                        >
                            Add Logo
                        </Button> */}
                    </div>
                }
            >
                {logosLoading ? (
                    <div style={{ textAlign: 'center', padding: 48 }}>
                        <Spin size="large" />
                    </div>
                ) : logos.length === 0 ? (
                    <Empty 
                        description="No logos uploaded yet" 
                        style={{ padding: 48 }}
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                    >
                        <Button 
                            type="primary" 
                            icon={<PlusOutlined />}
                            onClick={() => setUploadModalOpen(true)}
                        >
                            Upload First Logo
                        </Button>
                    </Empty>
                ) : (
                    <Row gutter={[16, 16]}>
                        {logos.map((logo) => (
                            <Col xs={12} sm={8} md={6} lg={4} key={logo.id}>
                                <Card
                                    hoverable
                                    cover={
                                        <div style={{ 
                                            padding: 16, 
                                            background: '#fafafa', 
                                            height: 150, 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center' 
                                        }}>
                                            <Image
                                                src={getUploadsUrl(logo.file_path)}
                                                alt={logo.name}
                                                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                                preview={{
                                                    mask: 'View'
                                                }}
                                            />
                                        </div>
                                    }
                                    style={{ borderRadius: 8 }}
                                    bodyStyle={{ padding: 12 }}
                                >
                                    <Tooltip title={logo.name}>
                                        <Typography.Text strong ellipsis style={{ display: 'block', marginBottom: 8 }}>
                                            {logo.name}
                                        </Typography.Text>
                                    </Tooltip>
                                    {getStatusTag(logo.status)}
                                </Card>
                            </Col>
                        ))}
                    </Row>
                )}
            </Card>

            {/* Upload Logo Modal */}
            <Modal
                title="Upload Class Logo"
                open={uploadModalOpen}
                onCancel={() => {
                    setUploadModalOpen(false);
                    if (selectedLogoPreview) URL.revokeObjectURL(selectedLogoPreview);
                    setSelectedLogoFile(null);
                    setSelectedLogoPreview(null);
                }}
                footer={[
                    <Button 
                        key="cancel" 
                        onClick={() => {
                            setUploadModalOpen(false);
                            if (selectedLogoPreview) URL.revokeObjectURL(selectedLogoPreview);
                            setSelectedLogoFile(null);
                            setSelectedLogoPreview(null);
                        }}
                    >
                        Cancel
                    </Button>,
                    <Button
                        key="upload"
                        type="primary"
                        loading={uploading}
                        onClick={handleLogoUpload}
                        disabled={!selectedLogoFile}
                    >
                        Upload Logo
                    </Button>
                ]}
                destroyOnHidden
            >
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div>
                        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                            Select logo file (PNG, JPG up to 2MB)
                        </Typography.Text>
                        <Upload
                            beforeUpload={handleLogoFileSelect}
                            showUploadList={false}
                            accept="image/*"
                            disabled={uploading}
                        >
                            <Button
                                type="dashed"
                                icon={<InboxOutlined />}
                                block
                                size="large"
                                style={{
                                    height: 100,
                                    borderStyle: 'dashed',
                                    borderWidth: 2,
                                    borderColor: selectedLogoFile ? '#00b96b' : '#d9d9d9'
                                }}
                            >
                                {selectedLogoFile ? '✓ Logo Selected - Click to Change' : 'Click to Select Logo'}
                            </Button>
                        </Upload>
                    </div>

                    {selectedLogoPreview && (
                        <div>
                            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                                Preview
                            </Typography.Text>
                            <div style={{ 
                                padding: 16, 
                                background: '#fafafa', 
                                borderRadius: 8, 
                                textAlign: 'center',
                                border: '1px solid #f0f0f0'
                            }}>
                                <img
                                    src={selectedLogoPreview}
                                    alt="Preview"
                                    style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }}
                                />
                            </div>
                            <Typography.Text type="success" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                                ✓ {selectedLogoFile.name}
                            </Typography.Text>
                        </div>
                    )}
                </Space>
            </Modal>

            {/* Registration Link Modal */}
            <Modal
                title="Registration Link for Students"
                open={registrationLinkModalOpen}
                onCancel={() => setRegistrationLinkModalOpen(false)}
                footer={[
                    <Button key="close" onClick={() => setRegistrationLinkModalOpen(false)}>
                        Close
                    </Button>,
                    <Button 
                        key="copy" 
                        type="primary" 
                        onClick={copyRegistrationLink} 
                        disabled={!registrationLink}
                    >
                        Copy Link
                    </Button>,
                ]}
                destroyOnHidden
            >
                <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                    Share this link with students so they can register and join your class.
                </Typography.Text>
                <Input.TextArea
                    readOnly
                    value={registrationLink}
                    rows={3}
                    style={{ fontFamily: 'monospace', fontSize: 12 }}
                />
            </Modal>

            {/* Back Design Selection Modal */}
            <Modal
                title="Select Design Template"
                open={backDesignModalOpen}
                onCancel={() => {
                    setBackDesignModalOpen(false);
                    setSelectedTemplate(null);
                }}
                footer={[
                    <Button 
                        key="cancel" 
                        onClick={() => {
                            setBackDesignModalOpen(false);
                            setSelectedTemplate(null);
                        }}
                    >
                        Cancel
                    </Button>,
                    <Button
                        key="select"
                        type="primary"
                        loading={selectingDesign}
                        onClick={handleSelectBackDesign}
                        disabled={!selectedTemplate}
                    >
                        Select Design
                    </Button>
                ]}
                width={800}
                destroyOnHidden
            >
                {templatesLoading ? (
                    <div style={{ textAlign: 'center', padding: 48 }}>
                        <Spin size="large" />
                    </div>
                ) : templates.length === 0 ? (
                    <Empty 
                        description="No templates available" 
                        style={{ padding: 48 }}
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                ) : (
                    <Row gutter={[16, 16]}>
                        {templates.map((template) => (
                            <Col xs={12} sm={8} md={6} key={template.id}>
                                <Card
                                    hoverable
                                    onClick={() => setSelectedTemplate(template.id)}
                                    style={{
                                        borderRadius: 8,
                                        border: selectedTemplate === template.id ? '2px solid #00b96b' : '1px solid #f0f0f0',
                                        cursor: 'pointer'
                                    }}
                                    cover={
                                        <div style={{ 
                                            padding: 16, 
                                            background: '#fafafa', 
                                            height: 150, 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center' 
                                        }}>
                                            <Image
                                                src={getUploadsUrl(template.file_path)}
                                                alt={template.name}
                                                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                                preview={{
                                                    mask: 'View'
                                                }}
                                            />
                                        </div>
                                    }
                                    bodyStyle={{ padding: 12 }}
                                >
                                    <Tooltip title={template.name}>
                                        <Typography.Text strong ellipsis style={{ display: 'block' }}>
                                            {template.name}
                                        </Typography.Text>
                                    </Tooltip>
                                    {selectedTemplate === template.id && (
                                        <CheckCircleOutlined style={{ color: '#00b96b', fontSize: 20, position: 'absolute', top: 8, right: 8 }} />
                                    )}
                                </Card>
                            </Col>
                        ))}
                    </Row>
                )}
            </Modal>
        </div>
    );
};

export default MyClassPage;
