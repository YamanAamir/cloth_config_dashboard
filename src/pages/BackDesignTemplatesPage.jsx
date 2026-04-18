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
    Upload,
    Input
} from 'antd';
import { PlusOutlined, DeleteOutlined, InboxOutlined } from '@ant-design/icons';
import {
    getAllBackDesignTemplates,
    uploadBackDesignTemplate,
    deleteBackDesignTemplate
} from '../api/api';
import { getUploadsUrl } from '../utils/constants';

const { Title } = Typography;

const BackDesignTemplatesPage = () => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedPreview, setSelectedPreview] = useState(null);
    const [templateName, setTemplateName] = useState('');
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

        // No dimension restrictions - proceed with file selection
        if (selectedPreview) URL.revokeObjectURL(selectedPreview);
        setSelectedFile(file);
        setSelectedPreview(URL.createObjectURL(file));
        
        // Auto-fill template name if empty
        if (!templateName) {
            setTemplateName(file.name.replace(/\.[^/.]+$/, ''));
        }
        
        message.success(`Template selected: ${file.name}`);
        return false;
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            message.error('Please select a template file');
            return;
        }
        if (!templateName.trim()) {
            message.error('Please enter a template name');
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('name', templateName.trim());
            formData.append('template', selectedFile);

            await uploadBackDesignTemplate(formData);
            message.success('Template uploaded successfully');
            
            // Reset form
            if (selectedPreview) URL.revokeObjectURL(selectedPreview);
            setSelectedFile(null);
            setSelectedPreview(null);
            setTemplateName('');
            setIsModalOpen(false);
            fetchTemplates();
        } catch (error) {
            console.error('Upload error:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Upload failed';
            message.error(errorMessage);
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
                    setTemplateName('');
                }}
                footer={[
                    <Button 
                        key="cancel" 
                        onClick={() => {
                            setIsModalOpen(false);
                            if (selectedPreview) URL.revokeObjectURL(selectedPreview);
                            setSelectedFile(null);
                            setSelectedPreview(null);
                            setTemplateName('');
                        }}
                    >
                        Cancel
                    </Button>,
                    <Button
                        key="upload"
                        type="primary"
                        loading={uploading}
                        onClick={handleUpload}
                        disabled={!selectedFile || !templateName.trim()}
                    >
                        Upload Template
                    </Button>
                ]}
                destroyOnHidden
            >
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    {/* Template Name Input */}
                    <div>
                        <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
                            Template Name *
                        </Typography.Text>
                        <Input
                            placeholder="Enter template name (e.g. Berlin Back Design)"
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            maxLength={100}
                            showCount
                            disabled={uploading}
                        />
                    </div>
                    
                    <div>
                        <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
                            Select Template File *
                        </Typography.Text>
                        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                            PNG, JPG up to 5MB
                        </Typography.Text>
                        
                        {/* <div style={{ 
                            background: '#f6ffed', 
                            border: '1px solid #b7eb8f', 
                            borderRadius: 6, 
                            padding: 12, 
                            marginBottom: 12 
                        }}>
                            <Typography.Text strong style={{ color: '#389e0d', display: 'block', marginBottom: 4 }}>
                                📏 A3 Size Requirements
                            </Typography.Text>
                            <Typography.Text style={{ fontSize: 12, color: '#52c41a' }}>
                                • Maximum: 4000 × 5600 pixels (A3 at 300 DPI)<br/>
                                • Recommended: 2480 × 3508 pixels (A3 at 210 DPI)<br/>
                                • How to check: Right-click image → Properties → Details
                            </Typography.Text>
                        </div> */}
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
                        
                        {/* File Name Display */}
                        {selectedFile && (
                            <div style={{ marginTop: 8, textAlign: 'center' }}>
                                <Typography.Text type="success" style={{ fontSize: 14 }}>
                                    📁 {selectedFile.name}
                                </Typography.Text>
                            </div>
                        )}
                    </div>

                    {selectedPreview && (
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
                                    src={selectedPreview}
                                    alt="Preview"
                                    style={{ maxWidth: '100%', maxHeight: 300, objectFit: 'contain' }}
                                />
                            </div>
                            <Typography.Text type="success" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                                ✓ {selectedFile.name}
                            </Typography.Text>
                        </div>
                    )}
                </Space>
            </Modal>
        </div>
    );
};

export default BackDesignTemplatesPage;
