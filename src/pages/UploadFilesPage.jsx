import React, { useState, useEffect } from 'react';
import {
    Card,
    Typography,
    Tabs,
    Upload,
    Button,
    Tag,
    message,
    Empty,
    Row,
    Col,
    Spin,
    Space
} from 'antd';
import {
    UploadOutlined,
    FileImageOutlined,
    PictureOutlined,
    InboxOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    CloseCircleOutlined
} from '@ant-design/icons';
import {
    getMyClass,
    uploadLogo,
    uploadBackDesign,
    getMyLogos,
    getMyBackDesigns
} from '../api/api';
import { getUploadsUrl, Status } from '../utils/constants';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const STATUS_MAP = {
    [Status.ACTIVE]: { label: 'Approved', color: 'success', icon: <CheckCircleOutlined /> },
    [Status.INACTIVE]: { label: 'Pending', color: 'processing', icon: <ClockCircleOutlined /> },
    [Status.DELETED]: { label: 'Rejected', color: 'error', icon: <CloseCircleOutlined /> },
};

const getStatusTag = (status) => {
    const s = STATUS_MAP[status] ?? STATUS_MAP[Status.INACTIVE];
    return <Tag color={s.color} icon={s.icon}>{s.label}</Tag>;
};

const UploadFilesPage = () => {
    const [myClass, setMyClass] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [myLogos, setMyLogos] = useState([]);
    const [myDesigns, setMyDesigns] = useState([]);
    const [libraryLoading, setLibraryLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('upload');
    const [selectedLogoFile, setSelectedLogoFile] = useState(null);
    const [selectedLogoPreview, setSelectedLogoPreview] = useState(null);
    const [selectedDesignFile, setSelectedDesignFile] = useState(null);
    const [selectedDesignPreview, setSelectedDesignPreview] = useState(null);

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

    const fetchMyLibrary = async () => {
        setLibraryLoading(true);
        try {
            const [logoRes, designRes] = await Promise.all([
                getMyLogos({ page: 1, limit: 50 }),
                getMyBackDesigns({ page: 1, limit: 50 })
            ]);
            setMyLogos(logoRes.data?.data ?? []);
            setMyDesigns(designRes.data?.data ?? []);
        } catch (error) {
            message.error('Failed to load your uploads');
        } finally {
            setLibraryLoading(false);
        }
    };

    useEffect(() => {
        fetchMyClass();
    }, []);

    useEffect(() => {
        if (myClass && activeTab === 'library') fetchMyLibrary();
    }, [myClass, activeTab]);

    useEffect(() => {
        return () => {
            if (selectedLogoPreview) URL.revokeObjectURL(selectedLogoPreview);
            if (selectedDesignPreview) URL.revokeObjectURL(selectedDesignPreview);
        };
    }, [selectedLogoPreview, selectedDesignPreview]);

    const clearLogoSelection = () => {
        if (selectedLogoPreview) URL.revokeObjectURL(selectedLogoPreview);
        setSelectedLogoFile(null);
        setSelectedLogoPreview(null);
    };
    const clearDesignSelection = () => {
        if (selectedDesignPreview) URL.revokeObjectURL(selectedDesignPreview);
        setSelectedDesignFile(null);
        setSelectedDesignPreview(null);
    };

    const handleFileSelect = (file, type) => {
        if (type === 'logo') {
            clearLogoSelection();
            setSelectedLogoFile(file);
            setSelectedLogoPreview(URL.createObjectURL(file));
        } else {
            clearDesignSelection();
            setSelectedDesignFile(file);
            setSelectedDesignPreview(URL.createObjectURL(file));
        }
        return false; // prevent Upload from auto-uploading
    };

    const handleUploadClick = async (type) => {
        const file = type === 'logo' ? selectedLogoFile : selectedDesignFile;
        if (!file) return;
        const formData = new FormData();
        const name = file.name ? file.name.replace(/\.[^/.]+$/, '') : (type === 'logo' ? 'logo' : 'back_design');
        formData.append('name', name);
        if (type === 'logo') {
            formData.append('logo', file);
        } else {
            formData.append('backDesign', file);
        }

        setUploading(true);
        try {
            if (type === 'logo') {
                await uploadLogo(formData);
                message.success('Logo uploaded');
                clearLogoSelection();
            } else {
                await uploadBackDesign(formData);
                message.success('Back design uploaded');
                clearDesignSelection();
            }
            fetchMyClass();
            fetchMyLibrary();
        } catch (error) {
            message.error(error.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    if (!myClass && !uploading) {
        return (
            <Card className="glass-card" style={{ margin: 24, textAlign: 'center' }}>
                <Empty description="No class assigned to you yet." />
            </Card>
        );
    }

    if (loading) return <Spin className="fade-in" style={{ display: 'block', margin: '24px auto' }} />; // or a spinner


    return (
        <div className="fade-in">
            <div style={{ marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>Upload Files</Title>
                <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                    Select file → preview → click Upload. Files appear in My library.
                </Text>
            </div>

            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                animated={{ inkBar: true, tabPane: true }}
                size="large"
            >
                <TabPane
                    tab={<span><UploadOutlined /> Upload</span>}
                    key="upload"
                >
                    <Row gutter={[24, 24]}>
                        <Col xs={24} lg={12}>
                            <Card
                                className="glass-card"
                                style={{ border: 'none', borderRadius: 12 }}
                                bodyStyle={{ padding: 24 }}
                            >
                                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                    <div>
                                        <Title level={5} style={{ margin: '0 0 4px 0' }}>
                                            <FileImageOutlined style={{ marginRight: 8, color: '#00b96b' }} />
                                            Class Logo
                                        </Title>
                                        <Text type="secondary">PNG, JPG up to 2MB</Text>
                                    </div>
                                    <Upload
                                        beforeUpload={(file) => handleFileSelect(file, 'logo')}
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
                                                borderRadius: 12,
                                                borderColor: '#d9d9d9'
                                            }}
                                        >
                                            Select logo (PNG, JPG up to 2MB)
                                        </Button>
                                    </Upload>
                                    {selectedLogoFile && (
                                        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
                                            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Preview</Text>
                                            <img
                                                src={selectedLogoPreview}
                                                alt="Preview"
                                                style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 8, border: '1px solid #f0f0f0', display: 'block' }}
                                            />
                                            <Space style={{ marginTop: 12 }}>
                                                <Button
                                                    type="primary"
                                                    loading={uploading}
                                                    icon={<UploadOutlined />}
                                                    onClick={() => handleUploadClick('logo')}
                                                >
                                                    Upload
                                                </Button>
                                                <Button onClick={clearLogoSelection} disabled={uploading}>Cancel</Button>
                                            </Space>
                                        </div>
                                    )}
                                    {/* {!selectedLogoFile && myClass?.logo_path && (
                                        <div style={{ textAlign: 'center', paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
                                            <Tag color="success">Current logo</Tag>
                                            <div style={{ marginTop: 12 }}>
                                                <img
                                                    src={getUploadsUrl(myClass.logo_path)}
                                                    alt="Class Logo"
                                                    style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 8, border: '1px solid #f0f0f0' }}
                                                />
                                            </div>
                                        </div>
                                    )} */}
                                </Space>
                            </Card>
                        </Col>
                        <Col xs={24} lg={12}>
                            <Card
                                className="glass-card"
                                style={{ border: 'none', borderRadius: 12 }}
                                bodyStyle={{ padding: 24 }}
                            >
                                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                    <div>
                                        <Title level={5} style={{ margin: '0 0 4px 0' }}>
                                            <PictureOutlined style={{ marginRight: 8, color: '#00b96b' }} />
                                            Back Design
                                        </Title>
                                        <Text type="secondary">PNG, JPG up to 5MB</Text>
                                    </div>
                                    <Upload
                                        beforeUpload={(file) => handleFileSelect(file, 'design')}
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
                                                borderRadius: 12,
                                                borderColor: '#d9d9d9'
                                            }}
                                        >
                                            Select back design (PNG, JPG up to 5MB)
                                        </Button>
                                    </Upload>
                                    {selectedDesignFile && (
                                        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
                                            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Preview</Text>
                                            <img
                                                src={selectedDesignPreview}
                                                alt="Preview"
                                                style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 8, border: '1px solid #f0f0f0', display: 'block' }}
                                            />
                                            <Space style={{ marginTop: 12 }}>
                                                <Button
                                                    type="primary"
                                                    loading={uploading}
                                                    icon={<UploadOutlined />}
                                                    onClick={() => handleUploadClick('design')}
                                                >
                                                    Upload
                                                </Button>
                                                <Button onClick={clearDesignSelection} disabled={uploading}>Cancel</Button>
                                            </Space>
                                        </div>
                                    )}
                                    {/* {!selectedDesignFile && myClass?.back_design_path && (
                                        <div style={{ textAlign: 'center', paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
                                            <Tag color="success">Current design</Tag>
                                            <div style={{ marginTop: 12 }}>
                                                <img
                                                    src={getUploadsUrl(myClass.back_design_path)}
                                                    alt="Back Design"
                                                    style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 8, border: '1px solid #f0f0f0' }}
                                                />
                                            </div>
                                        </div>
                                    )} */}
                                </Space>
                            </Card>
                        </Col>
                    </Row>
                </TabPane>

                <TabPane
                    tab={<span><InboxOutlined /> My library</span>}
                    key="library"
                >
                    <Card className="glass-card" style={{ border: 'none' }} bodyStyle={{ padding: 24 }}>
                        {libraryLoading ? (
                            <div style={{ textAlign: 'center', padding: 48 }}>
                                <Spin size="large" />
                            </div>
                        ) : (
                            <Tabs defaultActiveKey="logos" size="middle">
                                <TabPane tab={`Logos (${myLogos.length})`} key="logos">
                                    {myLogos.length === 0 ? (
                                        <Empty description="No logos uploaded yet" style={{ padding: 32 }} />
                                    ) : (
                                        <Row gutter={[16, 16]}>
                                            {myLogos.map((item) => (
                                                <Col xs={24} sm={12} md={8} lg={6} key={item.id}>
                                                    <Card
                                                        size="small"
                                                        cover={
                                                            <div style={{ padding: 12, background: '#fafafa', minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <img
                                                                    src={getUploadsUrl(item.file_path)}
                                                                    alt={item.name}
                                                                    style={{ maxWidth: '100%', maxHeight: 120, objectFit: 'contain' }}
                                                                />
                                                            </div>
                                                        }
                                                        style={{ borderRadius: 8 }}
                                                    >
                                                        <Text strong ellipsis style={{ display: 'block' }}>{item.name}</Text>
                                                        <div style={{ marginTop: 8 }}>{getStatusTag(item.status)}</div>
                                                    </Card>
                                                </Col>
                                            ))}
                                        </Row>
                                    )}
                                </TabPane>
                                <TabPane tab={`Back designs (${myDesigns.length})`} key="designs">
                                    {myDesigns.length === 0 ? (
                                        <Empty description="No back designs uploaded yet" style={{ padding: 32 }} />
                                    ) : (
                                        <Row gutter={[16, 16]}>
                                            {myDesigns.map((item) => (
                                                <Col xs={24} sm={12} md={8} lg={6} key={item.id}>
                                                    <Card
                                                        size="small"
                                                        cover={
                                                            <div style={{ padding: 12, background: '#fafafa', minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <img
                                                                    src={getUploadsUrl(item.file_path)}
                                                                    alt={item.name}
                                                                    style={{ maxWidth: '100%', maxHeight: 120, objectFit: 'contain' }}
                                                                />
                                                            </div>
                                                        }
                                                        style={{ borderRadius: 8 }}
                                                    >
                                                        <Text strong ellipsis style={{ display: 'block' }}>{item.name}</Text>
                                                        <div style={{ marginTop: 8 }}>{getStatusTag(item.status)}</div>
                                                    </Card>
                                                </Col>
                                            ))}
                                        </Row>
                                    )}
                                </TabPane>
                            </Tabs>
                        )}
                    </Card>
                </TabPane>
            </Tabs>
        </div>
    );
};

export default UploadFilesPage;
