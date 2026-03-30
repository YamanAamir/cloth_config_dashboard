import React, { useState, useEffect, useRef } from 'react';
import {
    Card, Typography, Button, message, Space, Spin, ColorPicker, Select,
    Row, Col, Divider, Input, Empty, Tooltip
} from 'antd';
import {
    PlusOutlined, SaveOutlined, InboxOutlined, DeleteOutlined,
    LockOutlined, UnlockOutlined, UndoOutlined, PlusCircleOutlined, MinusCircleOutlined
} from '@ant-design/icons';
import { getMyClass, uploadBackDesign, updateBackDesign, getMyBackDesigns, getConfiguratorBackDesign } from '../api/api';
import { getUploadsUrl } from '../utils/constants';

const { Title } = Typography;
const { TextArea } = Input;

const BackDesignConfiguratorPage = () => {
    const [myClass, setMyClass] = useState(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Back designs
    const [backDesigns, setBackDesigns] = useState([]);
    const [designsLoading, setDesignsLoading] = useState(false);
    const [showGallery, setShowGallery] = useState(true);
    const [existingConfiguratorDesign, setExistingConfiguratorDesign] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);

    // Selected design
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
    
    // Design color state
    const [designColor, setDesignColor] = useState('white');
    
    const user = localStorage.getItem("user");
    const classId = user ? JSON.parse(user)?.class_id : null;

    // Dragging
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const canvasRef = useRef(null);

    useEffect(() => {
        fetchMyClass();
        fetchConfiguratorDesign(); // Check if configurator design exists
        fetchBackDesigns();
        return () => { if (imagePreview) URL.revokeObjectURL(imagePreview); };
    }, []);

    // Fetch user class
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

    // Fetch back designs
    const fetchBackDesigns = async () => {
        setDesignsLoading(true);
        try {
            const response = await getMyBackDesigns({ limit: 100 });
            if (response.data?.success && response.data?.data) {
                // Only show approved library designs in gallery
                const libraryDesigns = response.data.data.filter(
                    design => design.isFromConfigurator !== true && design.process_status === 'approved'
                );
                setBackDesigns(libraryDesigns);
            } else setBackDesigns([]);
        } catch (error) {
            message.error('Failed to load back designs');
            setBackDesigns([]);
        } finally {
            setDesignsLoading(false);
        }
    };

    // Fetch existing configurator design
    const fetchConfiguratorDesign = async () => {
        try {
            const response = await getClassBackDesign(classId);
            if (response.data?.success && response.data?.data) {
                const design = response.data.data;
                setExistingConfiguratorDesign(design);
                setIsEditMode(true);
                loadDesignForEditing(design);
            }
        } catch (error) {
            // No existing design, that's fine
            console.log('No existing configurator design');
        }
    };

    // Load a design to edit
    const loadDesignForEditing = (design) => {
        const imageUrl = `${getUploadsUrl(design.file_path)}?t=${Date.now()}`;
        setSelectedDesignId(design.id);
        setImagePreview(imageUrl);

        fetch(imageUrl)
            .then(res => { if (!res.ok) throw new Error(res.statusText); return res.blob(); })
            .then(blob => {
                setSelectedImage(new File([blob], design.name, { type: 'image/png' }));
                message.success('Design loaded! You can now add or edit text.');
            })
            .catch(error => message.error(`Failed to load image: ${error.message}`));

        setShowGallery(false);
    };

    // Canvas draw
    useEffect(() => {
        if (!canvasRef.current || !imagePreview) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            canvas.width = 800;
            canvas.height = 800;
            const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
            const x = (canvas.width / 2) - (img.width / 2) * scale;
            const y = (canvas.height / 2) - (img.height / 2) * scale;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

            textElements.forEach(el => {
                ctx.save();
                ctx.translate(el.x, el.y);
                ctx.rotate((el.rotation * Math.PI) / 180);
                ctx.font = `${el.fontSize}px ${el.fontFamily}`;
                ctx.fillStyle = el.color;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(el.text, 0, 0);
                ctx.restore();
            });
        };
        img.src = imagePreview;
    }, [imagePreview, textElements]);

    // Add new text
    const handleAddText = () => {
        if (!currentText.trim()) return message.warning('Please enter text');
        const newText = {
            id: Date.now(),
            text: currentText,
            fontSize: currentFontSize,
            color: currentColor,
            fontFamily: currentFontFamily,
            x: 400,
            y: 100 + textElements.length * 50,
            rotation: 0,
            locked: false
        };
        setTextElements([...textElements, newText]);
        setCurrentText('');
    };

    // Remove text
    const handleRemoveText = (id) => {
        setTextElements(textElements.filter(el => el.id !== id));
        if (selectedTextId === id) setSelectedTextId(null);
    };

    // Drag handlers
    const handleCanvasMouseDown = (e) => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);

        for (let i = textElements.length - 1; i >= 0; i--) {
            const el = textElements[i];
            if (el.locked) continue;
            const ctx = canvas.getContext('2d');
            ctx.font = `${el.fontSize}px ${el.fontFamily}`;
            const metrics = ctx.measureText(el.text);
            const textWidth = metrics.width;
            const textHeight = el.fontSize;
            if (x >= el.x - textWidth / 2 && x <= el.x + textWidth / 2 &&
                y >= el.y - textHeight / 2 && y <= el.y + textHeight / 2) {
                setSelectedTextId(el.id);
                setIsDragging(true);
                setDragOffset({ x: x - el.x, y: y - el.y });
                return;
            }
        }
        setSelectedTextId(null);
    };

    const handleCanvasMouseMove = (e) => {
        if (!isDragging || !selectedTextId || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
        setTextElements(textElements.map(el => el.id === selectedTextId ? { ...el, x: x - dragOffset.x, y: y - dragOffset.y } : el));
    };

    const handleCanvasMouseUp = () => setIsDragging(false);

    // Submit design
    const handleSubmit = async () => {
        if (!selectedImage) return message.error('Select an image first');
        if (textElements.length === 0) return message.warning('Add at least one text element');
        setUploading(true);
        try {
            const canvas = canvasRef.current;
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const formData = new FormData();
            const fileName = selectedImage.name.replace(/\.[^/.]+$/, '');
            formData.append('name', `${fileName}_configured`);
            formData.append('backDesign', blob, `${fileName}_configured.png`);
            formData.append('isFromConfigurator', 'true');
            formData.append('designColor', designColor); // Add design color
            
            let response;
            if (isEditMode && existingConfiguratorDesign?.id) {
                // Update existing design
                response = await updateBackDesign(existingConfiguratorDesign.id, formData);
                message.success(response.data?.message || 'Back design updated successfully!');
            } else {
                // Create new design
                response = await uploadBackDesign(formData);
                message.success(response.data?.message || 'Back design saved successfully!');
            }
            
            setSelectedImage(null);
            setImagePreview(null);
            setTextElements([]);
            setSelectedTextId(null);
            setShowGallery(true);
            setIsEditMode(false);
            setExistingConfiguratorDesign(null);
            fetchBackDesigns();
            fetchConfiguratorDesign(); // Refresh configurator design
        } catch (error) {
            message.error(error?.response?.data?.message || 'Submission failed');
        } finally {
            setUploading(false);
        }
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', minHeight: '60vh', alignItems: 'center' }}><Spin size="large" /></div>;

    return (
        <div>
            <Title level={4}>Back Design Configurator</Title>

            <Row gutter={[24, 24]}>
                {/* Left panel */}
                <Col xs={24} lg={10}>
                    <Card>
                        <Title level={5}>1. Select Base Image</Title>
                        {showGallery ? (
                            designsLoading ? <Spin /> :
                                backDesigns.length === 0 ? <Empty description="No library designs available" /> :
                                    <Row gutter={[8, 8]}>
                                        {backDesigns.map(design => (
                                            <Col span={12} key={design.id}>
                                                <Card
                                                    hoverable
                                                    onClick={() => loadDesignForEditing(design)}
                                                    style={{ border: selectedDesignId === design.id ? '2px solid #00b96b' : '1px solid #f0f0f0' }}
                                                >
                                                    <img src={`${getUploadsUrl(design.file_path)}?t=${design.updated_at ? new Date(design.updated_at).getTime() : design.id}`} alt={design.name} style={{ width: '100%', height: 80, objectFit: 'contain' }} />
                                                    <Typography.Text>{design.name}</Typography.Text>
                                                </Card>
                                            </Col>
                                        ))}
                                    </Row>
                        ) : (
                            <div>
                                <div style={{ padding: 12, background: '#f0f7ff', borderRadius: 8, marginBottom: 8 }}>
                                    <Typography.Text type="success">✓ Design selected</Typography.Text>
                                </div>
                                <Button onClick={() => {
                                    setShowGallery(true);
                                    setSelectedImage(null);
                                    setImagePreview(null);
                                    setSelectedDesignId(null);
                                    setTextElements([]);
                                    setIsEditMode(false);
                                }}>
                                    Change Design
                                </Button>
                            </div>
                        )}

                        <Divider />
                        
                        {/* Design Color Selection */}
                        <div style={{ marginBottom: 16 }}>
                            <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
                                Garment Color
                            </Typography.Text>
                            <Select
                                value={designColor}
                                onChange={setDesignColor}
                                style={{ width: '100%' }}
                                size="large"
                            >
                                <Select.Option value="white">
                                    <Space>
                                        <div style={{ 
                                            width: 20, 
                                            height: 20, 
                                            background: 'white', 
                                            border: '1px solid #d9d9d9',
                                            borderRadius: 4 
                                        }} />
                                        White Garment
                                    </Space>
                                </Select.Option>
                                <Select.Option value="black">
                                    <Space>
                                        <div style={{ 
                                            width: 20, 
                                            height: 20, 
                                            background: 'black',
                                            borderRadius: 4 
                                        }} />
                                        Black Garment
                                    </Space>
                                </Select.Option>
                            </Select>
                            <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                                Select the garment color this design will be printed on
                            </Typography.Text>
                        </div>

                        <Divider />
                        <Title level={5}>2. Text Elements</Title>
                        {textElements.map(el => (
                            <Card key={el.id} size="small" style={{ marginBottom: 8, border: selectedTextId === el.id ? '2px solid #00b96b' : '1px solid #f0f0f0' }} onClick={() => setSelectedTextId(el.id)}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <Typography.Text strong>{el.text}</Typography.Text>
                                        <br />
                                        <Typography.Text type="secondary" style={{ fontSize: 11 }}>{el.fontSize}px • {el.rotation}°</Typography.Text>
                                    </div>
                                </div>
                                {selectedTextId === el.id && (
                                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
                                        <Space direction="vertical" style={{ width: '100%' }} size="small">
                                            <Row gutter={8}>
                                                <Col span={12}>
                                                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>Font Size</Typography.Text>
                                                    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                                        <Button
                                                            size="small"
                                                            icon={<MinusCircleOutlined />}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setTextElements(textElements.map(t =>
                                                                    t.id === el.id ? { ...t, fontSize: Math.max(12, t.fontSize - 4) } : t
                                                                ));
                                                            }}
                                                        />
                                                        <Input
                                                            size="small"
                                                            value={el.fontSize}
                                                            style={{ width: 60, textAlign: 'center' }}
                                                            readOnly
                                                        />
                                                        <Button
                                                            size="small"
                                                            icon={<PlusCircleOutlined />}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setTextElements(textElements.map(t =>
                                                                    t.id === el.id ? { ...t, fontSize: Math.min(96, t.fontSize + 4) } : t
                                                                ));
                                                            }}
                                                        />
                                                    </div>
                                                </Col>
                                                <Col span={12}>
                                                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>Color</Typography.Text>
                                                    <ColorPicker
                                                        value={el.color}
                                                        onChange={(color) => {
                                                            setTextElements(textElements.map(t =>
                                                                t.id === el.id ? { ...t, color: color.toHexString() } : t
                                                            ));
                                                        }}
                                                        size="small"
                                                        showText
                                                        style={{ width: '100%', marginTop: 4 }}
                                                    />
                                                </Col>
                                            </Row>
                                            <Space size="small" style={{ width: '100%', justifyContent: 'flex-end' }}>
                                                <Tooltip title={el.locked ? "Unlock" : "Lock"}>
                                                    <Button
                                                        size="small"
                                                        type={el.locked ? "primary" : "default"}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setTextElements(textElements.map(t => t.id === el.id ? { ...t, locked: !t.locked } : t));
                                                        }}
                                                        icon={el.locked ? <LockOutlined /> : <UnlockOutlined />}
                                                    />
                                                </Tooltip>
                                                <Tooltip title="Rotate 45°">
                                                    <Button
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setTextElements(textElements.map(t => t.id === el.id ? { ...t, rotation: (t.rotation + 45) % 360 } : t));
                                                        }}
                                                        icon={<UndoOutlined />}
                                                        disabled={el.locked}
                                                    />
                                                </Tooltip>
                                                <Tooltip title="Delete">
                                                    <Button
                                                        size="small"
                                                        danger
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRemoveText(el.id);
                                                        }}
                                                        icon={<DeleteOutlined />}
                                                    />
                                                </Tooltip>
                                            </Space>
                                        </Space>
                                    </div>
                                )}
                            </Card>
                        ))}

                        <TextArea placeholder="Enter text" value={currentText} onChange={e => setCurrentText(e.target.value)} rows={2} />
                        <Row gutter={8} style={{ marginTop: 8 }}>
                            <Col span={12}>
                                <Select value={currentFontSize} onChange={setCurrentFontSize} style={{ width: '100%' }}>
                                    {[16, 24, 32, 48, 64].map(v => <Select.Option key={v} value={v}>{v}px</Select.Option>)}
                                </Select>
                            </Col>
                            <Col span={12}>
                                <ColorPicker value={currentColor} onChange={color => setCurrentColor(color.toHexString())} style={{ width: '100%' }} />
                            </Col>
                        </Row>
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddText} block style={{ marginTop: 12 }}>Add Text</Button>

                        <Divider />
                        <Title level={5}>3. {isEditMode ? 'Update' : 'Submit'} Design</Title>
                        <Button type="primary" icon={<SaveOutlined />} onClick={handleSubmit} block loading={uploading} disabled={!selectedImage || textElements.length === 0}>
                            {uploading ? (isEditMode ? 'Updating...' : 'Submitting...') : (isEditMode ? 'Update Back Design' : 'Submit Back Design')}
                        </Button>
                    </Card>
                </Col>

                {/* Right panel - Canvas */}
                <Col xs={24} lg={14}>
                    <Card style={{ position: 'sticky', top: 24 }}>
                        <Title level={5}>Live Preview</Title>
                        <div style={{ minHeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f5f5f5', borderRadius: 8, padding: 16 }}>
                            {imagePreview ? (
                                <canvas
                                    ref={canvasRef}
                                    onMouseDown={handleCanvasMouseDown}
                                    onMouseMove={handleCanvasMouseMove}
                                    onMouseUp={handleCanvasMouseUp}
                                    onMouseLeave={handleCanvasMouseUp}
                                    style={{ maxWidth: '100%', border: '2px solid #d9d9d9', borderRadius: 4 }}
                                />
                            ) : (
                                <div style={{ textAlign: 'center', color: '#999' }}>
                                    <InboxOutlined style={{ fontSize: 64, marginBottom: 16, opacity: 0.3 }} />
                                    <Typography.Text>Select an image to start designing</Typography.Text>
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