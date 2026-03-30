import React, { useState, useEffect, useRef } from 'react';
import {
    Card, Typography, Button, message, Space, Spin, Select,
    Row, Col, Divider, Input, Empty, Tooltip, Alert
} from 'antd';
import {
    PlusOutlined, SaveOutlined, InboxOutlined, DeleteOutlined,
    LockOutlined, UnlockOutlined, PlusCircleOutlined, MinusCircleOutlined
} from '@ant-design/icons';
import { getMyClass, uploadBackDesign, updateBackDesign, getMyBackDesigns, getClassBackDesign } from '../api/api';
import { getUploadsUrl } from '../utils/constants';

const { Title } = Typography;
const { TextArea } = Input;

// FIX #1: Garment SVG icons for preview switcher
const GARMENTS = [
    {
        key: 'tshirt',
        label: 'T-Shirt',
        icon: (
            <svg viewBox="0 0 100 100" width="32" height="32" fill="currentColor">
                <path d="M30,10 L10,30 L25,35 L25,90 L75,90 L75,35 L90,30 L70,10 L60,18 Q50,24 40,18 Z" />
            </svg>
        ),
    },
    {
        key: 'crewneck',
        label: 'Crewneck',
        icon: (
            <svg viewBox="0 0 100 100" width="32" height="32" fill="currentColor">
                <path d="M30,10 L10,30 L25,35 L25,90 L75,90 L75,35 L90,30 L70,10 L62,20 Q50,28 38,20 Z" />
                <rect x="38" y="10" width="24" height="10" rx="4" />
            </svg>
        ),
    },
    {
        key: 'hoodie',
        label: 'Hoodie',
        icon: (
            <svg viewBox="0 0 100 100" width="32" height="32" fill="currentColor">
                <path d="M30,10 L10,30 L25,35 L25,90 L75,90 L75,35 L90,30 L70,10 L62,22 Q50,35 38,22 Z" />
                <path d="M38,10 Q50,0 62,10 L62,22 Q50,35 38,22 Z" opacity="0.4" />
            </svg>
        ),
    },
];

// FIX #9: auto derive text color from garment color
const getTextColor = (garmentColor) => (garmentColor === 'black' ? '#ffffff' : '#000000');

