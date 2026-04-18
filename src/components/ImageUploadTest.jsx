import React, { useState } from 'react';
import { Upload, Button, message, Card, Typography } from 'antd';
import { InboxOutlined, UploadOutlined } from '@ant-design/icons';

const { Dragger } = Upload;
const { Text } = Typography;

const ImageUploadTest = () => {
    const [fileList, setFileList] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);

    const handleFileSelect = (file) => {
        console.log('File selected:', {
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified
        });

        // Validate file type
        if (!file.type.startsWith('image/')) {
            message.error('Please select an image file');
            return false;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            message.error('File size must be less than 5MB');
            return false;
        }

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setPreview(e.target.result);
        };
        reader.readAsDataURL(file);

        setSelectedFile(file);
        message.success(`File selected: ${file.name}`);
        
        return false; // Prevent automatic upload
    };

    const clearSelection = () => {
        setSelectedFile(null);
        setPreview(null);
        setFileList([]);
    };

    return (
        <Card title="Image Upload Test" style={{ margin: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
                <Text strong>Test the image upload functionality:</Text>
            </div>

            <Dragger
                beforeUpload={handleFileSelect}
                fileList={fileList}
                showUploadList={false}
                accept="image/*"
                style={{ marginBottom: '20px' }}
            >
                <p className="ant-upload-drag-icon">
                    <InboxOutlined style={{ fontSize: '48px', color: selectedFile ? '#52c41a' : '#d9d9d9' }} />
                </p>
                <p className="ant-upload-text">
                    {selectedFile ? '✓ File Selected - Click or drag to change' : 'Click or drag image here'}
                </p>
                <p className="ant-upload-hint">
                    Support for JPG, PNG, GIF files up to 5MB
                </p>
            </Dragger>

            {selectedFile && (
                <div style={{ marginBottom: '20px' }}>
                    <Text strong>Selected File:</Text>
                    <div style={{ marginTop: '8px' }}>
                        <Text>Name: {selectedFile.name}</Text><br/>
                        <Text>Type: {selectedFile.type}</Text><br/>
                        <Text>Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</Text>
                    </div>
                </div>
            )}

            {preview && (
                <div style={{ marginBottom: '20px' }}>
                    <Text strong>Preview:</Text>
                    <div style={{ 
                        marginTop: '8px', 
                        padding: '16px', 
                        border: '1px solid #d9d9d9', 
                        borderRadius: '8px',
                        textAlign: 'center'
                    }}>
                        <img 
                            src={preview} 
                            alt="Preview" 
                            style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }}
                        />
                    </div>
                </div>
            )}

            <div>
                <Button 
                    type="primary" 
                    disabled={!selectedFile}
                    style={{ marginRight: '8px' }}
                >
                    Test Upload
                </Button>
                <Button onClick={clearSelection}>
                    Clear
                </Button>
            </div>
        </Card>
    );
};

export default ImageUploadTest;