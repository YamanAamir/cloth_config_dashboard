import React, { useState, useEffect, useRef } from 'react';
import {
    Card, Typography, Button, message, Space, Spin,
    Select, Row, Col, Divider, Input, Tooltip, Tabs, Badge
} from 'antd';
import {
    PlusOutlined, SaveOutlined, DeleteOutlined,
    LockOutlined, UnlockOutlined, PlusCircleOutlined, MinusCircleOutlined, EyeOutlined, CheckCircleOutlined
} from '@ant-design/icons';
import {
    getMyClass, uploadBackDesign, updateBackDesign,
    getMyBackDesigns, getClassBackDesign,
    getClassRepLibraryDesigns, getStudyTripCountries, setStudyTripCountry,
    getClassRepFonts, saveConfiguratorState, loadConfiguratorState, getStudents
} from '../api/api';
import { getUploadsUrl } from '../utils/constants';
import DesignGallery from '../components/configurator/DesignGallery';
import DesignCanvas from '../components/configurator/DesignCanvas';
import PreviewModal from '../components/configurator/PreviewModal';

const { Title, Text } = Typography;
const { TextArea } = Input;

const BackDesignConfiguratorPage = () => {
    // State for tracking name edits
    const [editingNameId, setEditingNameId] = useState(null);
    const [editingNameValue, setEditingNameValue] = useState('');
    const [hasNameChanged, setHasNameChanged] = useState(false);
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
    const [allBackDesigns, setAllBackDesigns] = useState([]);
    // Selected design — full object so we can switch between file_path (white) and file_path_2 (black)
    const [selectedDesign, setSelectedDesign] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [selectedDesignId, setSelectedDesignId] = useState(null);
    const [existingConfiguratorDesign, setExistingConfiguratorDesign] = useState(null);

    // Image position & size on canvas (draggable/resizable)
    const [imageLayout, setImageLayout] = useState({ x: 0, y: 0, w: 3508, h: 4961 });
    const [isEditMode, setIsEditMode] = useState(false);

    // Text/names
    const [textElements, setTextElements] = useState([]);
    const [currentText, setCurrentText] = useState('');
    const [currentFontSize, setCurrentFontSize] = useState(60);
    const [selectedTextId, setSelectedTextId] = useState(null);

    // Drag
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // Garment color
    const [designColor, setDesignColor] = useState('white');
    const [fonts, setFonts] = useState([]);
    const [currentFontFamily, setCurrentFontFamily] = useState('Arial');

    // Preview modal
    const [previewOpen, setPreviewOpen] = useState(false);

    // Names tab
    const [namesTab, setNamesTab] = useState('manual');
    const [students, setStudents] = useState([]);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [selectedStudents, setSelectedStudents] = useState(new Set());

    const canvasRef = useRef(null);
    const autoSaveTimer = useRef(null);
    const [autoSaving, setAutoSaving] = useState(false);
    const user = localStorage.getItem('user');
    const classId = user ? JSON.parse(user)?.class_id : null;

    // Handle name edit start
    const handleStartEditName = (element) => {
        setEditingNameId(element.id);
        setEditingNameValue(element.text);
        setHasNameChanged(false);
    };

    // Handle name change
    const handleNameChange = (value, originalText) => {
        setEditingNameValue(value);
        setHasNameChanged(value.trim() !== originalText && value.trim() !== '');
    };

    // Handle save name
    const handleSaveName = () => {
        if (editingNameValue.trim() && hasNameChanged) {
            setTextElements(prev => prev.map(t =>
                t.id === editingNameId ? { ...t, text: editingNameValue.trim() } : t
            ));
            triggerAutoSave(
                textElements.map(t => t.id === editingNameId ? { ...t, text: editingNameValue.trim() } : t),
                imageLayout,
                selectedDesignId
            );
        }
        // Reset editing state
        setEditingNameId(null);
        setEditingNameValue('');
        setHasNameChanged(false);
    };

    // Handle cancel edit
    const handleCancelEdit = () => {
        setEditingNameId(null);
        setEditingNameValue('');
        setHasNameChanged(false);
    };

    useEffect(() => {
        fetchMyClass();
        fetchLibraryDesigns();
        fetchBackDesigns();
        fetchCountries();
        fetchFonts();
    }, []);

    useEffect(() => {
        // Guard: allBackDesigns khali hai means data abhi load nahi hua (race condition).
        if (allBackDesigns.length === 0) return;
        // Show all approved designs — color filtering removed, toggle handles it on canvas
        setBackDesigns(allBackDesigns.filter(d => !d.isFromConfigurator && d.process_status === 'approved'));
    }, [allBackDesigns]);

    const fetchMyClass = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await getMyClass();
            setMyClass(res.data.data?.[0]);
        } catch { if (!silent) message.error('Failed to fetch class'); }
        finally { if (!silent) setLoading(false); }
    };

    const fetchBackDesigns = async () => {
        setDesignsLoading(true);
        try {
            const res = await getMyBackDesigns({ limit: 100 });
            if (res.data?.success && res.data?.data) {
                setAllBackDesigns(res.data.data);
                const approved = res.data.data.filter(d => !d.isFromConfigurator && d.process_status === 'approved');
                setBackDesigns(approved);
                loadState(approved);
            } else {
                setBackDesigns([]);
                setAllBackDesigns([]);
            }
        } finally {
            setDesignsLoading(false);
        }
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
            setCountries(res.data.data.filter(c => c.status === 0) || []);
        } catch { /* silent */ }
    };

    const fetchFonts = async () => {
        try {
            const res = await getClassRepFonts();
            const data = res.data.data || [];
            setFonts(data);
            if (data.length > 0) setCurrentFontFamily(data[0].name);
            // Load each font's CSS
            data.forEach(f => {
                if (f.google_font_url) {
                    const id = `gf-${f.id}`;
                    if (!document.getElementById(id)) {
                        const link = document.createElement('link');
                        link.id = id;
                        link.rel = 'stylesheet';
                        link.href = f.google_font_url;
                        document.head.appendChild(link);
                    }
                }
            });
        } catch { /* silent */ }
    };

    // Load saved configurator state from existing configurator design
    const loadState = async (backDesignsList = []) => {
        try {
            // Use getClassBackDesign which already has configurator_state
            const res = await getClassBackDesign(classId);
            if (res.data?.success && res.data?.data) {
                const design = res.data.data;
                setExistingConfiguratorDesign(design);
                setIsEditMode(true);

                const state = design.configurator_state;

                if (state?.baseDesignId) {
                    // Restore text elements, color, layout
                    if (state.textElements?.length > 0) setTextElements(state.textElements);
                    if (state.designColor) setDesignColor(state.designColor);
                    if (state.imageLayout) setImageLayout(state.imageLayout);

                    // Load base design by ID
                    const found = backDesignsList.find(d => d.id === state.baseDesignId);
                    if (found) { loadDesignForEditing(found, true); return; }

                    // Try library designs
                    try {
                        const lRes = await getClassRepLibraryDesigns();
                        const libFound = (lRes.data?.data || []).find(d => d.id === state.baseDesignId);
                        if (libFound) { loadDesignForEditing(libFound, true); return; }
                    } catch { /* silent */ }
                }

                // No state or baseDesignId not found - fallback to first design
                if (backDesignsList.length > 0) loadDesignForEditing(backDesignsList[0]);
            } else {
                // No existing configurator design - auto-select first
                if (backDesignsList.length > 0) loadDesignForEditing(backDesignsList[0]);
            }
        } catch {
            // No configurator design exists yet - auto-select first
            if (backDesignsList.length > 0) loadDesignForEditing(backDesignsList[0]);
        }
    };

    // Auto-save debounced
    const triggerAutoSave = (newTextElements, newDesignColor, newImageLayout, newSelectedDesignId) => {
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = setTimeout(async () => {
            try {
                setAutoSaving(true);
                await saveConfiguratorState({
                    configurator_state: {
                        textElements: newTextElements,
                        imageLayout: newImageLayout,
                        baseDesignId: newSelectedDesignId,
                    },
                    name: `design_draft_${Date.now()}`,
                });
            } catch { /* silent */ }
            finally { setAutoSaving(false); }
        }, 2000);
    };

    const fetchStudents = async () => {
        setStudentsLoading(true);
        try {
            const res = await getStudents({ page: 1, limit: 100 });
            // Sort by name alphabetically
            const sorted = (res.data.data || []).sort((a, b) => a.name.localeCompare(b.name));
            setStudents(sorted);
        } catch { /* silent */ }
        finally { setStudentsLoading(false); }
    };

    // Clear canvas when gallery tab changes so previous tab's selection doesn't bleed through
    const handleGalleryTabChange = (tab) => {
        setGalleryTab(tab);
        setSelectedDesignId(null);
        setSelectedImage(null);
        setImagePreview(null);
        setImageLayout({ x: 0, y: 0, w: 3508, h: 4961 });
    };

    const handleSetCountry = async (countryId) => {
        setSettingCountry(true);
        try {
            await setStudyTripCountry({ country_id: countryId || null });
            message.success('Studietur land opdateret');
            // Refresh myClass so hasCountry updates in DesignGallery
            fetchMyClass(true);
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
                // Only set edit mode - loadState handles the actual loading
            }
        } catch { /* no existing design */ }
    };

    const loadDesignForEditing = (design, keepLayout = false, colorOverride = null) => {
        const activeColor = colorOverride || designColor;
        // Pick white or black version based on active toggle
        const activePath = (activeColor === 'black' && design.file_path_2)
            ? design.file_path_2
            : design.file_path;

        const url = `${getUploadsUrl(activePath)}?t=${Date.now()}`;
        setSelectedDesign(design);
        setSelectedDesignId(design.id);
        if (!keepLayout) setImageLayout({ x: 0, y: 0, w: 3508, h: 4961 });
        setImagePreview(url);

        fetch(url)
            .then(r => { if (!r.ok) throw new Error(r.statusText); return r.blob(); })
            .then(blob => {
                const file = new File([blob], design.name, { type: 'image/png' });
                setSelectedImage(file);
                const img = new Image();
                img.onload = () => {
                    const { width, height } = img;
                    if (width > 4000 || height > 5600) {
                        message.warning({
                            content: `Selected design (${width}×${height}px) exceeds A3 size limit. You can use it for editing, but final export may be rejected.`,
                            duration: 8
                        });
                    }
                };
                img.src = url;
            })
            .catch(err => message.error(`Failed to load: ${err.message}`));
    };

    // When toggle changes — reload the same design with the new color version
    const handleDesignColorToggle = (color) => {
        setDesignColor(color);
        if (selectedDesign) {
            loadDesignForEditing(selectedDesign, true, color);
        }
    };

    const handleAddText = () => {
        if (!currentText.trim()) return message.warning('Enter a name');
        if (textElements.length >= 40) return message.warning('Maximum 40 names allowed');
        const newElements = [...textElements, {
            id: Date.now(),
            text: currentText,
            fontSize: currentFontSize,
            fontFamily: currentFontFamily,
            x: 680,
            y: 80 + textElements.length * (currentFontSize + 8),
            rotation: 0,
            locked: false,
        }];
        setTextElements(newElements);
        setCurrentText('');
        triggerAutoSave(newElements, imageLayout, selectedDesignId);
    };

    const handleRemoveText = (id) => {
        setTextElements(prev => prev.filter(el => el.id !== id));
        if (selectedTextId === id) setSelectedTextId(null);
    };

    const handleSubmit = async () => {
        if (!selectedImage) return message.error('Select an image first');
        if (textElements.length === 0) return message.warning('Add at least one name');

        // A3 validation for base image dimensions
        if (selectedImage) {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    const { width, height } = img;

                    // A3 dimensions at 300 DPI: max 4000 × 5600 pixels
                    const maxWidth = 4000;
                    const maxHeight = 5600;

                    if (width > maxWidth || height > maxHeight) {
                        message.error(`Base design is too large! Maximum size is ${maxWidth} × ${maxHeight} pixels (A3 format). Selected image is ${width} × ${height} pixels. Please select a smaller design.`);
                        resolve();
                        return;
                    }

                    // Proceed with upload if validation passes
                    performUpload();
                    resolve();
                };

                img.onerror = () => {
                    message.error('Failed to read base image dimensions');
                    resolve();
                };

                img.src = URL.createObjectURL(selectedImage);
            });
        }
    };

    const performUpload = async () => {
        setUploading(true);
        try {
            // Force canvas redraw with WHITE background for export (A3 size)
            if (canvasRef.current) {
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');

                // A3 at 300 DPI
                canvas.width = 3508;
                canvas.height = 4961;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, 3508, 4961);

                // Redraw image if exists
                if (imagePreview) {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    await new Promise((resolve) => {
                        img.onload = () => {
                            ctx.drawImage(img, imageLayout.x, imageLayout.y, imageLayout.w, imageLayout.h);
                            resolve();
                        };
                        img.src = imagePreview;
                    });
                }

                // Redraw text elements
                textElements.forEach(el => {
                    ctx.save();
                    ctx.translate(el.x, el.y);
                    ctx.rotate((el.rotation * Math.PI) / 180);
                    ctx.font = `${el.fontSize}px ${el.fontFamily}`;
                    ctx.fillStyle = designColor === 'black' ? '#ffffff' : '#000000'; // Text color based on garment
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(el.text, 0, 0);
                    ctx.restore();
                });
            }

            await new Promise(resolve => setTimeout(resolve, 100));
            const blob = await new Promise(resolve => canvasRef.current.toBlob(resolve, 'image/png'));

            const formData = new FormData();
            const fileName = selectedImage.name.replace(/\.[^/.]+$/, '');
            formData.append('name', `${fileName}_configured`);
            formData.append('backDesign', blob, `${fileName}_configured.png`);
            formData.append('isFromConfigurator', 'true');
            // Save configurator state so it can be restored later
            formData.append('configurator_state', JSON.stringify({
                textElements,
                designColor,
                imageLayout,
                baseDesignId: selectedDesignId,
            }));
            let res;
            if (isEditMode && existingConfiguratorDesign?.id) {
                res = await updateBackDesign(existingConfiguratorDesign.id, formData);
            } else {
                res = await uploadBackDesign(formData);
            }
            message.success(res.data?.message || 'Saved!');
            // Keep editor state - don't reset
            setIsEditMode(true);
            if (res.data?.data) setExistingConfiguratorDesign(res.data.data);
            // Don't call fetchBackDesigns - it triggers loadState which resets gallery tab
        } catch (err) {
            message.error(err?.response?.data?.message || 'Failed');
        } finally {
            setUploading(false);
        }
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', minHeight: '60vh', alignItems: 'center' }}><Spin size="large" /></div>;

    // When order is locked: existing names are read-only, but new names can still be added
    const isOrderLocked = myClass?.order_locked === true;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Title level={4} style={{ margin: 0 }}>Bagdesign Konfigurator</Title>
                    {isOrderLocked && (
                        <Text type="warning" style={{ fontSize: 12 }}>
                            Bestillinger låst — du kan tilføje nye navne, men eksisterende navne og design kan ikke ændres.
                        </Text>
                    )}
                    {!isOrderLocked && autoSaving && <Text type="secondary" style={{ fontSize: 12 }}> Gemmer...</Text>}
                    {!isOrderLocked && !autoSaving && textElements.length > 0 && <Text type="secondary" style={{ fontSize: 12 }}> Kladde gemt</Text>}
                </div>
            </div>

            <Row gutter={[24, 24]}>
                {/* Left: Gallery + Settings */}
                <Col xs={24} lg={10}>
                    <Card>
                        <Title level={5} style={{ marginTop: 0 }}>1. Vælg basisbillede</Title>
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
                            setGalleryTab={handleGalleryTabChange}
                            onSelectDesign={isOrderLocked ? undefined : loadDesignForEditing}
                            onSetCountry={handleSetCountry}
                            isLocked={isOrderLocked}
                        />

                        <Divider />
                        <Tabs
                            activeKey={namesTab}
                            onChange={(key) => {
                                setNamesTab(key);
                                if (key === 'students' && students.length === 0) fetchStudents();
                            }}
                            size="small"
                            items={[
                                {
                                    key: 'manual',
                                    label: <span>Navne {textElements.length > 0 && <Badge count={textElements.length} color="#00b96b" style={{ marginLeft: 4 }} />}</span>,
                                    children: (
                                        <>
                                            {textElements.map(el => (
                                                <Card
                                                    key={el.id}
                                                    size="small"
                                                    style={{
                                                        marginBottom: 8,
                                                        border: selectedTextId === el.id ? '2px solid #00b96b' :
                                                            editingNameId === el.id ? '2px solid #1890ff' : '1px solid #f0f0f0',
                                                        cursor: isOrderLocked ? 'default' : 'pointer',
                                                        backgroundColor: editingNameId === el.id ? '#f0f9ff' : 'white'
                                                    }}
                                                    onClick={() => !isOrderLocked && setSelectedTextId(el.id)}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div>
                                                            <Text strong>{el.text}</Text>
                                                            <br />
                                                            <Text type="secondary" style={{ fontSize: 11 }}>
                                                                {el.fontSize}px · {el.rotation}°
                                                                {isOrderLocked
                                                                    ? ' ·  Låst'
                                                                    : ` · ${el.locked ? '' : 'Ulåst'}`
                                                                }
                                                            </Text>
                                                        </div>
                                                    </div>
                                                    {/* Only show edit controls when NOT order-locked */}
                                                    {!isOrderLocked && selectedTextId === el.id && (
                                                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
                                                            <Space direction="vertical" style={{ width: '100%' }} size="small">
                                                                {!el.locked && (
                                                                    <div>
                                                                        <Text type="secondary" style={{ fontSize: 11 }}>Rediger navn</Text>
                                                                        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                                                            <Input
                                                                                size="small"
                                                                                value={editingNameId === el.id ? editingNameValue : el.text}
                                                                                onClick={e => {
                                                                                    e.stopPropagation();
                                                                                    if (editingNameId !== el.id) {
                                                                                        handleStartEditName(el);
                                                                                    }
                                                                                }}
                                                                                onChange={e => {
                                                                                    if (editingNameId === el.id) {
                                                                                        handleNameChange(e.target.value, el.text);
                                                                                    }
                                                                                }}
                                                                                onPressEnter={handleSaveName}
                                                                                onBlur={() => {
                                                                                    if (hasNameChanged) {
                                                                                        handleSaveName();
                                                                                    } else {
                                                                                        handleCancelEdit();
                                                                                    }
                                                                                }}
                                                                                style={{ flex: 1 }}
                                                                                placeholder="Indtast navn"
                                                                            />
                                                                            {editingNameId === el.id && hasNameChanged && (
                                                                                <Button
                                                                                    size="small"
                                                                                    type="primary"
                                                                                    icon={<CheckCircleOutlined />}
                                                                                    style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                                                                                    onClick={e => { e.stopPropagation(); handleSaveName(); }}
                                                                                    title="Save changes (or press Enter)"
                                                                                />
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                <Row gutter={8}>
                                                                    <Col span={14}>
                                                                        <Text type="secondary" style={{ fontSize: 11 }}>Skriftstørrelse</Text>
                                                                        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                                                            <Button size="small" icon={<MinusCircleOutlined />} disabled={el.locked}
                                                                                onClick={e => { e.stopPropagation(); setTextElements(prev => prev.map(t => t.id === el.id ? { ...t, fontSize: Math.max(10, t.fontSize - 4) } : t)); }} />
                                                                            <Input size="small" value={el.fontSize} style={{ width: 50, textAlign: 'center' }} readOnly />
                                                                            <Button size="small" icon={<PlusCircleOutlined />} disabled={el.locked}
                                                                                onClick={e => { e.stopPropagation(); setTextElements(prev => prev.map(t => t.id === el.id ? { ...t, fontSize: Math.min(240, t.fontSize + 4) } : t)); }} />
                                                                        </div>
                                                                    </Col>
                                                                    <Col span={10}>
                                                                        <Text type="secondary" style={{ fontSize: 11 }}>Rotation (°)</Text>
                                                                        <Input size="small" type="number" min={-359} max={359} value={el.rotation} disabled={el.locked} style={{ marginTop: 4 }}
                                                                            onClick={e => e.stopPropagation()}
                                                                            onChange={e => { const v = Math.min(359, Math.max(-359, Number(e.target.value) || 0)); setTextElements(prev => prev.map(t => t.id === el.id ? { ...t, rotation: v } : t)); }}
                                                                        />
                                                                    </Col>
                                                                </Row>
                                                                {fonts.length > 0 && (
                                                                    <div style={{ marginTop: 4 }}>
                                                                        <Text type="secondary" style={{ fontSize: 11 }}>Skrifttype</Text>
                                                                        <Select size="small" value={el.fontFamily} disabled={el.locked} style={{ width: '100%', marginTop: 4 }}
                                                                            onChange={v => setTextElements(prev => prev.map(t => t.id === el.id ? { ...t, fontFamily: v } : t))}
                                                                            onClick={e => e.stopPropagation()}>
                                                                            {fonts.map(f => <Select.Option key={f.id} value={f.name}><span style={{ fontFamily: f.name }}>{f.name}</span></Select.Option>)}
                                                                        </Select>
                                                                    </div>
                                                                )}
                                                                <Space size="small" style={{ width: '100%', justifyContent: 'flex-end' }}>
                                                                    <Tooltip title={el.locked ? 'Lås op' : 'Lås'}>
                                                                        <Button size="small" type={el.locked ? 'primary' : 'default'}
                                                                            onClick={e => { e.stopPropagation(); setTextElements(prev => prev.map(t => t.id === el.id ? { ...t, locked: !t.locked } : t)); }}
                                                                            icon={el.locked ? <LockOutlined /> : <UnlockOutlined />} />
                                                                    </Tooltip>
                                                                    <Tooltip title="Slet">
                                                                        <Button size="small" danger onClick={e => { e.stopPropagation(); handleRemoveText(el.id); }} icon={<DeleteOutlined />} />
                                                                    </Tooltip>
                                                                </Space>
                                                            </Space>
                                                        </div>
                                                    )}
                                                </Card>
                                            ))}
                                            <TextArea placeholder="Indtast navn" value={currentText} onChange={e => setCurrentText(e.target.value)}
                                                onPressEnter={e => { e.preventDefault(); handleAddText(); }} rows={2} style={{ marginTop: 8 }} />
                                            <Select value={currentFontSize} onChange={setCurrentFontSize} style={{ width: '100%', marginTop: 8 }}>
                                                {[64, 68, 72, 76, 80, 84, 88, 92, 96, 100,
                                                    104, 108, 112, 116, 120, 124, 128, 132, 136, 140,
                                                    144, 148, 152, 156, 160, 164, 168, 172, 176, 180,
                                                    184, 188, 192, 196, 200, 204, 208, 212, 216, 220,
                                                    224, 228, 232, 236, 240, 244, 248, 250].map(v => <Select.Option key={v} value={v}>{v}px</Select.Option>)}
                                            </Select>
                                            <Select value={currentFontFamily} onChange={setCurrentFontFamily} style={{ width: '100%', marginTop: 8 }} placeholder="Select font" showSearch optionFilterProp="label">
                                                {fonts.map(f => <Select.Option key={f.id} value={f.name} label={f.name}><span style={{ fontFamily: f.name, fontSize: 15 }}>{f.name}</span></Select.Option>)}
                                            </Select>
                                            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddText} block style={{ marginTop: 8 }} disabled={textElements.length >= 40}>
                                                Tilføj navn {textElements.length >= 40 ? '(max 40)' : `(${textElements.length}/40)`}
                                            </Button>
                                        </>
                                    )
                                },
                                {
                                    key: 'students',
                                    label: <span>Elever {students.length > 0 && <Badge count={students.length} color="#1890ff" style={{ marginLeft: 4 }} />}</span>,
                                    children: studentsLoading ? <Spin style={{ display: 'block', margin: '20px auto' }} /> : (
                                        <>
                                            {students.length === 0 ? (
                                                <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: 20 }}>Ingen registrerede elever endnu</Text>
                                            ) : (
                                                <>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                                            {selectedStudents.size} valgt
                                                        </Text>
                                                        <Space size="small">
                                                            <Button size="small" onClick={() => setSelectedStudents(new Set(students.map(s => s.id)))}>Alle</Button>
                                                            <Button size="small" onClick={() => setSelectedStudents(new Set())}>Ingen</Button>
                                                        </Space>
                                                    </div>
                                                    {students.map((s, idx) => {
                                                        const isAdded = textElements.some(el => el.text === s.name);
                                                        const isSelected = selectedStudents.has(s.id);
                                                        return (
                                                            <div key={s.id}
                                                                onClick={() => {
                                                                    setSelectedStudents(prev => {
                                                                        const n = new Set(prev);
                                                                        n.has(s.id) ? n.delete(s.id) : n.add(s.id);
                                                                        return n;
                                                                    });
                                                                }}
                                                                style={{
                                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                                    padding: '8px 12px', marginBottom: 4, borderRadius: 6, cursor: 'pointer',
                                                                    background: isSelected ? '#f0fff8' : '#fafafa',
                                                                    border: isSelected ? '1px solid #00b96b' : '1px solid #f0f0f0',
                                                                }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                    <div style={{ width: 16, height: 16, borderRadius: 3, border: `2px solid ${isSelected ? '#00b96b' : '#d9d9d9'}`, background: isSelected ? '#00b96b' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        {isSelected && <span style={{ color: 'white', fontSize: 10, lineHeight: 1 }}>✓</span>}
                                                                    </div>
                                                                    <Text strong style={{ fontSize: 13 }}>{idx + 1}. {s.name}</Text>
                                                                </div>
                                                                {isAdded && <Text type="success" style={{ fontSize: 11 }}>✓ Tilføjet</Text>}
                                                            </div>
                                                        );
                                                    })}
                                                    <Button type="primary" block style={{ marginTop: 10 }}
                                                        disabled={selectedStudents.size === 0}
                                                        onClick={() => {
                                                            const toAdd = students.filter(s => selectedStudents.has(s.id));
                                                            const remaining = 40 - textElements.length;
                                                            if (remaining <= 0) return message.warning('Maximum 40 names already added');
                                                            const limited = toAdd.slice(0, remaining);
                                                            if (limited.length < toAdd.length) {
                                                                message.warning(`Only ${limited.length} name(s) added — max 40 total`);
                                                            }
                                                            const newEls = limited.map((s, i) => ({
                                                                id: Date.now() + i,
                                                                text: s.name,
                                                                fontSize: currentFontSize,
                                                                fontFamily: currentFontFamily,
                                                                x: 680,
                                                                y: 80 + (textElements.length + i) * (currentFontSize + 8),
                                                                rotation: 0,
                                                                locked: false,
                                                            }));
                                                            setTextElements(prev => [...prev, ...newEls]);
                                                            setSelectedStudents(new Set());
                                                            setNamesTab('manual');
                                                        }}>
                                                        Tilføj {selectedStudents.size > 0 ? `${selectedStudents.size} ` : ''}til lærred
                                                    </Button>
                                                </>
                                            )}
                                            <Button type="default" block style={{ marginTop: 8 }} onClick={fetchStudents}>Opdater</Button>
                                        </>
                                    )
                                }
                            ]}
                        />

                        <Divider />
                        <Title level={5}>3. {isEditMode ? 'Opdater' : 'Indsend'} design</Title>
                        {isOrderLocked ? (
                            <>
                                <Button
                                    type="primary"
                                    icon={<SaveOutlined />}
                                    onClick={handleSubmit}
                                    block
                                    loading={uploading}
                                    style={{ color: 'white' }}
                                    disabled={!selectedImage}
                                >
                                    {uploading ? 'Gemmer...' : 'Gem nye navne'}
                                </Button>
                                <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12, textAlign: 'center' }}>
                                    Design er låst — kun nye navne vil blive tilføjet til det eksisterende design.
                                </Text>
                            </>
                        ) : (
                            <Button
                                type="primary" icon={<SaveOutlined />} onClick={handleSubmit}
                                block loading={uploading}
                                style={{ color: 'white' }}
                                disabled={!selectedImage || textElements.length === 0}
                            >
                                {uploading ? 'Gemmer...' : (isEditMode ? 'Opdater bagdesign' : 'Indsend bagdesign')}
                            </Button>
                        )}
                    </Card>
                </Col>

                {/* Right: Canvas Editor */}
                <Col xs={24} lg={14}>
                    <Card style={{ position: 'sticky', top: 24 }}>
                        <DesignCanvas
                            setPreviewOpen={setPreviewOpen}
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
                            imageLayout={imageLayout}
                            setImageLayout={setImageLayout}
                            isLocked={isOrderLocked}
                            colorToggle={imagePreview ? (
                                <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid #d9d9d9' }}>
                                    {[
                                        { value: 'white', label: 'Hvid', sub: 'Sort tryk' },
                                        { value: 'black', label: 'Sort', sub: 'Hvidt tryk' },
                                    ].map(opt => (
                                        <div
                                            key={opt.value}
                                            onClick={() => !isOrderLocked && handleDesignColorToggle(opt.value)}
                                            style={{
                                                padding: '3px 14px',
                                                cursor: isOrderLocked ? 'not-allowed' : 'pointer',
                                                background: designColor === opt.value ? '#00b96b' : '#fafafa',
                                                color: designColor === opt.value ? '#fff' : '#333',
                                                textAlign: 'center',
                                                transition: 'all 0.15s',
                                                borderRight: opt.value === 'white' ? '1px solid #d9d9d9' : 'none',
                                            }}
                                        >
                                            <div style={{ fontSize: 11, fontWeight: 600 }}>{opt.label}</div>
                                            <div style={{ fontSize: 9, opacity: 1 }}>{opt.sub}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        />
                    </Card>
                </Col>
            </Row>

            {/* 3D Preview Modal */}
            <PreviewModal
                open={previewOpen}
                onClose={() => setPreviewOpen(false)}
                canvasRef={canvasRef}
                designColor={designColor}
            />

        </div>
    );
};

export default BackDesignConfiguratorPage;