const BackDesignConfiguratorPage = () => {
    const [myClass, setMyClass] = useState(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [backDesigns, setBackDesigns] = useState([]);
    const [designsLoading, setDesignsLoading] = useState(false);
    const [showGallery, setShowGallery] = useState(true);
    const [existingConfiguratorDesign, setExistingConfiguratorDesign] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [selectedDesignId, setSelectedDesignId] = useState(null);
    const [garmentType, setGarmentType] = useState('tshirt'); // FIX #1
    const [textElements, setTextElements] = useState([]);
    const [currentText, setCurrentText] = useState('');
    const [currentFontSize, setCurrentFontSize] = useState(16); // FIX #6: default 16
    const [currentFontFamily] = useState('Arial');
    const [selectedTextId, setSelectedTextId] = useState(null);
    const [designColor, setDesignColor] = useState('white');
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const canvasRef = useRef(null);

    const user = localStorage.getItem('user');
    const classId = user ? JSON.parse(user)?.class_id : null;

    useEffect(() => {
        fetchMyClass();
        fetchConfiguratorDesign();
        fetchBackDesigns();
        return () => { if (imagePreview) URL.revokeObjectURL(imagePreview); };
    }, []);

    const fetchMyClass = async () => {
        setLoading(true);
        try {
            const res = await getMyClass();
            setMyClass(res.data.data?.[0]);
        } catch { message.error('Failed to fetch class details'); }
        finally { setLoading(false); }
    };

    const fetchBackDesigns = async () => {
        setDesignsLoading(true);
        try {
            const res = await getMyBackDesigns({ limit: 100 });
            if (res.data?.success && res.data?.data) {
                setBackDesigns(res.data.data.filter(d => d.isFromConfigurator !== true && d.process_status === 'approved'));
            } else setBackDesigns([]);
        } catch { message.error('Failed to load back designs'); setBackDesigns([]); }
        finally { setDesignsLoading(false); }
    };

    const fetchConfiguratorDesign = async () => {
        try {
            const res = await getClassBackDesign(classId);
            if (res.data?.success && res.data?.data) {
                const design = res.data.data;
                setExistingConfiguratorDesign(design);
                setIsEditMode(true);
                loadDesignForEditing(design);
            }
        } catch { console.log('No existing configurator design'); }
    };

    // FIX #3: does NOT reset textElements — names persist when switching design
    const loadDesignForEditing = (design) => {
        const imageUrl = `${getUploadsUrl(design.file_path)}?t=${Date.now()}`;
        setSelectedDesignId(design.id);
        setImagePreview(imageUrl);
        fetch(imageUrl)
            .then(r => { if (!r.ok) throw new Error(r.statusText); return r.blob(); })
            .then(blob => {
                setSelectedImage(new File([blob], design.name, { type: 'image/png' }));
                message.success('Design loaded! You can now add or edit names.');
            })
            .catch(err => message.error(`Failed to load image: ${err.message}`));
        setShowGallery(false);
    };

    // Canvas draw — garment bg + design overlay + names
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
                ctx.fillStyle = getTextColor(designColor);
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(el.text, 0, 0);
                ctx.restore();
            });
        };
        img.src = imagePreview;
    }, [imagePreview, textElements, designColor]);

    // FIX #7: new names start at top-right (x=680, y=80), stacked down
    const handleAddText = () => {
        if (!currentText.trim()) return message.warning('Please enter a name');
        setTextElements(prev => [...prev, {
            id: Date.now(),
            text: currentText,
            fontSize: currentFontSize,
            fontFamily: currentFontFamily,
            x: 680,
            y: 80 + prev.length * (currentFontSize + 8),
            rotation: 0,
            locked: false,
        }]);
        setCurrentText('');
    };

    const handleRemoveText = (id) => {
        setTextElements(prev => prev.filter(el => el.id !== id));
        if (selectedTextId === id) setSelectedTextId(null);
    };

    const handleCanvasMouseDown = (e) => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
        const my = (e.clientY - rect.top) * (canvas.height / rect.height);
        for (let i = textElements.length - 1; i >= 0; i--) {
            const el = textElements[i];
            if (el.locked) continue;
            const ctx = canvas.getContext('2d');
            ctx.font = `${el.fontSize}px ${el.fontFamily}`;
            const tw = ctx.measureText(el.text).width;
            const th = el.fontSize;
            if (mx >= el.x - tw / 2 && mx <= el.x + tw / 2 && my >= el.y - th / 2 && my <= el.y + th / 2) {
                setSelectedTextId(el.id);
                setIsDragging(true);
                setDragOffset({ x: mx - el.x, y: my - el.y });
                return;
            }
        }
        setSelectedTextId(null);
    };

    const handleCanvasMouseMove = (e) => {
        if (!isDragging || !selectedTextId || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
        const my = (e.clientY - rect.top) * (canvas.height / rect.height);
        setTextElements(prev => prev.map(el =>
            el.id === selectedTextId ? { ...el, x: mx - dragOffset.x, y: my - dragOffset.y } : el
        ));
    };

    const handleCanvasMouseUp = () => setIsDragging(false);

    const handleSubmit = async () => {
        if (!selectedImage) return message.error('Select an image first');
        if (textElements.length === 0) return message.warning('Add at least one name');
        setUploading(true);
        try {
            const blob = await new Promise(resolve => canvasRef.current.toBlob(resolve, 'image/png'));
            const formData = new FormData();
            const fileName = selectedImage.name.replace(/\.[^/.]+$/, '');
            formData.append('name', `${fileName}_configured`);
            formData.append('backDesign', blob, `${fileName}_configured.png`);
            formData.append('isFromConfigurator', 'true');
            formData.append('designColor', designColor);
            let response;
            if (isEditMode && existingConfiguratorDesign?.id) {
                response = await updateBackDesign(existingConfiguratorDesign.id, formData);
                message.success(response.data?.message || 'Back design updated successfully!');
            } else {
                response = await uploadBackDesign(formData);
                message.success(response.data?.message || 'Back design saved successfully!');
            }
            setSelectedImage(null); setImagePreview(null); setTextElements([]);
            setSelectedTextId(null); setShowGallery(true);
            setIsEditMode(false); setExistingConfiguratorDesign(null);
            fetchBackDesigns(); fetchConfiguratorDesign();
        } catch (error) {
            message.error(error?.response?.data?.message || 'Submission failed');
        } finally { setUploading(false); }
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', minHeight: '60vh', alignItems: 'center' }}>
            <Spin size="large" />
        </div>
    );

    return (
        <div>
            <Title level={4}>Back Design Configurator</Title>
            <Row gutter={[24, 24]}>

                {/* ── Left panel ── */}
                <Col xs={24} lg={10}>
                    <Card>
                        <Title level={5}>1. Select Base Image</Title>

                        {showGallery ? (
                            designsLoading ? <Spin /> :
                            backDesigns.length === 0
                                ? <Empty description="No library designs available" />
                                : <Row gutter={[8, 8]}>
                                    {backDesigns.map(design => (
                                        <Col span={12} key={design.id}>
                                            <Card
                                                hoverable
                                                onClick={() => loadDesignForEditing(design)}
                                                style={{ border: selectedDesignId === design.id ? '2px solid #00b96b' : '1px solid #f0f0f0' }}
                                            >
                                                <img
                                                    src={`${getUploadsUrl(design.file_path)}?t=${design.updated_at ? new Date(design.updated_at).getTime() : design.id}`}
                                                    alt={design.name}
                                                    style={{ width: '100%', height: 80, objectFit: 'contain' }}
                                                />
                                                <Typography.Text>{design.name}</Typography.Text>
                                            </Card>
                                        </Col>
                                    ))}
                                </Row>
                        ) : (
                            <div>
                                <div style={{ padding: 12, background: '#f0f7ff', borderRadius: 8, marginBottom: 8 }}>
                                    <Typography.Text type="success">&#10003; Design selected</Typography.Text>
                                </div>
                                {/* FIX #3: textElements NOT cleared on design change */}
                                <Button onClick={() => {
                                    setShowGallery(true);
                                    setSelectedImage(null);
                                    setImagePreview(null);
                                    setSelectedDesignId(null);
                                    setIsEditMode(false);
                                }}>
                                    Change Design
                                </Button>
                            </div>
                        )}

                        <Divider />

                        {/* Garment Color — FIX #9: shows auto print color */}
                        <div style={{ marginBottom: 16 }}>
                            <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>Garment Color</Typography.Text>
                            <Select value={designColor} onChange={setDesignColor} style={{ width: '100%' }} size="large">
                                <Select.Option value="white">
                                    <Space>
                                        <div style={{ width: 20, height: 20, background: 'white', border: '1px solid #d9d9d9', borderRadius: 4 }} />
                                        White Garment
                                    </Space>
                                </Select.Option>
                                <Select.Option value="black">
                                    <Space>
                                        <div style={{ width: 20, height: 20, background: 'black', borderRadius: 4 }} />
                                        Black Garment
                                    </Space>
                                </Select.Option>
                            </Select>
                            <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                                Print color auto-set to: <strong>{designColor === 'black' ? 'White' : 'Black'}</strong>
                            </Typography.Text>
                        </div>

                        <Divider />
                        <Title level={5}>2. Names</Title>

                        {/* Name element cards */}
                        {textElements.map(el => (
                            <Card
                                key={el.id}
                                size="small"
                                style={{ marginBottom: 8, border: selectedTextId === el.id ? '2px solid #00b96b' : '1px solid #f0f0f0', cursor: 'pointer' }}
                                onClick={() => setSelectedTextId(el.id)}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <Typography.Text strong>{el.text}</Typography.Text>
                                        <br />
                                        <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                                            {el.fontSize}px &bull; {el.rotation}&deg; &bull; {el.locked ? '🔒 Locked' : 'Unlocked'}
                                        </Typography.Text>
                                    </div>
                                </div>

                                {/* FIX #8: controls always shown when selected, edit available after unlock */}
                                {selectedTextId === el.id && (
                                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
                                        <Space direction="vertical" style={{ width: '100%' }} size="small">

                                            {/* FIX #8: edit name input — only when unlocked */}
                                            {!el.locked && (
                                                <div>
                                                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>Edit Name</Typography.Text>
                                                    <Input
                                                        key={`edit-${el.id}-${el.text}`}
                                                        size="small"
                                                        defaultValue={el.text}
                                                        style={{ marginTop: 4 }}
                                                        onClick={e => e.stopPropagation()}
                                                        onBlur={e => {
                                                            const val = e.target.value.trim();
                                                            if (val) setTextElements(prev => prev.map(t => t.id === el.id ? { ...t, text: val } : t));
                                                        }}
                                                        onPressEnter={e => {
                                                            const val = e.target.value.trim();
                                                            if (val) setTextElements(prev => prev.map(t => t.id === el.id ? { ...t, text: val } : t));
                                                        }}
                                                    />
                                                </div>
                                            )}

                                            <Row gutter={8}>
                                                <Col span={14}>
                                                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>Font Size</Typography.Text>
                                                    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                                        <Button size="small" icon={<MinusCircleOutlined />} disabled={el.locked}
                                                            onClick={e => { e.stopPropagation(); setTextElements(prev => prev.map(t => t.id === el.id ? { ...t, fontSize: Math.max(10, t.fontSize - 2) } : t)); }}
                                                        />
                                                        <Input size="small" value={el.fontSize} style={{ width: 50, textAlign: 'center' }} readOnly />
                                                        <Button size="small" icon={<PlusCircleOutlined />} disabled={el.locked}
                                                            onClick={e => { e.stopPropagation(); setTextElements(prev => prev.map(t => t.id === el.id ? { ...t, fontSize: Math.min(72, t.fontSize + 2) } : t)); }}
                                                        />
                                                    </div>
                                                </Col>
                                                <Col span={10}>
                                                    {/* FIX #4: free rotation — any value 0-359 */}
                                                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>Rotation (&deg;)</Typography.Text>
                                                    <Input
                                                        size="small"
                                                        type="number"
                                                        min={0} max={359}
                                                        value={el.rotation}
                                                        disabled={el.locked}
                                                        style={{ marginTop: 4 }}
                                                        onClick={e => e.stopPropagation()}
                                                        onChange={e => {
                                                            const val = Math.min(359, Math.max(0, Number(e.target.value) || 0));
                                                            setTextElements(prev => prev.map(t => t.id === el.id ? { ...t, rotation: val } : t));
                                                        }}
                                                    />
                                                </Col>
                                            </Row>

                                            <Space size="small" style={{ width: '100%', justifyContent: 'flex-end' }}>
                                                {/* FIX #8: lock/unlock always visible */}
                                                <Tooltip title={el.locked ? 'Unlock to edit' : 'Lock position'}>
                                                    <Button
                                                        size="small"
                                                        type={el.locked ? 'primary' : 'default'}
                                                        onClick={e => { e.stopPropagation(); setTextElements(prev => prev.map(t => t.id === el.id ? { ...t, locked: !t.locked } : t)); }}
                                                        icon={el.locked ? <LockOutlined /> : <UnlockOutlined />}
                                                    />
                                                </Tooltip>
                                                <Tooltip title="Delete">
                                                    <Button size="small" danger
                                                        onClick={e => { e.stopPropagation(); handleRemoveText(el.id); }}
                                                        icon={<DeleteOutlined />}
                                                    />
                                                </Tooltip>
                                            </Space>
                                        </Space>
                                    </div>
                                )}
                            </Card>
                        ))}

                        {/* FIX #5: no color picker. FIX #6: default size 16 */}
                        <TextArea
                            placeholder="Enter name"
                            value={currentText}
                            onChange={e => setCurrentText(e.target.value)}
                            onPressEnter={e => { e.preventDefault(); handleAddText(); }}
                            rows={2}
                        />
                        <Row gutter={8} style={{ marginTop: 8 }}>
                            <Col span={24}>
                                <Select value={currentFontSize} onChange={setCurrentFontSize} style={{ width: '100%' }}>
                                    {[10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48].map(v =>
                                        <Select.Option key={v} value={v}>{v}px</Select.Option>
                                    )}
                                </Select>
                            </Col>
                        </Row>
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddText} block style={{ marginTop: 12 }}>
                            Add Name
                        </Button>

                        <Divider />
                        <Title level={5}>3. {isEditMode ? 'Update' : 'Submit'} Design</Title>
                        <Button
                            type="primary" icon={<SaveOutlined />} onClick={handleSubmit}
                            block loading={uploading} disabled={!selectedImage || textElements.length === 0}
                        >
                            {uploading ? (isEditMode ? 'Updating...' : 'Submitting...') : (isEditMode ? 'Update Back Design' : 'Submit Back Design')}
                        </Button>
                    </Card>
                </Col>

                {/* ── Right panel — Live Preview ── */}
                <Col xs={24} lg={14}>
                    <Card style={{ position: 'sticky', top: 24 }}>

                        {/* FIX #1: garment switcher icons + FIX #2: disclaimer */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Title level={5} style={{ margin: 0 }}>Live Preview</Title>
                            <Space>
                                {GARMENTS.map(g => (
                                    <Tooltip key={g.key} title={g.label}>
                                        <Button
                                            type={garmentType === g.key ? 'primary' : 'default'}
                                            style={{ padding: '4px 8px', height: 'auto' }}
                                            onClick={() => setGarmentType(g.key)}
                                        >
                                            {g.icon}
                                        </Button>
                                    </Tooltip>
                                ))}
                            </Space>
                        </div>

                        {/* FIX #2: visual disclaimer */}
                        <Alert
                            message="This preview is for visual inspiration only and does not commit you or your students to the garment shown."
                            type="info"
                            showIcon
                            banner
                            style={{ marginBottom: 12, fontSize: 12 }}
                        />

                        <div style={{
                            minHeight: 600,
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            background: designColor === 'black' ? '#1a1a1a' : '#f5f5f5',
                            borderRadius: 8,
                            padding: 16,
                        }}>
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
                                <div style={{ textAlign: 'center', color: designColor === 'black' ? '#aaa' : '#999' }}>
                                    <InboxOutlined style={{ fontSize: 64, marginBottom: 16, opacity: 0.3 }} />
                                    <Typography.Text style={{ color: 'inherit' }}>Select an image to start designing</Typography.Text>
                                </div>
                            )}
                        </div>

                        <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 8, textAlign: 'center' }}>
                            Showing: {GARMENTS.find(g => g.key === garmentType)?.label} preview
                        </Typography.Text>
                    </Card>
                </Col>

            </Row>
        </div>
    );
};

export default BackDesignConfiguratorPage;
