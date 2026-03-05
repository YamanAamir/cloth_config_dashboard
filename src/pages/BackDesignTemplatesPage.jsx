import React, { useState, useEffect } from 'react';
import {
    Table,
    Button,
    Card,
    Typography,
    Space,
    Modal,
    message,
    Popconfirm,
    Image,
    Upload
} from 'antd';
import { PlusOutlined, DeleteOutlined, InboxOutlined } from '@ant-design/icons';
import {
    getAllBackDesignTemplates,
    uploadBackDesignTemplate,
    deleteBackDesignTemplate
} from '../api/api';
import { getUploadsUrl } from '../utils/constants';

const { Title, Text } = Typography;

const BackDesignTemplatesPage = () => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedPreview, setSelectedPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [pagination, setPagination] = useState({
        current: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
        search: '',
    });

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const response = await getAllBackDesignTemplates({
                page: pagination.current,
                limit: pagination.limit,
                search: pagination.search,
            });
            const { limit, page, total, totalPages } = response.data.pagination || {};
            setTemplates(response.data.data || []);
            setPagination(prev => ({
                ...prev,
                limit: limit ?? prev.limit,
                current: page ?? prev.current,
                total: total ?? (response.data.data?.length || 0),
                totalPages: totalPages ?? 1,
            }));
        } catch (error) {
            message.error('Failed to fetch design templates');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, [pagination.current, pagination.limit, pagination.search]);

    useEffect(() => {
        return () => {
            if (selectedPreview) URL.revokeObjectURL(selectedPreview);
        };
    }, [selectedPreview]);

    const handleFileSelect = (file) => {
        const isImage = file.type.startsWith('image/');
        if (!isImage) {
            message.error('Please select an image file');
            return false;
        }

        const isLt5M = file.size / 1024 / 1024 < 5;
        if (!isLt5M) {
            message.error('Image must be smaller than 5MB');
            return false;
        }

        if (selectedPreview) URL.revokeObjectURL(selectedPreview);
        setSelectedFile(file);
        setSelectedPreview(URL.createObjectURL(file));
        return false;
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            message.error('Please select a template file');
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            const name = selectedFile.name ? selectedFile.name.replace(/\.[^/.]+$/, '') : 'template';
            formData.append('name', name);
            formData.append('template', selectedFile);

            await uploadBackDesignTemplate(formData);
            message.success('Template uploaded successfully');
            
            if (selectedPreview) URL.revokeObjectURL(selectedPreview);
            setSelectedFile(null);
            setSelectedPreview(null);
            setIsModalOpen(false);
            fetchTemplates();
        } catch (error) {
            message.error(error.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteBackDesignTemplate(id);
            message.success('Template deleted successfully');
            fetchTemplates();
        } catch (error) {
            message.error('Delete failed');
        }
    };

    const columns = [
        {
            title: 'Preview',
            dataIndex: 'file_path',
            key: 'preview',
            width: 120,
            render: (filePath) => (
                <Image
                    src={getUploadsUrl(filePath)}
                    alt="Template"
                    width={80}
                    height={80}
                    style={{ objectFit: 'cover', borderRadius: 8 }}
                    preview={{
                        mask: 'View'
                    }}
                />
            ),
        },
        {
            title: 'Template Name',
            dataIndex: 'name',
            key: 'name',
            render: (text) => <span style={{ fontWeight: 600 }}>{text}</span>,
        },
        {
            title: 'Created At',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date) => new Date(date).toLocaleDateString(),
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Popconfirm
                    title="Delete Template"
                    description="Are you sure you want to delete this template?"
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
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <Title level={4} style={{ margin: 0 }}>Design Templates</Title>
                    <Typography.Text type="secondary">Manage design template library for class representatives</Typography.Text>
                </div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                        setSelectedFile(null);
                        setSelectedPreview(null);
                        setIsModalOpen(true);
                    }}
                    size="large"
                >
                    Add Template
                </Button>
            </div>

            <Card className="glass-card" style={{ border: 'none' }}>
                <Table
                    columns={columns}
                    dataSource={templates}
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

            <Modal
                title="Upload Design Template"
                open={isModalOpen}
                onCancel={() => {
                    setIsModalOpen(false);
                    if (selectedPreview) URL.revokeObjectURL(selectedPreview);
                    setSelectedFile(null);
                    setSelectedPreview(null);
                }}
                footer={[
                    <Button 
                        key="cancel" 
                        onClick={() => {
                            setIsModalOpen(false);
                            if (selectedPreview) URL.revokeObjectURL(selectedPreview);
                            setSelectedFile(null);
                            setSelectedPreview(null);
                        }}
                    >
                        Cancel
                    </Button>,
                    <Button
                        key="upload"
                        type="primary"
                        loading={uploading}
                        onClick={handleUpload}
                        disabled={!selectedFile}
                    >
                        Upload Template
                    </Button>
                ]}
                destroyOnClose
            >
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                            Select template file (PNG, JPG up to 5MB)
                        </Text>
                        <Upload
                            beforeUpload={handleFileSelect}
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
                                    borderColor: selectedFile ? '#00b96b' : '#d9d9d9'
                                }}
                            >
                                {selectedFile ? '✓ Template Selected - Click to Change' : 'Click to Select Template'}
                            </Button>
                        </Upload>
                    </div>

                    {selectedPreview && (
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
                                    src={selectedPreview}
                                    alt="Preview"
                                    style={{ maxWidth: '100%', maxHeight: 300, objectFit: 'contain' }}
                                />
                            </div>
                            <Text type="success" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                                ✓ {selectedFile.name}
                            </Text>
                        </div>
                    )}
                </Space>
            </Modal>
        </div>
    );
};

export default BackDesignTemplatesPage;
