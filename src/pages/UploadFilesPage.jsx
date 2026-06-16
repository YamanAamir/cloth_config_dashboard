import { useState, useEffect } from 'react';
import {
    Card, Typography, Tabs, Button, Tag,
    message, Empty, Row, Col, Spin, Space, Popconfirm,
    Modal, Input, Upload,
} from 'antd';
import {
    UploadOutlined, FileImageOutlined, PictureOutlined,
    CheckCircleOutlined, ClockCircleOutlined,
    CloseCircleOutlined, DeleteOutlined, ReloadOutlined, EditOutlined, InboxOutlined,
} from '@ant-design/icons';
import {
    getMyClass,
    uploadLogo,
    uploadBackDesign,
    updateBackDesign,
    deleteLogo,
    deleteMyBackDesign,
    getMyLogos,
    getMyBackDesigns
} from '../api/api';
import { getUploadsUrl, Status } from '../utils/constants';
import SimpleUploadModal from '../components/SimpleUploadModal';

const { Title } = Typography;
const { TabPane } = Tabs;
const { Dragger } = Upload;

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

    // Edit back design modal
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingDesign, setEditingDesign] = useState(null);
    const [editName, setEditName] = useState('');
    const [editWhiteFile, setEditWhiteFile] = useState(null);
    const [editWhitePreview, setEditWhitePreview] = useState(null);
    const [editBlackFile, setEditBlackFile] = useState(null);
    const [editBlackPreview, setEditBlackPreview] = useState(null);
    const [editUploading, setEditUploading] = useState(false);

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
            // Show all: approved, pending, AND rejected (so CR can see & delete rejected ones)
            setMyLogos(logoRes.data?.data ?? []);
            const filteredDesigns = (designRes.data?.data ?? [])
                .filter(d => d.isFromConfigurator !== true);
            setMyDesigns(filteredDesigns);
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

    const openEditModal = (item) => {
        setEditingDesign(item);
        setEditName(item.name);
        setEditWhiteFile(null);
        setEditWhitePreview(item.file_path ? getUploadsUrl(item.file_path) : null);
        setEditBlackFile(null);
        setEditBlackPreview(item.file_path_2 ? getUploadsUrl(item.file_path_2) : null);
        setEditModalOpen(true);
    };

    const handleEditFileSelect = (file, type) => {
        if (!file.type.startsWith('image/')) { message.error('Select an image'); return false; }
        const url = URL.createObjectURL(file);
        if (type === 'white') { setEditWhiteFile(file); setEditWhitePreview(url); }
        else { setEditBlackFile(file); setEditBlackPreview(url); }
        return false;
    };

    const handleEditSubmit = async () => {
        if (!editName.trim()) { message.error('Enter a name'); return; }
        setEditUploading(true);
        try {
            const fd = new FormData();
            fd.append('name', editName.trim());
            if (editWhiteFile) { fd.append('backDesign', editWhiteFile); fd.append('designColor', 'white'); }
            if (editBlackFile) { fd.append('backDesign_2', editBlackFile); fd.append('designColor_2', 'black'); }
            await updateBackDesign(editingDesign.id, fd);
            message.success('Back design updated');
            setEditModalOpen(false);
            fetchMyLibrary();
        } catch (err) {
            message.error(err.response?.data?.message || 'Update failed');
        } finally {
            setEditUploading(false);
        }
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
                                                <div style={{
                                                    padding: 12,
                                                    background: item.status === Status.DELETED ? '#fff2f0' : '#fafafa',
                                                    minHeight: 120,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    position: 'relative',
                                                }}>
                                                    <img
                                                        src={getUploadsUrl(item.file_path)}
                                                        alt={item.name}
                                                        style={{
                                                            maxWidth: '100%', maxHeight: 120, objectFit: 'contain',
                                                            opacity: item.status === Status.DELETED ? 0.6 : 1,
                                                        }}
                                                    />
                                                    {item.status === Status.DELETED && (
                                                        <div style={{
                                                            position: 'absolute', top: 6, right: 6,
                                                            background: '#ff4d4f', borderRadius: 4,
                                                            padding: '2px 6px', fontSize: 10, color: '#fff', fontWeight: 600,
                                                        }}>
                                                            REJECTED
                                                        </div>
                                                    )}
                                                </div>
                                            }
                                            style={{
                                                borderRadius: 8,
                                                border: item.status === Status.DELETED ? '1px solid #ffccc7' : undefined,
                                            }}
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
                                                <div style={{
                                                    background: item.status === Status.DELETED ? '#fff2f0' : '#fafafa',
                                                    position: 'relative',
                                                }}>
                                                    {item.status === Status.DELETED && (
                                                        <div style={{
                                                            position: 'absolute', top: 6, right: 6, zIndex: 1,
                                                            background: '#ff4d4f', borderRadius: 4,
                                                            padding: '2px 6px', fontSize: 10, color: '#fff', fontWeight: 600,
                                                        }}>
                                                            REJECTED
                                                        </div>
                                                    )}
                                                    <Tabs
                                                        size="small"
                                                        defaultActiveKey="white"
                                                        style={{ padding: '0 8px' }}
                                                        tabBarStyle={{ marginBottom: 4 }}
                                                    >
                                                        <TabPane tab="White" key="white">
                                                            <div style={{ minHeight: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 4px 8px' }}>
                                                                <img
                                                                    src={getUploadsUrl(item.file_path)}
                                                                    alt={item.name}
                                                                    style={{
                                                                        maxWidth: '100%', maxHeight: 100, objectFit: 'contain',
                                                                        opacity: item.status === Status.DELETED ? 0.6 : 1,
                                                                    }}
                                                                />
                                                            </div>
                                                        </TabPane>
                                                        <TabPane tab="Black" key="black">
                                                            <div style={{ minHeight: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a1a', borderRadius: 4, padding: '4px 4px 8px' }}>
                                                                {item.file_path_2 ? (
                                                                    <img
                                                                        src={getUploadsUrl(item.file_path_2)}
                                                                        alt={`${item.name} (black)`}
                                                                        style={{ maxWidth: '100%', maxHeight: 100, objectFit: 'contain' }}
                                                                    />
                                                                ) : (
                                                                    <Typography.Text type="secondary" style={{ fontSize: 11, color: '#888' }}>
                                                                        No black version
                                                                    </Typography.Text>
                                                                )}
                                                            </div>
                                                        </TabPane>
                                                    </Tabs>
                                                </div>
                                            }
                                            style={{
                                                borderRadius: 8,
                                                border: item.status === Status.DELETED ? '1px solid #ffccc7' : undefined,
                                            }}
                                        >
                                            <Typography.Text strong ellipsis style={{ display: 'block' }}>{item.name}</Typography.Text>
                                            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                {getStatusTag(item.status)}
                                                <Space size={0}>
                                                    <Button
                                                        type="text"
                                                        size="small"
                                                        icon={<EditOutlined style={{ color: '#00b96b' }} />}
                                                        onClick={() => openEditModal(item)}
                                                    />
                                                    <Popconfirm title="Delete this design?" onConfirm={() => handleDeleteDesign(item.id)} okText="Yes" cancelText="No" okType="danger">
                                                        <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                                                    </Popconfirm>
                                                </Space>
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

            {/* Edit Back Design Modal */}
            <Modal
                title="Edit Back Design"
                open={editModalOpen}
                onCancel={() => setEditModalOpen(false)}
                footer={[
                    <Button key="cancel" onClick={() => setEditModalOpen(false)}>Cancel</Button>,
                    <Button key="save" type="primary" loading={editUploading} onClick={handleEditSubmit} style={{ color: 'white' }}>
                        Save Changes
                    </Button>,
                ]}
                width={620}
                destroyOnClose
            >
                <Space direction="vertical" size="large" style={{ width: '100%', marginTop: 8 }}>
                    <div>
                        <Typography.Text strong>Name *</Typography.Text>
                        <Input
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            style={{ marginTop: 8 }}
                            maxLength={100}
                            showCount
                        />
                    </div>

                    {/* White version */}
                    <div>
                        <Typography.Text strong>White Garment Design</Typography.Text>
                        <Typography.Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                            (leave empty to keep current)
                        </Typography.Text>
                        {editWhitePreview && (
                            <div style={{ margin: '8px 0', textAlign: 'center', background: '#fafafa', padding: 8, borderRadius: 6 }}>
                                <img src={editWhitePreview} alt="white" style={{ maxHeight: 100, maxWidth: '100%', objectFit: 'contain' }} />
                            </div>
                        )}
                        <Dragger
                            beforeUpload={f => handleEditFileSelect(f, 'white')}
                            showUploadList={false}
                            accept="image/*"
                            style={{ borderColor: editWhiteFile ? '#52c41a' : '#d9d9d9', background: editWhiteFile ? '#f6ffed' : '#fafafa' }}
                        >
                            <p className="ant-upload-drag-icon">
                                <InboxOutlined style={{ fontSize: 28, color: editWhiteFile ? '#52c41a' : '#d9d9d9' }} />
                            </p>
                            <p className="ant-upload-text" style={{ fontSize: 13 }}>
                                {editWhiteFile ? `✓ ${editWhiteFile.name}` : 'Click or drag to replace white version'}
                            </p>
                        </Dragger>
                    </div>

                    {/* Black version */}
                    <div>
                        <Typography.Text strong>Black Garment Design</Typography.Text>
                        <Typography.Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                            (leave empty to keep current)
                        </Typography.Text>
                        {editBlackPreview && (
                            <div style={{ margin: '8px 0', textAlign: 'center', background: '#1a1a1a', padding: 8, borderRadius: 6 }}>
                                <img src={editBlackPreview} alt="black" style={{ maxHeight: 100, maxWidth: '100%', objectFit: 'contain' }} />
                            </div>
                        )}
                        <Dragger
                            beforeUpload={f => handleEditFileSelect(f, 'black')}
                            showUploadList={false}
                            accept="image/*"
                            style={{ borderColor: editBlackFile ? '#52c41a' : '#d9d9d9', background: editBlackFile ? '#f6ffed' : '#fafafa' }}
                        >
                            <p className="ant-upload-drag-icon">
                                <InboxOutlined style={{ fontSize: 28, color: editBlackFile ? '#52c41a' : '#d9d9d9' }} />
                            </p>
                            <p className="ant-upload-text" style={{ fontSize: 13 }}>
                                {editBlackFile ? `✓ ${editBlackFile.name}` : 'Click or drag to replace black version'}
                            </p>
                        </Dragger>
                    </div>
                </Space>
            </Modal>
        </div>
    );
};

export default UploadFilesPage;
