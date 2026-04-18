import React, { useState } from 'react';
import { Upload, Button, message, Card, Typography } from 'antd';
import { InboxOutlined } from '@ant-design/icons';

const { Dragger } = Upload;
const { Text, Title } = Typography;

const DebugUploadTest = () => {
    const [selectedFile, setSelectedFile] = useState(null);

    const handleFileSelect = (file) => {
        console.log('🔥 DEBUG: File selected in test component:', {
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified
        });

        // Simple validation
        if (!file.type.startsWith('image/')) {
            console.log('❌ DEBUG: Not an image file');
            message.error('Please select an image file');
            return false;
        }

        if (file.size > 5 * 1024 * 1024) {
            console.log('❌ DEBUG: File too large');
            message.error('File too large (max 5MB)');
            return false;
        }

        console.log('✅ DEBUG: File validation passed');
        setSelectedFile(file);
        message.success(`File selected: ${file.name}`);
        
        return false; // Prevent automatic upload
    };

    const handleClear = () => {
        console.log('🧹 DEBUG: Clearing selection');
        setSelectedFile(null);
    };

    return (
        <Card title="🐛 Debug Upload Test" style={{ margin: '20px', maxWidth: '600px' }}>
            <div style={{ marginBottom: '16px' }}>
                <Text>This is a simple test to debug file selection issues.</Text>
            </div>

            <Dragger
                beforeUpload={handleFileSelect}
                showUploadList={false}
                accept="image/*"
                style={{
                    marginBottom: '16px',
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
                <p className="ant-upload-text">
                    {selectedFile 
                        ? `✅ Selected: ${selectedFile.name}`
                        : 'Click or drag image here'
                    }
                </p>
                <p className="ant-upload-hint">
                    Max 5MB • JPG, PNG, GIF
                </p>
            </Dragger>

            {selectedFile && (
                <div style={{ 
                    padding: '12px', 
                    background: '#f6ffed', 
                    border: '1px solid #b7eb8f',
                    borderRadius: '6px',
                    marginBottom: '16px'
                }}>
                    <Text strong>Selected File Details:</Text><br/>
                    <Text>Name: {selectedFile.name}</Text><br/>
                    <Text>Type: {selectedFile.type}</Text><br/>
                    <Text>Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</Text><br/>
                    <Text>Last Modified: {new Date(selectedFile.lastModified).toLocaleString()}</Text>
                </div>
            )}

            <div>
                <Button 
                    type="primary" 
                    disabled={!selectedFile}
                    style={{ marginRight: '8px' }}
                    onClick={() => {
                        console.log('🚀 DEBUG: Test upload button clicked');
                        message.info('Test upload would happen here');
                    }}
                >
                    Test Upload
                </Button>
                <Button onClick={handleClear}>
                    Clear
                </Button>
            </div>

            <div style={{ marginTop: '16px', fontSize: '12px', color: '#666' }}>
                <Text>Check browser console for detailed logs</Text>
            </div>
        </Card>
    );
};

export default DebugUploadTest;