import { useState } from 'react';
import { Modal, Upload, Button, Input, message, Typography, Space, Checkbox } from 'antd';
import { InboxOutlined, GlobalOutlined } from '@ant-design/icons';

const { Dragger } = Upload;
const { Text } = Typography;

// Reusable single-file uploader block
const FileUploader = ({ label, file, preview, onSelect, maxMB = 5, required = true }) => (
    <div>
        <Text strong>{label}{required && ' *'}</Text>
        <Dragger
            beforeUpload={(f) => { onSelect(f); return false; }}
            showUploadList={false}
            accept="image/*"
            style={{
                marginTop: 8,
                borderColor: file ? '#52c41a' : '#d9d9d9',
                backgroundColor: file ? '#f6ffed' : '#fafafa',
            }}
        >
            <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ fontSize: 36, color: file ? '#52c41a' : '#d9d9d9' }} />
            </p>
            <p className="ant-upload-text" style={{ color: file ? '#52c41a' : undefined, fontWeight: file ? 'bold' : 'normal' }}>
                {file ? `${file.name}` : 'Click or drag image here'}
            </p>
            <p className="ant-upload-hint">Max {maxMB}MB · JPG, PNG</p>
        </Dragger>
        {preview && (
            <div style={{ marginTop: 8, textAlign: 'center', background: '#fafafa', padding: 8, borderRadius: 6 }}>
                <img src={preview} alt="preview" style={{ maxHeight: 100, maxWidth: '100%', objectFit: 'contain' }} />
            </div>
        )}
    </div>
);

const SimpleUploadModal = ({ open, onCancel, onUpload, uploadType = 'logo', loading = false }) => {
    const [fileName, setFileName] = useState('');
    const [forAllStudents, setForAllStudents] = useState(false);

    // Logo — single file
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);

    // Back design — two files (white + black)
    const [whiteFile, setWhiteFile] = useState(null);
    const [whitePreview, setWhitePreview] = useState(null);
    const [blackFile, setBlackFile] = useState(null);
    const [blackPreview, setBlackPreview] = useState(null);

    const makePreview = (file, setPreview) => {
        if (!file.type.startsWith('image/')) {
            message.error('Please select an image file');
            return false;
        }
        setPreview(URL.createObjectURL(file));
        return true;
    };

    const handleSelectLogo = (file) => {
        if (!makePreview(file, setLogoPreview)) return;
        setLogoFile(file);
        if (!fileName) setFileName(file.name.replace(/\.[^/.]+$/, ''));
    };

    const handleSelectWhite = (file) => {
        if (!makePreview(file, setWhitePreview)) return;
        setWhiteFile(file);
        if (!fileName) setFileName(file.name.replace(/\.[^/.]+$/, ''));
    };

    const handleSelectBlack = (file) => {
        if (!makePreview(file, setBlackPreview)) return;
        setBlackFile(file);
    };

    const handleUpload = () => {
        if (!fileName.trim()) { message.error('Please enter a name'); return; }

        if (uploadType === 'logo') {
            if (!logoFile) { message.error('Please select a logo file'); return; }
            const fd = new FormData();
            fd.append('name', fileName.trim());
            fd.append('logo', logoFile);
            onUpload(fd);
            return;
        }

        // Back design — both required
        if (!whiteFile) { message.error('Please select the White design file'); return; }
        if (!blackFile) { message.error('Please select the Black design file'); return; }

        const fd = new FormData();
        fd.append('name', fileName.trim());
        fd.append('backDesign', whiteFile);
        fd.append('designColor', 'white');
        fd.append('backDesign_2', blackFile);
        fd.append('designColor_2', 'black');
        fd.append('forAllStudents', forAllStudents ? 'true' : 'false');
        onUpload(fd);
    };

    const handleCancel = () => {
        [logoPreview, whitePreview, blackPreview].forEach(p => p && URL.revokeObjectURL(p));
        setLogoFile(null); setLogoPreview(null);
        setWhiteFile(null); setWhitePreview(null);
        setBlackFile(null); setBlackPreview(null);
        setFileName('');
        setForAllStudents(false);
        onCancel();
    };

    const canSubmit = uploadType === 'logo'
        ? !!logoFile && !!fileName.trim()
        : !!whiteFile && !!blackFile && !!fileName.trim();

    return (
        <Modal
            title={`Upload ${uploadType === 'logo' ? 'Logo' : 'Back Design'}`}
            open={open}
            onCancel={handleCancel}
            footer={[
                <Button key="cancel" onClick={handleCancel}>Cancel</Button>,
                <Button key="upload" type="primary" style={{ color: 'white' }} loading={loading} onClick={handleUpload} disabled={!canSubmit}>
                    {loading ? 'Uploading...' : 'Upload'}
                </Button>,
            ]}
            width={620}
            destroyOnClose
        >
            <Space direction="vertical" size="large" style={{ width: '100%', marginTop: 8 }}>
                {/* Name */}
                <div>
                    <Text strong>Name *</Text>
                    <Input
                        placeholder={`Enter ${uploadType} name`}
                        value={fileName}
                        onChange={e => setFileName(e.target.value)}
                        style={{ marginTop: 8 }}
                        maxLength={100}
                        showCount
                    />
                </div>

                {uploadType === 'logo' ? (
                    <FileUploader
                        label="Logo File"
                        file={logoFile}
                        preview={logoPreview}
                        onSelect={handleSelectLogo}
                        maxMB={2}
                    />
                ) : (
                    <>
                        {/* White design */}
                        <FileUploader
                            label="White Garment Design (Black print)"
                            file={whiteFile}
                            preview={whitePreview}
                            onSelect={handleSelectWhite}
                        />

                        {/* Black design */}
                        <FileUploader
                            label="Black Garment Design (White print)"
                            file={blackFile}
                            preview={blackPreview}
                            onSelect={handleSelectBlack}
                        />

                        {/* For all students */}
                        <div
                            style={{
                                padding: '12px 16px',
                                borderRadius: 8,
                                border: forAllStudents ? '1.5px solid #7c3aed' : '1px solid #f0f0f0',
                                background: forAllStudents ? '#f5f0ff' : '#fafafa',
                                cursor: 'pointer',
                            }}
                            onClick={() => setForAllStudents(v => !v)}
                        >
                            <Checkbox
                                checked={forAllStudents}
                                onChange={e => setForAllStudents(e.target.checked)}
                                onClick={e => e.stopPropagation()}
                            >
                                <Space size={6}>
                                    <GlobalOutlined style={{ color: '#7c3aed' }} />
                                    <Text strong style={{ fontSize: 13 }}>For alle elever (Studietur bibliotek)</Text>
                                </Space>
                            </Checkbox>
                            <div style={{ marginTop: 4, paddingLeft: 24, fontSize: 12, color: '#888' }}>
                                Markér dette for at gøre designet tilgængeligt i studietur-biblioteket
                            </div>
                        </div>
                    </>
                )}
            </Space>
        </Modal>
    );
};

export default SimpleUploadModal;
