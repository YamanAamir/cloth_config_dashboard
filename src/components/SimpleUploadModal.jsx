import React, { useState } from 'react';
import { Modal, Upload, Button, Input, message, Typography, Space } from 'antd';
import { InboxOutlined } from '@ant-design/icons';

const { Dragger } = Upload;
const { Text } = Typography;

const SimpleUploadModal = ({ 
    open, 
    onCancel, 
    onUpload, 
    uploadType = 'logo', 
    loading = false 
}) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [fileName, setFileName] = useState('');
    const [preview, setPreview] = useState(null);

    const handleFileSelect = (file) => {
        console.log('🔥 File selected:', {
            name: file.name,
            type: file.type,
            size: file.size,
            sizeInMB: (file.size / 1024 / 1024).toFixed(2)
        });

        // Validate file type
        if (!file.type.startsWith('image/')) {
            console.log('❌ File type validation failed:', file.type);
            message.error('Please select an image file (JPG, PNG, GIF)');
            return false;
        }

        // Validate file size only - no dimension restrictions
        const maxSize = uploadType === 'logo' ? 2 : 5; // MB
        const fileSizeMB = file.size / 1024 / 1024;
        if (fileSizeMB > maxSize) {
            console.log('❌ File size validation failed:', fileSizeMB, 'MB > ', maxSize, 'MB');
            message.error(`File is too large (${fileSizeMB.toFixed(1)}MB). Maximum size is ${maxSize}MB`);
            return false;
        }

        console.log('✅ File validation passed, creating preview...');

        // Create preview
        try {
            const previewUrl = URL.createObjectURL(file);
            setPreview(previewUrl);
            setSelectedFile(file);
            
            // Auto-fill name
            if (!fileName) {
                const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
                setFileName(nameWithoutExt);
                console.log('📝 Auto-filled name:', nameWithoutExt);
            }

            console.log('✅ File selected successfully!');
            message.success(`File selected: ${file.name}`);
        } catch (error) {
            console.error('❌ Error creating preview:', error);
            message.error('Failed to process file');
        }

        return false; // Prevent automatic upload - we handle it manually
    };

    const handleUpload = () => {
        console.log('🚀 Upload button clicked');
        console.log('📁 Selected file:', selectedFile);
        console.log('📝 File name:', fileName);

        if (!selectedFile) {
            console.log('❌ No file selected');
            message.error('Please select a file');
            return;
        }
        if (!fileName.trim()) {
            console.log('❌ No file name entered');
            message.error('Please enter a name');
            return;
        }

        console.log('✅ Creating FormData...');
        const formData = new FormData();
        formData.append('name', fileName.trim());
        if (uploadType === 'logo') {
            formData.append('logo', selectedFile);
        } else {
            formData.append('backDesign', selectedFile);
        }

        // Debug FormData
        console.log('📦 FormData contents:');
        for (let [key, value] of formData.entries()) {
            console.log(`  ${key}:`, value);
        }

        console.log('🔄 Calling onUpload...');
        onUpload(formData);
    };

    const handleCancel = () => {
        // Clean up
        if (preview) {
            URL.revokeObjectURL(preview);
        }
        setSelectedFile(null);
        setFileName('');
        setPreview(null);
        onCancel();
    };

    return (
        <Modal
            title={`Upload ${uploadType === 'logo' ? 'Logo' : 'Back Design'}`}
            open={open}
            onCancel={handleCancel}
            footer={[
                <Button key="cancel" onClick={handleCancel}>
                    Cancel
                </Button>,
                <Button 
                    key="upload" 
                    type="primary" 
                    loading={loading}
                    onClick={handleUpload}
                    disabled={!selectedFile || !fileName.trim()}
                >
                    {loading ? 'Uploading...' : 'Upload'}
                </Button>
            ]}
            width={600}
            destroyOnClose
        >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div>
                    <Text strong>File Name *</Text>
                    <Input
                        placeholder={`Enter ${uploadType} name`}
                        value={fileName}
                        onChange={(e) => setFileName(e.target.value)}
                        style={{ marginTop: 8 }}
                        maxLength={100}
                        showCount
                    />
                </div>

                <div>
                    <Text strong>Select File *</Text>
                    <Dragger
                        beforeUpload={handleFileSelect}
                        showUploadList={false}
                        accept="image/*"
                        disabled={loading}
                        style={{ 
                            marginTop: 8,
                            borderColor: selectedFile ? '#52c41a' : '#d9d9d9',
                            backgroundColor: selectedFile ? '#f6ffed' : '#fafafa'
                        }}
                    >
                        <p className="ant-upload-drag-icon">
                            <InboxOutlined style={{ 
                                fontSize: '48px',
                                color: selectedFile ? '#52c41a' : '#d9d9d9'
                            }} />
                        </p>
                        <p className="ant-upload-text" style={{
                            color: selectedFile ? '#52c41a' : undefined,
                            fontWeight: selectedFile ? 'bold' : 'normal'
                        }}>
                            {selectedFile 
                                ? '✓ File Selected - Click or drag to change'
                                : 'Click or drag image here to upload'
                            }
                        </p>
                        <p className="ant-upload-hint">
                            Max: {uploadType === 'logo' ? '2MB' : '5MB'} • JPG, PNG, GIF
                        </p>
                    </Dragger>
                    
                    {/* Upload Button and File Name */}
                    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Upload
                            beforeUpload={handleFileSelect}
                            showUploadList={false}
                            accept="image/*"
                            disabled={loading}
                        >
                            <Button 
                                icon={<InboxOutlined />}
                                disabled={loading}
                            >
                                Choose File
                            </Button>
                        </Upload>
                        {selectedFile && (
                            <Text type="success" style={{ fontSize: 14 }}>
                                📁 {selectedFile.name}
                            </Text>
                        )}
                    </div>
                </div>

                {preview && (
                    <div>
                        <Text strong>Preview</Text>
                        <div style={{
                            marginTop: 8,
                            padding: 16,
                            border: '1px solid #d9d9d9',
                            borderRadius: 8,
                            textAlign: 'center',
                            backgroundColor: '#fafafa'
                        }}>
                            <img
                                src={preview}
                                alt="Preview"
                                style={{ 
                                    maxWidth: '100%', 
                                    maxHeight: 200, 
                                    objectFit: 'contain' 
                                }}
                            />
                        </div>
                        <Text type="success" style={{ fontSize: 12, marginTop: 8 }}>
                            ✓ {selectedFile?.name}
                        </Text>
                    </div>
                )}
            </Space>
        </Modal>
    );
};

export default SimpleUploadModal;