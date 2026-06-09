import React, { useState, useEffect } from 'react';
import {
    Card, Typography, Tabs, Upload, Button, Tag,
    message, Empty, Row, Col, Spin, Space, Modal, Popconfirm,
    Input
} from 'antd';
import {
    UploadOutlined, FileImageOutlined, PictureOutlined,
    InboxOutlined, CheckCircleOutlined, ClockCircleOutlined,
    CloseCircleOutlined, DeleteOutlined, ReloadOutlined
} from '@ant-design/icons';
import {
    getMyClass,
    uploadLogo,
    uploadBackDesign,
    deleteLogo,
    deleteMyBackDesign,
    getMyLogos,
    getMyBackDesigns
} from '../api/api';
import { getUploadsUrl, Status } from '../utils/constants';
import SimpleUploadModal from '../components/SimpleUploadModal';

const { Title } = Typography;
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
    const [uploadType, setUploadType] = useState('logo');

    // Rejected files modal
    const [rejectedModalOpen, setRejectedModalOpen] = useState(false);
    const [rejectedLogos, setRejectedLogos] = useState([]);
    const [rejectedDesigns, setRejectedDesigns] = useState([]);
    const [rejectedLoading, setRejectedLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

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
            const logos = (logoRes.data?.data ?? []).filter(l => l.process_status !== 'rejected' && l.status !== 2);
            setMyLogos(logos);
            const filteredDesigns = (designRes.data?.data ?? [])
                .filter(d => d.isFromConfigurator !== true && d.process_status !== 'rejected' && d.status !== 2);
            setMyDesigns(filteredDesigns);
        } catch (error) {
            message.error('Failed to load your uploads');
        } finally {
            setLibraryLoading(false);
        }
    };

    const handleRefreshAll = async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                fetchMyClass(),
                fetchMyLibrary()
            ]);
            message.success('Files refreshed successfully!');
        } catch (error) {
            message.error('Failed to refresh some data');
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchMyClass();
    }, []);

    useEffect(() => {
        if (myClass) {
            fetchMyLibrary();
        }
    }, [myClass]);

    const handleSimpleUpload = async (formData) => {
        console.log('🎯 handleSimpleUpload called');
        console.log('📦 FormData received:', formData);
        console.log('🏷️ Upload type:', uploadType);

        setUploading(true);
        try {
            let response;
            if (uploadType === 'logo') {
                console.log('📤 Uploading logo...');
                response = await uploadLogo(formData);
                message.success('Logo uploaded successfully!');
            } else {
                console.log('📤 Uploading back design...');
                response = await uploadBackDesign(formData);
                message.success('Back design uploaded successfully!');
            }

            console.log('✅ Upload response:', response);
            setUploadModalOpen(false);
            fetchMyLibrary();
        } catch (error) {
            console.error('❌ Upload error:', error);
            console.error('❌ Error details:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message
            });
            const errorMessage = error.response?.data?.message || error.message || 'Upload failed';
            message.error(`Upload failed: ${errorMessage}`);
        } finally {
            setUploading(false);
        }
    };

    const openUploadModal = (type) => {
        setUploadType(type);
        setUploadModalOpen(true);
    };

    const fetchRejectedFiles = async () => {
        setRejectedLoading(true);
        try {
            const [logoRes, designRes] = await Promise.all([
                getMyLogos({ page: 1, limit: 50, process_status: 'rejected' }),
                getMyBackDesigns({ page: 1, limit: 50, process_status: 'rejected' })
            ]);
            setRejectedLogos(logoRes.data?.data ?? []);
            setRejectedDesigns((designRes.data?.data ?? []).filter(d => d.isFromConfigurator !== true));
        } catch { message.error('Failed to load rejected files'); }
        finally { setRejectedLoading(false); }
    };

    const handleDeleteLogo = async (id) => {
        try {
            await deleteLogo(id);
            message.success('Logo deleted');
            fetchMyLibrary();
        } catch (err) {
            message.error(err.response?.data?.message || 'Delete failed');
        }
    };

    const handleDeleteDesign = async (id) => {
        try {
            await deleteMyBackDesign(id);
            message.success('Back design deleted');
            fetchMyLibrary();
        } catch (err) {
            message.error(err.response?.data?.message || 'Delete failed');
        }
    };
    if (loading) return <Spin className="fade-in" style={{ display: 'block', margin: '24px auto' }} />; // or a spinner

    if (!myClass && !uploading) {
        return (
            <Card className="glass-card" style={{ margin: 24, textAlign: 'center' }}>
                <Empty description="No class assigned to you yet." />
            </Card>
        );
    }



    return (
        <div className="fade-in">
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Title level={4} style={{ margin: 0 }}>Upload Files</Title>
                    <Typography.Text type="secondary">
                        Manage your class logos and back designs
                    </Typography.Text>
                </div>
                <Space>
                    {/* <Button
                        icon={<ReloadOutlined />}
                        loading={refreshing}
                        onClick={handleRefreshAll}
                        title="Refresh all files"
                    >
                        Refresh
                    </Button> */}
                    <Button
                        icon={<CloseCircleOutlined />}
                        danger
                        onClick={() => { setRejectedModalOpen(true); fetchRejectedFiles(); }}
                    >
                        Rejected Files
                    </Button>
                </Space>
            </div>

            <Card className="glass-card" style={{ border: 'none' }}>
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    tabBarExtraContent={
                        <Space>
                            <Button
                                type="text"
                                icon={<ReloadOutlined />}
                                loading={libraryLoading}
                                onClick={fetchMyLibrary}
                                title="Refresh current tab"
                            >
                                Refresh  {activeTab === 'logos' ? 'Logos' : 'Back Designs'}
                            </Button >
                            <Button
                                type="primary"
                                icon={<UploadOutlined />}
                                onClick={() => openUploadModal(activeTab === 'logos' ? 'logo' : 'design')}
                            >
                                {activeTab === 'logos' ? 'Add Logo' : 'Add Back Design'}
                            </Button>
                        </Space>
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
                                            <Typography.Text strong ellipsis style={{ display: 'block' }}>{item.name}</Typography.Text>
                                            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                {getStatusTag(item.status)}
                                                <Popconfirm title="Delete this logo?" onConfirm={() => handleDeleteLogo(item.id)} okText="Yes" cancelText="No" okType="danger">
                                                    <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                                                </Popconfirm>
                                            </div>
                                            {item.status === Status.DELETED && item.admin_comment && (
                                                <div style={{ marginTop: 6, padding: '6px 8px', background: '#fff2f0', borderRadius: 4, border: '1px solid #ffccc7' }}>
                                                    <Typography.Text type="danger" style={{ fontSize: 11 }}>
                                                        <CloseCircleOutlined style={{ marginRight: 4 }} />
                                                        {item.admin_comment}
                                                    </Typography.Text>
                                                </div>
                                            )}
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
                                            <Typography.Text strong ellipsis style={{ display: 'block' }}>{item.name}</Typography.Text>
                                            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                {getStatusTag(item.status)}
                                                <Popconfirm title="Delete this design?" onConfirm={() => handleDeleteDesign(item.id)} okText="Yes" cancelText="No" okType="danger">
                                                    <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                                                </Popconfirm>
                                            </div>
                                            {item.status === Status.DELETED && item.admin_comment && (
                                                <div style={{ marginTop: 6, padding: '6px 8px', background: '#fff2f0', borderRadius: 4, border: '1px solid #ffccc7' }}>
                                                    <Typography.Text type="danger" style={{ fontSize: 11 }}>
                                                        <CloseCircleOutlined style={{ marginRight: 4 }} />
                                                        {item.admin_comment}
                                                    </Typography.Text>
                                                </div>
                                            )}
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                        )}
                    </TabPane>
                </Tabs>
            </Card>

            {/* Simple Upload Modal */}
            <SimpleUploadModal
                open={uploadModalOpen}
                onCancel={() => setUploadModalOpen(false)}
                onUpload={handleSimpleUpload}
                uploadType={uploadType}
                loading={uploading}
            />

            {/* Rejected Files Modal */}
            <Modal
                title={<span><CloseCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />Rejected Files</span>}
                open={rejectedModalOpen}
                onCancel={() => setRejectedModalOpen(false)}
                footer={null}
                width={800}
                destroyOnHidden
            >
                {rejectedLoading ? <Spin style={{ display: 'block', margin: '24px auto' }} /> : (
                    <Tabs defaultActiveKey="logos">
                        <TabPane tab={`Logos (${rejectedLogos.length})`} key="logos">
                            {rejectedLogos.length === 0 ? (
                                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No rejected logos" />
                            ) : (
                                <Row gutter={[16, 16]}>
                                    {rejectedLogos.map(item => (
                                        <Col xs={12} sm={8} key={item.id}>
                                            <Card
                                                cover={
                                                    <div style={{ padding: 12, background: '#fafafa', height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <img src={getUploadsUrl(item.file_path)} alt={item.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                                    </div>
                                                }
                                                size="small"
                                            >
                                                <Typography.Text strong ellipsis style={{ display: 'block' }}>{item.name}</Typography.Text>
                                                {item.admin_comment && (
                                                    <div style={{ marginTop: 6, padding: '6px 8px', background: '#fff2f0', borderRadius: 4, border: '1px solid #ffccc7' }}>
                                                        <Typography.Text type="danger" style={{ fontSize: 11 }}>
                                                            <CloseCircleOutlined style={{ marginRight: 4 }} />
                                                            {item.admin_comment}
                                                        </Typography.Text>
                                                    </div>
                                                )}
                                            </Card>
                                        </Col>
                                    ))}
                                </Row>
                            )}
                        </TabPane>
                        <TabPane tab={`Back Designs (${rejectedDesigns.length})`} key="designs">
                            {rejectedDesigns.length === 0 ? (
                                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No rejected back designs" />
                            ) : (
                                <Row gutter={[16, 16]}>
                                    {rejectedDesigns.map(item => (
                                        <Col xs={12} sm={8} key={item.id}>
                                            <Card
                                                cover={
                                                    <div style={{ padding: 12, background: '#fafafa', height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <img src={getUploadsUrl(item.file_path)} alt={item.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                                    </div>
                                                }
                                                size="small"
                                            >
                                                <Typography.Text strong ellipsis style={{ display: 'block' }}>{item.name}</Typography.Text>
                                                {item.admin_comment && (
                                                    <div style={{ marginTop: 6, padding: '6px 8px', background: '#fff2f0', borderRadius: 4, border: '1px solid #ffccc7' }}>
                                                        <Typography.Text type="danger" style={{ fontSize: 11 }}>
                                                            <CloseCircleOutlined style={{ marginRight: 4 }} />
                                                            {item.admin_comment}
                                                        </Typography.Text>
                                                    </div>
                                                )}
                                            </Card>
                                        </Col>
                                    ))}
                                </Row>
                            )}
                        </TabPane>
                    </Tabs>
                )}
            </Modal>
        </div>
    );
};

export default UploadFilesPage;
