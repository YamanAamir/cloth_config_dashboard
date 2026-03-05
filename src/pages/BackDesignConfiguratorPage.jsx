import React, { useState, useEffect, useRef } from 'react';
import {
    Card,
    Typography,
    Button,
    Upload,
    Input,
    message,
    Space,
    Spin,
    ColorPicker,
    Select,
    Row,
    Col,
    Divider,
    Slider,
    Tooltip,
    Empty
} from 'antd';
import {
    PlusOutlined,
    SaveOutlined,
    InboxOutlined,
    DeleteOutlined,
    LockOutlined,
    UnlockOutlined,
    UndoOutlined,
    ExpandOutlined,
    FullscreenOutlined,
    FullscreenExitOutlined
} from '@ant-design/icons';
import { getMyClass, uploadBackDesign, getMyBackDesigns } from '../api/api';
import { getUploadsUrl } from '../utils/constants';

const { Title, Text } = Typography;
const { TextArea } = Input;

const BackDesignConfiguratorPage = () => {
    const [myClass, setMyClass] = useState(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Back designs gallery
    const [backDesigns, setBackDesigns] = useState([]);
    const [designsLoading, setDesignsLoading] = useState(false);
    const [showGallery, setShowGallery] = useState(true);

    // Image state
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [selectedDesignId, setSelectedDesignId] = useState(null);

    // Text state
    const [textElements, setTextElements] = useState([]);
    const [currentText, setCurrentText] = useState('');
    const [currentFontSize, setCurrentFontSize] = useState(32);
    const [currentColor, setCurrentColor] = useState('#000000');
    const [currentFontFamily, setCurrentFontFamily] = useState('Arial');
    const [selectedTextId, setSelectedTextId] = useState(null);

    // Drag state
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        fetchMyClass();
        fetchBackDesigns();
        return () => {
            if (imagePreview) URL.revokeObjectURL(imagePreview);
        };
    }, []);

    const fetchBackDesigns = async () => {
        setDesignsLoading(true);
        try {
            const response = await getMyBackDesigns({ page: 1, limit: 50 });
            setBackDesigns(response.data?.data ?? []);
        } catch (error) {
            message.error('Failed to load back designs');
        } finally {
            setDesignsLoading(false);
        }
    };

    useEffect(() => {
        if (imagePreview) {
            drawCanvas();

            // Auto-save draft
            if (textElements.length > 0) {
                saveDesignToLocalStorage();
            }

            // Send updated design to iframe in real-time
            setTimeout(() => {
                const canvas = canvasRef.current;
                if (canvas) {
                    const backDesignBase64 = canvas.toDataURL('image/png');
                    ['preview-iframe', 'preview-iframe2'].forEach((id) => {
                        const iframe = document.getElementById(id);
                        if (iframe?.contentWindow) {
                            const msg = `T-Shirt:backDesign: ${backDesignBase64}`;
                            iframe.contentWindow.postMessage(msg, '*');
                        }
                    });
                }
            }, 100);
        }
    }, [imagePreview, textElements, selectedTextId]);

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

    const handleDesignSelect = (design) => {
        const imageUrl = getUploadsUrl(design.file_path);
        setSelectedDesignId(design.id);
        setImagePreview(imageUrl);
        setShowGallery(false);

        // Load image to set as selectedImage for canvas
        fetch(imageUrl)
            .then(res => res.blob())
            .then(blob => {
                const file = new File([blob], design.name, { type: 'image/png' });
                setSelectedImage(file);
            })
            .catch(error => {
                console.error('Error loading image:', error);
                message.error('Failed to load image');
            });
    };

    const handleImageSelect = (file) => {
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

        if (imagePreview) URL.revokeObjectURL(imagePreview);
        setSelectedImage(file);
        setImagePreview(URL.createObjectURL(file));
        setTextElements([]);
        setSelectedTextId(null);
        return false;
    };

    const handleAddText = () => {
        if (!currentText.trim()) {
            message.warning('Please enter text');
            return;
        }

        const newTextElement = {
            id: Date.now(),
            text: currentText,
            fontSize: currentFontSize,
            color: currentColor,
            fontFamily: currentFontFamily,
            x: 400,
            y: 100 + (textElements.length * 50),
            rotation: 0,
            locked: false
        };

        setTextElements([...textElements, newTextElement]);
        setCurrentText('');
        message.success('Text added! Drag to reposition');
    };

    const handleRemoveText = (id) => {
        setTextElements(textElements.filter(el => el.id !== id));
        if (selectedTextId === id) setSelectedTextId(null);
        message.success('Text removed');
    };

    const toggleLock = (id) => {
        setTextElements(textElements.map(el =>
            el.id === id ? { ...el, locked: !el.locked } : el
        ));
    };

    const rotateText = (id) => {
        setTextElements(textElements.map(el =>
            el.id === id ? { ...el, rotation: (el.rotation + 45) % 360 } : el
        ));
    };

    const resizeText = (id, delta) => {
        setTextElements(textElements.map(el =>
            el.id === id ? { ...el, fontSize: Math.max(16, Math.min(72, el.fontSize + delta)) } : el
        ));
    };

    const handleCanvasMouseDown = (e) => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        // Check if clicked on any text
        const ctx = canvas.getContext('2d');
        for (let i = textElements.length - 1; i >= 0; i--) {
            const element = textElements[i];
            if (element.locked) continue;

            ctx.font = `${element.fontSize}px ${element.fontFamily}`;
            const metrics = ctx.measureText(element.text);
            const textWidth = metrics.width;
            const textHeight = element.fontSize;

            if (
                x >= element.x - textWidth / 2 &&
                x <= element.x + textWidth / 2 &&
                y >= element.y - textHeight / 2 &&
                y <= element.y + textHeight / 2
            ) {
                setSelectedTextId(element.id);
                setIsDragging(true);
                setDragOffset({
                    x: x - element.x,
                    y: y - element.y
                });
                return;
            }
        }

        setSelectedTextId(null);
    };

    const handleCanvasMouseMove = (e) => {
        if (!isDragging || !selectedTextId || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        setTextElements(textElements.map(el =>
            el.id === selectedTextId ? {
                ...el,
                x: x - dragOffset.x,
                y: y - dragOffset.y
            } : el
        ));
    };

    const handleCanvasMouseUp = () => {
        setIsDragging(false);
    };

    const drawCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas || !imagePreview) return;

        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            canvas.width = 800;
            canvas.height = 800;

            const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
            const x = (canvas.width / 2) - (img.width / 2) * scale;
            const y = (canvas.height / 2) - (img.height / 2) * scale;
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

            textElements.forEach(element => {
                ctx.save();
                ctx.translate(element.x, element.y);
                ctx.rotate((element.rotation * Math.PI) / 180);

                ctx.font = `${element.fontSize}px ${element.fontFamily}`;
                ctx.fillStyle = element.color;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 4;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;

                ctx.fillText(element.text, 0, 0);

                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;

                ctx.restore();
            });
        };

        img.src = imagePreview;
    };

    const saveDesignToLocalStorage = () => {
        if (!selectedImage || textElements.length === 0) return;

        const designData = {
            textElements,
            imageName: selectedImage.name,
            timestamp: Date.now()
        };

        localStorage.setItem('backDesignDraft', JSON.stringify(designData));
    };

    const loadDesignFromLocalStorage = () => {
        const saved = localStorage.getItem('backDesignDraft');
        if (saved) {
            try {
                const designData = JSON.parse(saved);
                setTextElements(designData.textElements || []);
                message.success('Draft loaded');
            } catch (error) {
                console.error('Failed to load draft:', error);
            }
        }
    };

    const handleSubmit = async () => {
        if (!selectedImage) {
            message.error('Please select an image');
            return;
        }

        if (textElements.length === 0) {
            message.warning('Add at least one text element');
            return;
        }

        setUploading(true);

        try {
            const canvas = canvasRef.current;

            const blob = await new Promise((resolve) => {
                canvas.toBlob(resolve, 'image/png');
            });

            const backDesignBase64 = canvas.toDataURL('image/png');

            const formData = new FormData();
            const fileName = selectedImage.name
                ? selectedImage.name.replace(/\.[^/.]+$/, '')
                : 'back_design';

            formData.append('name', `${fileName}_configured`);
            formData.append('backDesign', blob, `${fileName}_configured.png`);

            const response = await uploadBackDesign(formData);

            message.success(response.data?.message || 'Back design saved successfully!');

            ['preview-iframe', 'preview-iframe2'].forEach((id) => {
                const iframe = document.getElementById(id);
                if (iframe?.contentWindow) {
                    const msg = `T-Shirt:backDesign: ${backDesignBase64}`;
                    iframe.contentWindow.postMessage(msg, '*');
                }
            });

            localStorage.removeItem('backDesignDraft');

            if (imagePreview) URL.revokeObjectURL(imagePreview);

            setSelectedImage(null);
            setImagePreview(null);
            setTextElements([]);
            setCurrentText('');
            setSelectedTextId(null);
            setShowGallery(true);
            setSelectedDesignId(null);

            fetchBackDesigns();

        } catch (error) {
            message.error(error?.response?.data?.message || 'Submission failed');
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div className="fade-in">
            <div style={{ marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>Back Design Configurator</Title>
                <Text type="secondary">
                    Select image, add text, drag to position, and customize your design
                </Text>
            </div>

            <Row gutter={[24, 24]}>
                <Col xs={24} lg={10}>
                    <Card className="glass-card" style={{ border: 'none' }}>
                        <Space direction="vertical" size="large" style={{ width: '100%' }}>
                            <div>
                                <Title level={5}>
                                    <span style={{
                                        display: 'inline-block',
                                        width: 28,
                                        height: 28,
                                        borderRadius: '50%',
                                        background: '#00b96b',
                                        color: 'white',
                                        textAlign: 'center',
                                        lineHeight: '28px',
                                        marginRight: 8,
                                        fontSize: 14
                                    }}>1</span>
                                    Select Base Image
                                </Title>

                                {showGallery ? (
                                    designsLoading ? (
                                        <div style={{ textAlign: 'center', padding: 24 }}>
                                            <Spin />
                                        </div>
                                    ) : backDesigns.length === 0 ? (
                                        <Empty
                                            description="No back designs available"
                                            style={{ padding: 24 }}
                                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                                        />
                                    ) : (
                                        <div style={{ 
                                            maxHeight: '400px', 
                                            overflowY: 'auto',
                                            paddingRight: 8
                                        }}>
                                            <Row gutter={[8, 8]}>
                                                {backDesigns.map((design) => (
                                                    <Col span={12} key={design.id}>
                                                        <Card
                                                            hoverable
                                                            onClick={() => handleDesignSelect(design)}
                                                            style={{
                                                                cursor: 'pointer',
                                                                border: selectedDesignId === design.id ? '2px solid #00b96b' : '1px solid #f0f0f0'
                                                            }}
                                                            bodyStyle={{ padding: 8 }}
                                                        >
                                                            <div style={{
                                                                height: 80,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                background: '#fafafa',
                                                                borderRadius: 4
                                                            }}>
                                                                <img
                                                                    src={getUploadsUrl(design.file_path)}
                                                                    alt={design.name}
                                                                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                                                />
                                                            </div>
                                                            <Text ellipsis style={{ display: 'block', marginTop: 4, fontSize: 11 }}>
                                                                {design.name}
                                                            </Text>
                                                        </Card>
                                                    </Col>
                                                ))}
                                            </Row>
                                        </div>
                                    )
                                ) : (
                                    <>
                                        <div style={{
                                            padding: 12,
                                            background: '#f0f7ff',
                                            borderRadius: 8,
                                            border: '1px solid #91d5ff',
                                            marginBottom: 12
                                        }}>
                                            <Text type="success" style={{ fontSize: 12 }}>
                                                ✓ Design selected
                                            </Text>
                                            <Button
                                                type="link"
                                                size="small"
                                                onClick={() => {
                                                    setShowGallery(true);
                                                    setSelectedImage(null);
                                                    setImagePreview(null);
                                                    setSelectedDesignId(null);
                                                    setTextElements([]);
                                                }}
                                                style={{ marginLeft: 8, padding: 0 }}
                                            >
                                                Change Design
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>

                            <Divider />

                            <div>
                                <Title level={5}>
                                    <span style={{
                                        display: 'inline-block',
                                        width: 28,
                                        height: 28,
                                        borderRadius: '50%',
                                        background: '#00b96b',
                                        color: 'white',
                                        textAlign: 'center',
                                        lineHeight: '28px',
                                        marginRight: 8,
                                        fontSize: 14
                                    }}>2</span>
                                    Add Text Elements
                                </Title>
                                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                    <div>
                                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                                            Text Content
                                        </Text>
                                        <TextArea
                                            placeholder="Enter your text here..."
                                            value={currentText}
                                            onChange={(e) => setCurrentText(e.target.value)}
                                            rows={2}
                                            disabled={!selectedImage}
                                            maxLength={100}
                                            showCount
                                        />
                                    </div>

                                    <Row gutter={[8, 8]}>
                                        <Col span={12}>
                                            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                                                Font Size
                                            </Text>
                                            <Select
                                                value={currentFontSize}
                                                onChange={setCurrentFontSize}
                                                style={{ width: '100%' }}
                                                disabled={!selectedImage}
                                            >
                                                <Select.Option value={16}>Small (16px)</Select.Option>
                                                <Select.Option value={24}>Medium (24px)</Select.Option>
                                                <Select.Option value={32}>Large (32px)</Select.Option>
                                                <Select.Option value={48}>X-Large (48px)</Select.Option>
                                                <Select.Option value={64}>XX-Large (64px)</Select.Option>
                                            </Select>
                                        </Col>
                                        <Col span={12}>
                                            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                                                Color
                                            </Text>
                                            <ColorPicker
                                                value={currentColor}
                                                onChange={(color) => setCurrentColor(color.toHexString())}
                                                disabled={!selectedImage}
                                                showText
                                                style={{ width: '100%' }}
                                            />
                                        </Col>
                                    </Row>

                                    <Button
                                        type="primary"
                                        icon={<PlusOutlined />}
                                        onClick={handleAddText}
                                        block
                                        size="large"
                                        disabled={!selectedImage}
                                    >
                                        Add Text to Design
                                    </Button>
                                </Space>
                            </div>

                            {textElements.length > 0 && (
                                <>
                                    <Divider />
                                    <div>
                                        <Title level={5}>Text Elements ({textElements.length})</Title>
                                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
                                            Drag text on canvas to reposition
                                        </Text>
                                        <Space direction="vertical" style={{ width: '100%' }} size="small">
                                            {textElements.map((element) => (
                                                <Card
                                                    key={element.id}
                                                    size="small"
                                                    style={{
                                                        background: selectedTextId === element.id ? '#e6f7ff' : '#fafafa',
                                                        border: selectedTextId === element.id ? '2px solid #00b96b' : '1px solid #f0f0f0'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ flex: 1 }}>
                                                            <Text strong ellipsis>{element.text}</Text>
                                                            <br />
                                                            <Text type="secondary" style={{ fontSize: 11 }}>
                                                                {element.fontSize}px • {element.rotation}°
                                                            </Text>
                                                        </div>
                                                        <Space size="small">
                                                            <Tooltip title={element.locked ? "Unlock" : "Lock"}>
                                                                <Button
                                                                    type="text"
                                                                    icon={element.locked ? <LockOutlined /> : <UnlockOutlined />}
                                                                    onClick={() => toggleLock(element.id)}
                                                                    size="small"
                                                                />
                                                            </Tooltip>
                                                            <Tooltip title="Rotate">
                                                                <Button
                                                                    type="text"
                                                                    icon={<UndoOutlined />}
                                                                    onClick={() => rotateText(element.id)}
                                                                    size="small"
                                                                    disabled={element.locked}
                                                                />
                                                            </Tooltip>
                                                            <Tooltip title="Delete">
                                                                <Button
                                                                    type="text"
                                                                    danger
                                                                    icon={<DeleteOutlined />}
                                                                    onClick={() => handleRemoveText(element.id)}
                                                                    size="small"
                                                                />
                                                            </Tooltip>
                                                        </Space>
                                                    </div>
                                                </Card>
                                            ))}
                                        </Space>
                                    </div>
                                </>
                            )}

                            <Divider />

                            <div>
                                <Title level={5}>
                                    <span style={{
                                        display: 'inline-block',
                                        width: 28,
                                        height: 28,
                                        borderRadius: '50%',
                                        background: '#00b96b',
                                        color: 'white',
                                        textAlign: 'center',
                                        lineHeight: '28px',
                                        marginRight: 8,
                                        fontSize: 14
                                    }}>3</span>
                                    Submit Design
                                </Title>
                                <Button
                                    type="primary"
                                    size="large"
                                    icon={<SaveOutlined />}
                                    onClick={handleSubmit}
                                    loading={uploading}
                                    disabled={!selectedImage || textElements.length === 0}
                                    block
                                    style={{ height: 50 }}
                                >
                                    {uploading ? 'Submitting...' : 'Submit Back Design'}
                                </Button>
                            </div>
                        </Space>
                    </Card>
                </Col>

                <Col xs={24} lg={14}>
                    <Card className="glass-card" style={{ border: 'none', position: 'sticky', top: 24 }}>
                        <Title level={5} style={{ marginBottom: 16 }}>
                            Live Preview
                            {selectedTextId && (
                                <Text type="secondary" style={{ fontSize: 12, marginLeft: 12 }}>
                                    (Drag selected text to reposition)
                                </Text>
                            )}
                        </Title>
                        <div
                            ref={containerRef}
                            style={{
                                background: '#f5f5f5',
                                borderRadius: 8,
                                padding: 16,
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                minHeight: 600
                            }}
                        >
                            {imagePreview ? (
                                <canvas
                                    ref={canvasRef}
                                    onMouseDown={handleCanvasMouseDown}
                                    onMouseMove={handleCanvasMouseMove}
                                    onMouseUp={handleCanvasMouseUp}
                                    onMouseLeave={handleCanvasMouseUp}
                                    style={{
                                        maxWidth: '100%',
                                        border: '2px solid #d9d9d9',
                                        borderRadius: 4,
                                        cursor: isDragging ? 'grabbing' : (selectedTextId ? 'grab' : 'default'),
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                    }}
                                />
                            ) : (
                                <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>
                                    <InboxOutlined style={{ fontSize: 64, marginBottom: 16, opacity: 0.3 }} />
                                    <br />
                                    <Text type="secondary" style={{ fontSize: 16 }}>
                                        Select an image to start designing
                                    </Text>
                                </div>
                            )}
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default BackDesignConfiguratorPage;
