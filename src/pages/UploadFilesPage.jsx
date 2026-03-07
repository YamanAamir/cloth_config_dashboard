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
    Space,
    Modal
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
    const [activeTab, setActiveTab] = useState('logos');
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [uploadType, setUploadType] = useState('logo'); // 'logo' or 'design'
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
            // Only show designs NOT from configurator (direct uploads)
            const filteredDesigns = designRes.data?.data?.filter(design => design.isFromConfigurator !== true) ?? [];
            setMyDesigns(filteredDesigns);
        } catch (error) {
            message.error('Failed to load your uploads');
        } finally {
            setLibraryLoading(false);
        }
    };

    useEffect(() => {
        fetchMyClass();
        return () => {
            if (selectedLogoPreview) URL.revokeObjectURL(selectedLogoPreview);
            if (selectedDesignPreview) URL.revokeObjectURL(selectedDesignPreview);
        };
    }, []);

    useEffect(() => {
        if (myClass) {
            fetchMyLibrary();
        }
    }, [myClass]);

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
        if (!file) {
            message.error('Please select a file');
            return;
        }
        
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
            setUploadModalOpen(false);
            fetchMyLibrary();
        } catch (error) {
            message.error(error.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const openUploadModal = (type) => {
        setUploadType(type);
        setUploadModalOpen(true);
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
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Title level={4} style={{ margin: 0 }}>Upload Files</Title>
                    <Text type="secondary">
                        Manage your class logos and back designs
                    </Text>
                </div>
            </div>

            <Card className="glass-card" style={{ border: 'none' }}>
                <Tabs 
                    activeKey={activeTab} 
                    onChange={setActiveTab}
                    tabBarExtraContent={
                        <Button
                            type="primary"
                            icon={<UploadOutlined />}
                            onClick={() => openUploadModal(activeTab === 'logos' ? 'logo' : 'design')}
                        >
                            {activeTab === 'logos' ? 'Add Logo' : 'Add Back Design'}
                        </Button>
                    }
                >
                    <TabPane 
                        tab={<span><FileImageOutlined /> Logos ({myLogos.length})</span>} 
                        key="logos"
                    >
                        {libraryLoading ? (
                            <div style={{ textAlign: 'center', padding: 48 }}>
                                <Spin size="large" />
                            </div>
                        ) : myLogos.length === 0 ? (
                            <Empty 
                                description="No logos uploaded yet" 
                                style={{ padding: 48 }}
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                            >
                                <Button 
                                    type="primary" 
                                    icon={<UploadOutlined />}
                                    onClick={() => openUploadModal('logo')}
                                >
                                    Upload First Logo
                                </Button>
                            </Empty>
                        ) : (
                            <Row gutter={[16, 16]}>
                                {myLogos.map((item) => (
                                    <Col xs={12} sm={8} md={6} lg={4} key={item.id}>
                                        <Card
                                            hoverable
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
                    
                    <TabPane 
                        tab={<span><PictureOutlined /> Back Designs ({myDesigns.length})</span>} 
                        key="designs"
                    >
                        {libraryLoading ? (
                            <div style={{ textAlign: 'center', padding: 48 }}>
                                <Spin size="large" />
                            </div>
                        ) : myDesigns.length === 0 ? (
                            <Empty 
                                description="No back designs uploaded yet" 
                                style={{ padding: 48 }}
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                            >
                                <Button 
                                    type="primary" 
                                    icon={<UploadOutlined />}
                                    onClick={() => openUploadModal('design')}
                                >
                                    Upload First Back Design
                                </Button>
                            </Empty>
                        ) : (
                            <Row gutter={[16, 16]}>
                                {myDesigns.map((item) => (
                                    <Col xs={12} sm={8} md={6} lg={4} key={item.id}>
                                        <Card
                                            hoverable
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
                                            {console.log(getUploadsUrl(item.file_path))}
                                            <Text strong ellipsis style={{ display: 'block' }}>{item.name}</Text>
                                            <div style={{ marginTop: 8 }}>{getStatusTag(item.status)}</div>
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                        )}
                    </TabPane>
                </Tabs>
            </Card>

            {/* Upload Modal */}
            <Modal
                title={uploadType === 'logo' ? 'Upload Logo' : 'Upload Back Design'}
                open={uploadModalOpen}
                onCancel={() => {
                    setUploadModalOpen(false);
                    clearLogoSelection();
                    clearDesignSelection();
                }}
                footer={[
                    <Button 
                        key="cancel" 
                        onClick={() => {
                            setUploadModalOpen(false);
                            clearLogoSelection();
                            clearDesignSelection();
                        }}
                    >
                        Cancel
                    </Button>,
                    <Button
                        key="upload"
                        type="primary"
                        loading={uploading}
                        onClick={() => handleUploadClick(uploadType)}
                        disabled={uploadType === 'logo' ? !selectedLogoFile : !selectedDesignFile}
                    >
                        Upload
                    </Button>
                ]}
                destroyOnClose
            >
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                            {uploadType === 'logo' 
                                ? 'Select logo file (PNG, JPG up to 2MB)' 
                                : 'Select back design file (PNG, JPG up to 5MB)'}
                        </Text>
                        <Upload
                            beforeUpload={(file) => handleFileSelect(file, uploadType)}
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
                                    borderColor: (uploadType === 'logo' ? selectedLogoFile : selectedDesignFile) ? '#00b96b' : '#d9d9d9'
                                }}
                            >
                                {(uploadType === 'logo' ? selectedLogoFile : selectedDesignFile) 
                                    ? '✓ File Selected - Click to Change' 
                                    : 'Click to Select File'}
                            </Button>
                        </Upload>
                    </div>

                    {((uploadType === 'logo' && selectedLogoPreview) || (uploadType === 'design' && selectedDesignPreview)) && (
                        <div>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                                Preview
                            </Text>
                            <div style={{ 
                                padding: 16, 
                                background: '#fafafa', 
                                borderRadius: 8, 
                                textAlign: 'center',
                                border: '1px solid #f0f0f0'
                            }}>
                                <img
                                    src={uploadType === 'logo' ? selectedLogoPreview : selectedDesignPreview}
                                    alt="Preview"
                                    style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }}
                                />
                            </div>
                            <Text type="success" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                                ✓ {(uploadType === 'logo' ? selectedLogoFile : selectedDesignFile)?.name}
                            </Text>
                        </div>
                    )}
                </Space>
            </Modal>
        </div>
    );
};

export default UploadFilesPage;
