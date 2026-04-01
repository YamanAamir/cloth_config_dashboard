import React, { useState, useEffect, useRef } from 'react';
import {
    Card, Typography, Button, message, Space, Spin,
    Select, Row, Col, Divider, Input, Tooltip
} from 'antd';
import {
    PlusOutlined, SaveOutlined, DeleteOutlined,
    LockOutlined, UnlockOutlined, PlusCircleOutlined, MinusCircleOutlined, EyeOutlined
} from '@ant-design/icons';
import {
    getMyClass, uploadBackDesign, updateBackDesign,
    getMyBackDesigns, getClassBackDesign,
    getClassRepLibraryDesigns, getStudyTripCountries, setStudyTripCountry
} from '../api/api';
import { getUploadsUrl } from '../utils/constants';
import DesignGallery from '../components/configurator/DesignGallery';
import DesignCanvas from '../components/configurator/DesignCanvas';
import PreviewModal from '../components/configurator/PreviewModal';

const { Title, Text } = Typography;
const { TextArea } = Input;

const BackDesignConfiguratorPage = () => {
    const [myClass, setMyClass] = useState(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Designs
    const [backDesigns, setBackDesigns] = useState([]);
    const [designsLoading, setDesignsLoading] = useState(false);
    const [libraryDesigns, setLibraryDesigns] = useState([]);
    const [libraryLoading, setLibraryLoading] = useState(false);
    const [countries, setCountries] = useState([]);
    const [settingCountry, setSettingCountry] = useState(false);
    const [galleryTab, setGalleryTab] = useState('backdesign');

    // Selected design
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [selectedDesignId, setSelectedDesignId] = useState(null);
    const [existingConfiguratorDesign, setExistingConfiguratorDesign] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);

    // Text/names
    const [textElements, setTextElements] = useState([]);
    const [currentText, setCurrentText] = useState('');
    const [currentFontSize, setCurrentFontSize] = useState(16);
    const [currentFontFamily] = useState('Arial');
    const [selectedTextId, setSelectedTextId] = useState(null);

    // Drag
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // Garment color
    const [designColor, setDesignColor] = useState('white');

    // Preview modal
    const [previewOpen, setPreviewOpen] = useState(false);

    const canvasRef = useRef(null);
    const user = localStorage.getItem('user');
    const classId = user ? JSON.parse(user)?.class_id : null;

    useEffect(() => {
        fetchMyClass();
        fetchConfiguratorDesign();
        fetchBackDesigns();
        fetchLibraryDesigns();
        fetchCountries();
    }, []);

    const fetchMyClass = async () => {
        setLoading(true);
        try {
            const res = await getMyClass();
            setMyClass(res.data.data?.[0]);
        } catch { message.error('Failed to fetch class'); }
        finally { setLoading(false); }
    };

    const fetchBackDesigns = async () => {
        setDesignsLoading(true);
        try {
            const res = await getMyBackDesigns({ limit: 100 });
            if (res.data?.success && res.data?.data) {
                const filtered = res.data.data.filter(d => d.isFromConfigurator !== true && d.process_status === 'approved');
                setBackDesigns(filtered);
                if (filtered.length > 0 && !selectedDesignId) loadDesignForEditing(filtered[0]);
            } else setBackDesigns([]);
        } catch { setBackDesigns([]); }
        finally { setDesignsLoading(false); }
    };

    const fetchLibraryDesigns = async () => {
        setLibraryLoading(true);
        try {
            const res = await getClassRepLibraryDesigns();
            setLibraryDesigns(res.data.data || []);
        } catch { /* silent */ }
        finally { setLibraryLoading(false); }
    };

    const fetchCountries = async () => {
        try {
            const res = await getStudyTripCountries();
            setCountries(res.data.data || []);
        } catch { /* silent */ }
    };

    const handleSetCountry = async (countryId) => {
        setSettingCountry(true);
        try {
            await setStudyTripCountry({ country_id: countryId || null });
            message.success('Study trip country updated');
            fetchLibraryDesigns();
        } catch (err) {
            message.error(err.response?.data?.message || 'Failed');
        } finally { setSettingCountry(false); }
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
        } catch { /* no existing design */ }
    };

    const loadDesignForEditing = (design) => {
        const url = `${getUploadsUrl(design.file_path)}?t=${Date.now()}`;
        setSelectedDesignId(design.id);
        setImagePreview(url);
        fetch(url)
            .then(r => { if (!r.ok) throw new Error(r.statusText); return r.blob(); })
            .then(blob => setSelectedImage(new File([blob], design.name, { type: 'image/png' })))
            .catch(err => message.error(`Failed to load: ${err.message}`));
    };

    const handleAddText = () => {
        if (!currentText.trim()) return message.warning('Enter a name');
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
            let res;
            if (isEditMode && existingConfiguratorDesign?.id) {
                res = await updateBackDesign(existingConfiguratorDesign.id, formData);
            } else {
                res = await uploadBackDesign(formData);
            }
            message.success(res.data?.message || 'Saved!');
            setSelectedImage(null); setImagePreview(null);
            setTextElements([]); setSelectedTextId(null);
            setIsEditMode(false); setExistingConfiguratorDesign(null);
            fetchBackDesigns(); fetchConfiguratorDesign();
        } catch (err) {
            message.error(err?.response?.data?.message || 'Failed');
        } finally { setUploading(false); }
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', minHeight: '60vh', alignItems: 'center' }}><Spin size="large" /></div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>Back Design Configurator</Title>
                <Button
                    type="default"
                    icon={<EyeOutlined />}
                    disabled={!imagePreview}
                    onClick={() => setPreviewOpen(true)}
                >
                    Preview in 3D
                </Button>
            </div>

            <Row gutter={[24, 24]}>
                {/* Left: Gallery + Settings */}
                <Col xs={24} lg={10}>
                    <Card>
                        <Title level={5} style={{ marginTop: 0 }}>1. Select Base Image</Title>
                        <DesignGallery
                            backDesigns={backDesigns}
                            designsLoading={designsLoading}
                            libraryDesigns={libraryDesigns}
                            libraryLoading={libraryLoading}
                            countries={countries}
                            myClass={myClass}
                            settingCountry={settingCountry}
                            selectedDesignId={selectedDesignId}
                            galleryTab={galleryTab}
                            setGalleryTab={setGalleryTab}
                            onSelectDesign={loadDesignForEditing}
                            onSetCountry={handleSetCountry}
                        />

                        <Divider />

                        <div style={{ marginBottom: 16 }}>
                            <Text strong style={{ display: 'block', marginBottom: 8 }}>Garment Color</Text>
                            <Select value={designColor} onChange={setDesignColor} style={{ width: '100%' }}>
                                <Select.Option value="white">
                                    <Space>
                                        <div style={{ width: 16, height: 16, background: 'white', border: '1px solid #d9d9d9', borderRadius: 3 }} />
                                        White Garment
                                    </Space>
                                </Select.Option>
                                <Select.Option value="black">
                                    <Space>
                                        <div style={{ width: 16, height: 16, background: 'black', borderRadius: 3 }} />
                                        Black Garment
                                    </Space>
                                </Select.Option>
                            </Select>
                            <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
                                Print color: <strong>{designColor === 'black' ? 'White' : 'Black'}</strong>
                            </Text>
                        </div>

                        <Divider />
                        <Title level={5}>2. Names</Title>

                        {textElements.map(el => (
                            <Card
                                key={el.id}
                                size="small"
                                style={{ marginBottom: 8, border: selectedTextId === el.id ? '2px solid #00b96b' : '1px solid #f0f0f0', cursor: 'pointer' }}
                                onClick={() => setSelectedTextId(el.id)}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <Text strong>{el.text}</Text>
                                        <br />
                                        <Text type="secondary" style={{ fontSize: 11 }}>
                                            {el.fontSize}px · {el.rotation}° · {el.locked ? '🔒' : 'Unlocked'}
                                        </Text>
                                    </div>
                                </div>

                                {selectedTextId === el.id && (
                                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
                                        <Space direction="vertical" style={{ width: '100%' }} size="small">
                                            {!el.locked && (
                                                <div>
                                                    <Text type="secondary" style={{ fontSize: 11 }}>Edit Name</Text>
                                                    <Input
                                                        key={`edit-${el.id}`}
                                                        size="small"
                                                        defaultValue={el.text}
                                                        style={{ marginTop: 4 }}
                                                        onClick={e => e.stopPropagation()}
                                                        onBlur={e => {
                                                            const v = e.target.value.trim();
                                                            if (v) setTextElements(prev => prev.map(t => t.id === el.id ? { ...t, text: v } : t));
                                                        }}
                                                        onPressEnter={e => {
                                                            const v = e.target.value.trim();
                                                            if (v) setTextElements(prev => prev.map(t => t.id === el.id ? { ...t, text: v } : t));
                                                        }}
                                                    />
                                                </div>
                                            )}
                                            <Row gutter={8}>
                                                <Col span={14}>
                                                    <Text type="secondary" style={{ fontSize: 11 }}>Font Size</Text>
                                                    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                                        <Button size="small" icon={<MinusCircleOutlined />} disabled={el.locked}
                                                            onClick={e => { e.stopPropagation(); setTextElements(prev => prev.map(t => t.id === el.id ? { ...t, fontSize: Math.max(10, t.fontSize - 2) } : t)); }} />
                                                        <Input size="small" value={el.fontSize} style={{ width: 50, textAlign: 'center' }} readOnly />
                                                        <Button size="small" icon={<PlusCircleOutlined />} disabled={el.locked}
                                                            onClick={e => { e.stopPropagation(); setTextElements(prev => prev.map(t => t.id === el.id ? { ...t, fontSize: Math.min(72, t.fontSize + 2) } : t)); }} />
                                                    </div>
                                                </Col>
                                                <Col span={10}>
                                                    <Text type="secondary" style={{ fontSize: 11 }}>Rotation (°)</Text>
                                                    <Input
                                                        size="small" type="number" min={-359} max={359}
                                                        value={el.rotation} disabled={el.locked}
                                                        style={{ marginTop: 4 }}
                                                        onClick={e => e.stopPropagation()}
                                                        onChange={e => {
                                                            const v = Math.min(359, Math.max(-359, Number(e.target.value) || 0));
                                                            setTextElements(prev => prev.map(t => t.id === el.id ? { ...t, rotation: v } : t));
                                                        }}
                                                    />
                                                </Col>
                                            </Row>
                                            <Space size="small" style={{ width: '100%', justifyContent: 'flex-end' }}>
                                                <Tooltip title={el.locked ? 'Unlock' : 'Lock'}>
                                                    <Button size="small" type={el.locked ? 'primary' : 'default'}
                                                        onClick={e => { e.stopPropagation(); setTextElements(prev => prev.map(t => t.id === el.id ? { ...t, locked: !t.locked } : t)); }}
                                                        icon={el.locked ? <LockOutlined /> : <UnlockOutlined />} />
                                                </Tooltip>
                                                <Tooltip title="Delete">
                                                    <Button size="small" danger
                                                        onClick={e => { e.stopPropagation(); handleRemoveText(el.id); }}
                                                        icon={<DeleteOutlined />} />
                                                </Tooltip>
                                            </Space>
                                        </Space>
                                    </div>
                                )}
                            </Card>
                        ))}

                        <TextArea
                            placeholder="Enter name"
                            value={currentText}
                            onChange={e => setCurrentText(e.target.value)}
                            onPressEnter={e => { e.preventDefault(); handleAddText(); }}
                            rows={2}
                        />
                        <Select value={currentFontSize} onChange={setCurrentFontSize} style={{ width: '100%', marginTop: 8 }}>
                            {[10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48].map(v =>
                                <Select.Option key={v} value={v}>{v}px</Select.Option>
                            )}
                        </Select>
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddText} block style={{ marginTop: 8 }}>
                            Add Name
                        </Button>

                        <Divider />
                        <Title level={5}>3. {isEditMode ? 'Update' : 'Submit'} Design</Title>
                        <Button
                            type="primary" icon={<SaveOutlined />} onClick={handleSubmit}
                            block loading={uploading}
                            disabled={!selectedImage || textElements.length === 0}
                        >
                            {uploading ? 'Saving...' : (isEditMode ? 'Update Back Design' : 'Submit Back Design')}
                        </Button>
                    </Card>
                </Col>

                {/* Right: Canvas Editor */}
                <Col xs={24} lg={14}>
                    <Card style={{ position: 'sticky', top: 24 }}>
                        <DesignCanvas
                            imagePreview={imagePreview}
                            textElements={textElements}
                            designColor={designColor}
                            isDragging={isDragging}
                            setIsDragging={setIsDragging}
                            selectedTextId={selectedTextId}
                            setSelectedTextId={setSelectedTextId}
                            dragOffset={dragOffset}
                            setDragOffset={setDragOffset}
                            setTextElements={setTextElements}
                            canvasRef={canvasRef}
                        />
                    </Card>
                </Col>
            </Row>

            {/* 3D Preview Modal */}
            <PreviewModal
                open={previewOpen}
                onClose={() => setPreviewOpen(false)}
                canvasRef={canvasRef}
            />
        </div>
    );
};

export default BackDesignConfiguratorPage;
