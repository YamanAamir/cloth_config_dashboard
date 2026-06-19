import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button, Form, Input, Select, Space, message, Card, Typography, Spin, Segmented, Tooltip, ColorPicker, Slider, Switch, InputNumber } from 'antd';
import { SaveOutlined, ArrowLeftOutlined, EditOutlined, CodeOutlined, PlusOutlined, DragOutlined, DeleteOutlined, CopyOutlined, BgColorsOutlined, FontSizeOutlined, AlignLeftOutlined, AlignCenterOutlined, AlignRightOutlined, BoldOutlined, ItalicOutlined, UnderlineOutlined } from '@ant-design/icons';
import EmailEditor from 'react-email-editor';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createTemplate, updateTemplate, getTemplates } from '../api/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

const CATEGORIES = [
    { value: 'marketing', label: 'Marketing' },
    { value: 'graduation_caps', label: 'Graduation Caps' },
    { value: 'transactional', label: 'Transactional' },
    { value: 'order', label: 'Order' },
];

// Drag and drop item types
const ItemTypes = {
    ELEMENT: 'element',
    TOOLBAR_ITEM: 'toolbar_item'
};

// Advanced Draggable Element with better positioning and overlap support
const AdvancedDraggableElement = ({ element, onUpdate, onDelete, onSelect, isSelected, canvasRef }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [isResizing, setIsResizing] = useState(false);
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

    const elementRef = useRef(null);

    // Handle drag start
    const handleMouseDown = useCallback((e) => {
        if (e.target.classList.contains('resize-handle')) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        onSelect(element);
        setIsDragging(true);
        
        const rect = canvasRef.current.getBoundingClientRect();
        setDragStart({
            x: e.clientX - rect.left - element.x,
            y: e.clientY - rect.top - element.y
        });
    }, [element, onSelect, canvasRef]);

    // Handle resize start
    const handleResizeStart = useCallback((e, direction) => {
        e.preventDefault();
        e.stopPropagation();
        
        setIsResizing(direction);
        setResizeStart({
            x: e.clientX,
            y: e.clientY,
            width: element.width,
            height: element.height
        });
    }, [element]);

    // Mouse move handler
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isDragging && canvasRef.current) {
                const rect = canvasRef.current.getBoundingClientRect();
                const newX = Math.max(0, Math.min(rect.width - element.width, e.clientX - rect.left - dragStart.x));
                const newY = Math.max(0, Math.min(rect.height - element.height, e.clientY - rect.top - dragStart.y));
                
                onUpdate(element.id, { x: newX, y: newY });
            } else if (isResizing) {
                const deltaX = e.clientX - resizeStart.x;
                const deltaY = e.clientY - resizeStart.y;
                
                let newWidth = resizeStart.width;
                let newHeight = resizeStart.height;
                
                if (isResizing.includes('right')) newWidth = Math.max(50, resizeStart.width + deltaX);
                if (isResizing.includes('left')) newWidth = Math.max(50, resizeStart.width - deltaX);
                if (isResizing.includes('bottom')) newHeight = Math.max(30, resizeStart.height + deltaY);
                if (isResizing.includes('top')) newHeight = Math.max(30, resizeStart.height - deltaY);
                
                onUpdate(element.id, { width: newWidth, height: newHeight });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setIsResizing(false);
        };

        if (isDragging || isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, isResizing, dragStart, resizeStart, element, onUpdate, canvasRef]);

    const elementStyle = {
        position: 'absolute',
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        zIndex: element.zIndex || 1,
        border: isSelected ? '2px solid #1890ff' : '1px solid transparent',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        display: 'flex',
        alignItems: element.verticalAlign || 'center',
        justifyContent: element.horizontalAlign || 'center',
        background: element.backgroundColor || 'transparent',
        borderRadius: element.borderRadius || 0,
        padding: element.padding || 0,
        boxShadow: element.shadow ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
        transform: `rotate(${element.rotation || 0}deg)`,
        opacity: element.opacity !== undefined ? element.opacity : 1,
    };

    const renderContent = () => {
        switch (element.type) {
            case 'text':
                return (
                    <div style={{
                        fontSize: element.fontSize || 16,
                        color: element.color || '#000',
                        fontFamily: element.fontFamily || 'Arial, sans-serif',
                        fontWeight: element.fontWeight || 'normal',
                        fontStyle: element.fontStyle || 'normal',
                        textDecoration: element.textDecoration || 'none',
                        textAlign: element.textAlign || 'left',
                        lineHeight: element.lineHeight || 1.4,
                        width: '100%',
                        height: '100%',
                        overflow: 'hidden',
                        wordWrap: 'break-word'
                    }}>
                        {element.content || 'Text Element'}
                    </div>
                );
            case 'image':
                return (
                    <div style={{ 
                        width: '100%', 
                        height: '100%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        background: '#f5f5f5',
                        border: '1px dashed #d9d9d9',
                        borderRadius: element.borderRadius || 0
                    }}>
                        {element.src && element.src.startsWith('http') ? (
                            <img 
                                src={element.src} 
                                alt={element.alt || ''} 
                                style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    objectFit: element.objectFit || 'cover',
                                    borderRadius: element.borderRadius || 0
                                }} 
                                draggable={false}
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.parentNode.innerHTML = `
                                        <div style="
                                            display: flex; 
                                            flex-direction: column; 
                                            align-items: center; 
                                            justify-content: center;
                                            color: #ff4d4f;
                                            font-size: 11px;
                                            text-align: center;
                                            padding: 8px;
                                        ">
                                            <div style="font-size: 16px; margin-bottom: 4px;">❌</div>
                                            <div>Image failed to load</div>
                                            <div style="font-size: 9px; color: #999; margin-top: 2px;">Check URL</div>
                                        </div>
                                    `;
                                }}
                            />
                        ) : (
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#999',
                                fontSize: 11,
                                textAlign: 'center',
                                padding: 8
                            }}>
                                <div style={{ fontSize: 16, marginBottom: 4 }}>🖼️</div>
                                <div>No Image URL</div>
                                <div style={{ fontSize: 9, marginTop: 2 }}>Add hosted URL in properties</div>
                            </div>
                        )}
                    </div>
                );
            case 'button':
                return (
                    <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: element.fontSize || 14,
                        fontWeight: element.fontWeight || 'bold',
                        color: element.textColor || '#fff',
                        textDecoration: 'none',
                        borderRadius: element.borderRadius || 4,
                        border: element.borderWidth ? `${element.borderWidth}px solid ${element.borderColor || '#ccc'}` : 'none'
                    }}>
                        {element.content || 'Button'}
                    </div>
                );
            case 'shape':
                return (
                    <div style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: element.backgroundColor || '#f0f0f0',
                        borderRadius: element.shapeType === 'circle' ? '50%' : element.borderRadius || 0,
                        border: element.borderWidth ? `${element.borderWidth}px solid ${element.borderColor || '#ccc'}` : 'none'
                    }} />
                );
            default:
                return <div>Unknown Element</div>;
        }
    };

    return (
        <div
            ref={elementRef}
            style={elementStyle}
            onMouseDown={handleMouseDown}
            onClick={(e) => {
                e.stopPropagation();
                onSelect(element);
            }}
        >
            {renderContent()}
            
            {/* Selection handles */}
            {isSelected && (
                <>
                    {/* Corner resize handles */}
                    <div className="resize-handle" style={{
                        position: 'absolute', top: -4, left: -4, width: 8, height: 8,
                        background: '#1890ff', cursor: 'nw-resize'
                    }} onMouseDown={(e) => handleResizeStart(e, 'top-left')} />
                    
                    <div className="resize-handle" style={{
                        position: 'absolute', top: -4, right: -4, width: 8, height: 8,
                        background: '#1890ff', cursor: 'ne-resize'
                    }} onMouseDown={(e) => handleResizeStart(e, 'top-right')} />
                    
                    <div className="resize-handle" style={{
                        position: 'absolute', bottom: -4, left: -4, width: 8, height: 8,
                        background: '#1890ff', cursor: 'sw-resize'
                    }} onMouseDown={(e) => handleResizeStart(e, 'bottom-left')} />
                    
                    <div className="resize-handle" style={{
                        position: 'absolute', bottom: -4, right: -4, width: 8, height: 8,
                        background: '#1890ff', cursor: 'se-resize'
                    }} onMouseDown={(e) => handleResizeStart(e, 'bottom-right')} />

                    {/* Action buttons */}
                    <div style={{
                        position: 'absolute',
                        top: -30,
                        right: 0,
                        display: 'flex',
                        gap: 4,
                        background: 'rgba(255,255,255,0.9)',
                        padding: '2px 4px',
                        borderRadius: 4,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                    }}>
                        <Button 
                            size="small" 
                            type="text" 
                            icon={<CopyOutlined />}
                            onClick={(e) => {
                                e.stopPropagation();
                                const newElement = { 
                                    ...element, 
                                    id: Date.now(), 
                                    x: element.x + 20, 
                                    y: element.y + 20,
                                    zIndex: (element.zIndex || 1) + 1
                                };
                                onUpdate(newElement.id, newElement, true); // true for add new
                            }}
                        />
                        <Button 
                            size="small" 
                            type="text" 
                            danger 
                            icon={<DeleteOutlined />}
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(element.id);
                            }}
                        />
                    </div>
                </>
            )}
        </div>
    );
};

// Enhanced Properties Panel
const PropertiesPanel = ({ selectedElement, onUpdate, onDelete }) => {
    if (!selectedElement) {
        return (
            <div style={{ padding: 16, textAlign: 'center', color: '#999' }}>
                Select an element to edit properties
            </div>
        );
    }

    const updateProperty = (property, value) => {
        onUpdate(selectedElement.id, { [property]: value });
    };

    return (
        <div style={{ padding: 16 }}>
            <Typography.Title level={5} style={{ margin: '0 0 16px 0' }}>
                {selectedElement.type.charAt(0).toUpperCase() + selectedElement.type.slice(1)} Properties
            </Typography.Title>
            
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {/* Position & Size */}
                <Card size="small" title="Position & Size">
                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                        <div style={{ display: 'flex', gap: 8 }}>
                            <div style={{ flex: 1 }}>
                                <Text style={{ fontSize: 12 }}>X:</Text>
                                <InputNumber 
                                    size="small" 
                                    value={selectedElement.x} 
                                    onChange={(value) => updateProperty('x', value || 0)}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <Text style={{ fontSize: 12 }}>Y:</Text>
                                <InputNumber 
                                    size="small" 
                                    value={selectedElement.y} 
                                    onChange={(value) => updateProperty('y', value || 0)}
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <div style={{ flex: 1 }}>
                                <Text style={{ fontSize: 12 }}>Width:</Text>
                                <InputNumber 
                                    size="small" 
                                    value={selectedElement.width} 
                                    onChange={(value) => updateProperty('width', value || 50)}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <Text style={{ fontSize: 12 }}>Height:</Text>
                                <InputNumber 
                                    size="small" 
                                    value={selectedElement.height} 
                                    onChange={(value) => updateProperty('height', value || 30)}
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </div>
                        <div>
                            <Text style={{ fontSize: 12 }}>Z-Index (Layer):</Text>
                            <InputNumber 
                                size="small" 
                                value={selectedElement.zIndex || 1} 
                                onChange={(value) => updateProperty('zIndex', value || 1)}
                                style={{ width: '100%' }}
                            />
                        </div>
                    </Space>
                </Card>

                {/* Content */}
                {(selectedElement.type === 'text' || selectedElement.type === 'button') && (
                    <Card size="small" title="Content">
                        <Space direction="vertical" style={{ width: '100%' }} size="small">
                            <div>
                                <Text style={{ fontSize: 12 }}>Text:</Text>
                                <Input 
                                    size="small" 
                                    value={selectedElement.content || ''} 
                                    onChange={(e) => updateProperty('content', e.target.value)}
                                    placeholder="Enter text..."
                                />
                            </div>
                            {selectedElement.type === 'button' && (
                                <div>
                                    <Text style={{ fontSize: 12 }}>Link URL:</Text>
                                    <Input 
                                        size="small" 
                                        value={selectedElement.href || ''} 
                                        onChange={(e) => updateProperty('href', e.target.value)}
                                        placeholder="https://..."
                                    />
                                </div>
                            )}
                        </Space>
                    </Card>
                )}

                {/* Image Properties */}
                {selectedElement.type === 'image' && (
                    <Card size="small" title="Image">
                        <Space direction="vertical" style={{ width: '100%' }} size="small">
                            <div>
                                <Text style={{ fontSize: 12 }}>Image URL:</Text>
                                <Input 
                                    size="small" 
                                    value={selectedElement.src || ''} 
                                    onChange={(e) => {
                                        const url = e.target.value;
                                        // Validate URL format for email compatibility
                                        if (url && !url.startsWith('http')) {
                                            message.warning('Image URL must start with http:// or https://');
                                        }
                                        if (url && url.startsWith('data:')) {
                                            message.error('Base64 images are not supported in emails. Please use a hosted image URL.');
                                            return;
                                        }
                                        updateProperty('src', url);
                                    }}
                                    placeholder="https://example.com/image.jpg"
                                />
                                <Text style={{ fontSize: 10, color: '#ff4d4f', display: 'block', marginTop: 4 }}>
                                    IMPORTANT: Use hosted image URLs only (https://...). Base64 images will not display in emails.
                                </Text>
                                <Text style={{ fontSize: 10, color: '#666', display: 'block', marginTop: 2 }}>
                                    💡 Upload images to your server or use image hosting services like Imgur, Cloudinary, etc.
                                </Text>
                            </div>
                            <div>
                                <Text style={{ fontSize: 12 }}>Alt Text:</Text>
                                <Input 
                                    size="small" 
                                    value={selectedElement.alt || ''} 
                                    onChange={(e) => updateProperty('alt', e.target.value)}
                                    placeholder="Image description for accessibility"
                                />
                            </div>
                            <div>
                                <Text style={{ fontSize: 12 }}>Object Fit:</Text>
                                <Select 
                                    size="small" 
                                    value={selectedElement.objectFit || 'cover'} 
                                    onChange={(value) => updateProperty('objectFit', value)}
                                    style={{ width: '100%' }}
                                    options={[
                                        { value: 'cover', label: 'Cover (crop to fit)' },
                                        { value: 'contain', label: 'Contain (fit inside)' },
                                        { value: 'fill', label: 'Fill (stretch)' },
                                        { value: 'none', label: 'Original size' }
                                    ]}
                                />
                            </div>
                            {/* Image preview */}
                            {selectedElement.src && (
                                <div>
                                    <Text style={{ fontSize: 12 }}>Preview:</Text>
                                    <div style={{ 
                                        border: '1px solid #d9d9d9', 
                                        borderRadius: 4, 
                                        padding: 8, 
                                        textAlign: 'center',
                                        background: '#fafafa'
                                    }}>
                                        <img 
                                            src={selectedElement.src} 
                                            alt={selectedElement.alt || 'Preview'} 
                                            style={{ 
                                                maxWidth: '100%', 
                                                maxHeight: 100, 
                                                objectFit: 'contain',
                                                borderRadius: 4
                                            }}
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'block';
                                            }}
                                            onLoad={(e) => {
                                                e.target.style.display = 'block';
                                                e.target.nextSibling.style.display = 'none';
                                            }}
                                        />
                                        <div style={{ 
                                            display: 'none', 
                                            color: '#ff4d4f', 
                                            fontSize: 11, 
                                            padding: 20 
                                        }}>
                                            Image failed to load. Check URL.
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Space>
                    </Card>
                )}

                {/* Typography */}
                {(selectedElement.type === 'text' || selectedElement.type === 'button') && (
                    <Card size="small" title="Typography">
                        <Space direction="vertical" style={{ width: '100%' }} size="small">
                            <div>
                                <Text style={{ fontSize: 12 }}>Font Size:</Text>
                                <InputNumber 
                                    size="small" 
                                    value={selectedElement.fontSize || 16} 
                                    onChange={(value) => updateProperty('fontSize', value || 16)}
                                    style={{ width: '100%' }}
                                    min={8}
                                    max={72}
                                />
                            </div>
                            <div>
                                <Text style={{ fontSize: 12 }}>Font Family:</Text>
                                <Select 
                                    size="small" 
                                    value={selectedElement.fontFamily || 'Arial, sans-serif'} 
                                    onChange={(value) => updateProperty('fontFamily', value)}
                                    style={{ width: '100%' }}
                                    options={[
                                        { value: 'Arial, sans-serif', label: 'Arial' },
                                        { value: 'Georgia, serif', label: 'Georgia' },
                                        { value: 'Times New Roman, serif', label: 'Times New Roman' },
                                        { value: 'Helvetica, sans-serif', label: 'Helvetica' },
                                        { value: 'Courier New, monospace', label: 'Courier New' }
                                    ]}
                                />
                            </div>
                            <div>
                                <Text style={{ fontSize: 12 }}>Text Color:</Text>
                                <ColorPicker 
                                    value={selectedElement.color || '#000'} 
                                    onChange={(color) => updateProperty('color', color.toHexString())}
                                    size="small"
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                                <Button 
                                    size="small" 
                                    type={selectedElement.fontWeight === 'bold' ? 'primary' : 'default'}
                                    icon={<BoldOutlined />}
                                    onClick={() => updateProperty('fontWeight', selectedElement.fontWeight === 'bold' ? 'normal' : 'bold')}
                                />
                                <Button 
                                    size="small" 
                                    type={selectedElement.fontStyle === 'italic' ? 'primary' : 'default'}
                                    icon={<ItalicOutlined />}
                                    onClick={() => updateProperty('fontStyle', selectedElement.fontStyle === 'italic' ? 'normal' : 'italic')}
                                />
                                <Button 
                                    size="small" 
                                    type={selectedElement.textDecoration === 'underline' ? 'primary' : 'default'}
                                    icon={<UnderlineOutlined />}
                                    onClick={() => updateProperty('textDecoration', selectedElement.textDecoration === 'underline' ? 'none' : 'underline')}
                                />
                            </div>
                            {selectedElement.type === 'text' && (
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <Button 
                                        size="small" 
                                        type={selectedElement.textAlign === 'left' ? 'primary' : 'default'}
                                        icon={<AlignLeftOutlined />}
                                        onClick={() => updateProperty('textAlign', 'left')}
                                    />
                                    <Button 
                                        size="small" 
                                        type={selectedElement.textAlign === 'center' ? 'primary' : 'default'}
                                        icon={<AlignCenterOutlined />}
                                        onClick={() => updateProperty('textAlign', 'center')}
                                    />
                                    <Button 
                                        size="small" 
                                        type={selectedElement.textAlign === 'right' ? 'primary' : 'default'}
                                        icon={<AlignRightOutlined />}
                                        onClick={() => updateProperty('textAlign', 'right')}
                                    />
                                </div>
                            )}
                        </Space>
                    </Card>
                )}

                {/* Appearance */}
                <Card size="small" title="Appearance">
                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                        <div>
                            <Text style={{ fontSize: 12 }}>Background Color:</Text>
                            <ColorPicker 
                                value={selectedElement.backgroundColor || 'transparent'} 
                                onChange={(color) => updateProperty('backgroundColor', color.toHexString())}
                                size="small"
                                style={{ width: '100%' }}
                                allowClear
                            />
                        </div>
                        {selectedElement.type === 'button' && (
                            <div>
                                <Text style={{ fontSize: 12 }}>Text Color:</Text>
                                <ColorPicker 
                                    value={selectedElement.textColor || '#fff'} 
                                    onChange={(color) => updateProperty('textColor', color.toHexString())}
                                    size="small"
                                    style={{ width: '100%' }}
                                />
                            </div>
                        )}
                        <div>
                            <Text style={{ fontSize: 12 }}>Border Radius:</Text>
                            <Slider 
                                value={selectedElement.borderRadius || 0} 
                                onChange={(value) => updateProperty('borderRadius', value)}
                                min={0}
                                max={50}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div>
                            <Text style={{ fontSize: 12 }}>Opacity:</Text>
                            <Slider 
                                value={(selectedElement.opacity !== undefined ? selectedElement.opacity : 1) * 100} 
                                onChange={(value) => updateProperty('opacity', value / 100)}
                                min={0}
                                max={100}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div>
                            <Text style={{ fontSize: 12 }}>Rotation:</Text>
                            <Slider 
                                value={selectedElement.rotation || 0} 
                                onChange={(value) => updateProperty('rotation', value)}
                                min={-180}
                                max={180}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Text style={{ fontSize: 12 }}>Drop Shadow:</Text>
                            <Switch 
                                checked={selectedElement.shadow || false} 
                                onChange={(checked) => updateProperty('shadow', checked)}
                                size="small"
                            />
                        </div>
                    </Space>
                </Card>

                {/* Actions */}
                <Card size="small" title="Actions">
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Button 
                            block 
                            icon={<CopyOutlined />}
                            onClick={() => {
                                const newElement = { 
                                    ...selectedElement, 
                                    id: Date.now(), 
                                    x: selectedElement.x + 20, 
                                    y: selectedElement.y + 20,
                                    zIndex: (selectedElement.zIndex || 1) + 1
                                };
                                onUpdate(newElement.id, newElement, true);
                            }}
                        >
                            Duplicate
                        </Button>
                        <Button 
                            block 
                            danger 
                            icon={<DeleteOutlined />}
                            onClick={() => onDelete(selectedElement.id)}
                        >
                            Delete
                        </Button>
                    </Space>
                </Card>
            </Space>
        </div>
    );
};

// Enhanced Canvas with better drop zone and grid
const AdvancedCanvas = ({ elements, onElementUpdate, onElementDelete, selectedElement, onElementSelect, onAddElement }) => {
    const canvasRef = useRef(null);
    const [showGrid, setShowGrid] = useState(true);
    const [canvasSize, setCanvasSize] = useState({ width: 600, height: 600 });

    // Handle canvas click (deselect elements)
    const handleCanvasClick = (e) => {
        if (e.target === canvasRef.current) {
            onElementSelect(null);
        }
    };

    // Handle element updates
    const handleElementUpdate = (id, updates, isNew = false) => {
        if (isNew) {
            onAddElement({ ...updates, id });
        } else {
            onElementUpdate(id, updates);
        }
    };

    const gridStyle = showGrid ? {
        backgroundImage: `
            linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
        `,
        backgroundSize: '20px 20px'
    } : {};

    return (
        <div style={{ position: 'relative' }}>
            {/* Canvas Controls */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: 12,
                padding: '8px 12px',
                background: '#f5f5f5',
                borderRadius: 6
            }}>
                <Space>
                    <Text style={{ fontSize: 12 }}>Canvas Size:</Text>
                    <InputNumber 
                        size="small" 
                        value={canvasSize.width} 
                        onChange={(value) => setCanvasSize(prev => ({ ...prev, width: value || 600 }))}
                        style={{ width: 80 }}
                        min={300}
                        max={1200}
                    />
                    <Text style={{ fontSize: 12 }}>×</Text>
                    <InputNumber 
                        size="small" 
                        value={canvasSize.height} 
                        onChange={(value) => setCanvasSize(prev => ({ ...prev, height: value || 600 }))}
                        style={{ width: 80 }}
                        min={400}
                        max={1600}
                    />
                </Space>
                <Space>
                    <Text style={{ fontSize: 12 }}>Grid:</Text>
                    <Switch 
                        checked={showGrid} 
                        onChange={setShowGrid} 
                        size="small"
                    />
                </Space>
            </div>

            {/* Canvas */}
            <div
                ref={canvasRef}
                style={{
                    position: 'relative',
                    width: canvasSize.width,
                    height: canvasSize.height,
                    background: '#fff',
                    border: '2px solid #d9d9d9',
                    borderRadius: 8,
                    overflow: 'hidden',
                    margin: '0 auto',
                    ...gridStyle
                }}
                onClick={handleCanvasClick}
            >
                {/* Canvas Info */}
                <div style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    fontSize: 11,
                    color: '#999',
                    zIndex: 0,
                    pointerEvents: 'none'
                }}>
                    {canvasSize.width} × {canvasSize.height}px
                </div>

                {/* Elements */}
                {elements.map(element => (
                    <AdvancedDraggableElement
                        key={element.id}
                        element={element}
                        onUpdate={handleElementUpdate}
                        onDelete={onElementDelete}
                        onSelect={onElementSelect}
                        isSelected={selectedElement?.id === element.id}
                        canvasRef={canvasRef}
                    />
                ))}

                {/* Drop zone overlay when empty */}
                {elements.length === 0 && (
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center',
                        color: '#999',
                        pointerEvents: 'none'
                    }}>
                        <PlusOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                        <div>Click "Add Element" to start designing</div>
                        <div style={{ fontSize: 12, marginTop: 8 }}>
                            Elements can be freely positioned and overlapped
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const TemplateEditorPage = () => {
    const emailEditorRef = useRef(null);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editId = searchParams.get('id');

    const [form] = Form.useForm();
    const [saving, setSaving] = useState(false);
    const [editorReady, setEditorReady] = useState(false);
    const [loadingTemplate, setLoadingTemplate] = useState(false);
    const [mode, setMode] = useState('advanced'); // 'advanced' | 'html'
    const [htmlBody, setHtmlBody] = useState('');
    
    // Advanced canvas state
    const [canvasElements, setCanvasElements] = useState([]);
    const [selectedElement, setSelectedElement] = useState(null);

    // Load existing template if editing
    useEffect(() => {
        if (editId) {
            setLoadingTemplate(true);
            getTemplates().then(res => {
                const tpl = (res.data.data || []).find(t => String(t.id) === String(editId));
                if (tpl) {
                    // Set form values
                    form.setFieldsValue({ 
                        name: tpl.name, 
                        subject: tpl.subject, 
                        category: tpl.category 
                    });
                    
                    // Set HTML body for HTML mode
                    setHtmlBody(tpl.html_body || '');
                    
                    // Try to parse design_json for advanced mode
                    if (tpl.design_json) {
                        try {
                            const designData = JSON.parse(tpl.design_json);
                            if (designData.canvasElements && Array.isArray(designData.canvasElements)) {
                                setCanvasElements(designData.canvasElements);
                                setMode('advanced'); // Switch to advanced mode if canvas elements exist
                            }
                        } catch (error) {
                               setMode('html');
                        }
                    } else {
                        // No design_json, use HTML mode
                        setMode('html');
                    }
                }
            }).catch((error) => {
                console.error('Error loading template:', error);
                message.error('Failed to load template');
            }).finally(() => {
                setLoadingTemplate(false);
            });
        }
    }, [editId, form]);

    const handleSave = (values) => {
        if (mode === 'advanced') {
            // Generate HTML from advanced canvas
            const html = generateAdvancedHTML();
            if (!html.trim()) { 
                message.error('Canvas cannot be empty'); 
                return; 
            }
            setSaving(true);
            saveTemplate(values, html, JSON.stringify({ canvasElements }))
                .finally(() => setSaving(false));
        } else {
            // HTML mode - use textarea content
            if (!htmlBody.trim()) { 
                message.error('HTML body cannot be empty'); 
                return; 
            }
            setSaving(true);
            saveTemplate(values, htmlBody, null)
                .finally(() => setSaving(false));
        }
    };

    // Generate HTML from advanced canvas elements
    const generateAdvancedHTML = () => {
        if (canvasElements.length === 0) return '';
        
        // Validate images before generating HTML
        const invalidImages = canvasElements
            .filter(el => el.type === 'image')
            .filter(el => !el.src || !el.src.startsWith('http'));
            
        if (invalidImages.length > 0) {
            message.warning(`${invalidImages.length} image(s) have invalid URLs and will be skipped in email output. Use hosted URLs (https://...)`);
        }
        
        // Sort elements by Y position for email-friendly layout
        const sortedElements = canvasElements
            .sort((a, b) => a.y - b.y); // Sort by Y position (top to bottom)
        
        const canvasHTML = sortedElements
            .map(element => {
                // Email-friendly inline styles (no position absolute)
                const baseStyle = `
                    width: ${element.width}px;
                    height: ${element.height}px;
                    margin: ${element.y}px 0 0 ${element.x}px;
                    border-radius: ${element.borderRadius || 0}px;
                    ${element.shadow ? 'box-shadow: 0 2px 8px rgba(0,0,0,0.15);' : ''}
                    ${element.backgroundColor ? `background-color: ${element.backgroundColor};` : ''}
                    display: block;
                `;
                
                switch (element.type) {
                    case 'text':
                        return `<div style="${baseStyle} 
                            font-size: ${element.fontSize || 16}px; 
                            color: ${element.color || '#000'}; 
                            font-family: ${element.fontFamily || 'Arial, sans-serif'};
                            font-weight: ${element.fontWeight || 'normal'};
                            font-style: ${element.fontStyle || 'normal'};
                            text-decoration: ${element.textDecoration || 'none'};
                            text-align: ${element.textAlign || 'left'};
                            line-height: ${element.lineHeight || 1.4};
                            padding: ${element.padding || 8}px;
                            word-wrap: break-word;
                            overflow: hidden;
                        ">${element.content || 'Text'}</div>`;
                        
                    case 'image':
                        // For email compatibility, ensure proper image URLs (no base64)
                        const imageSrc = element.src;
                        if (!imageSrc || !imageSrc.startsWith('http')) {
                            // Skip invalid images in email output
                            return `<!-- Image skipped: Invalid URL "${imageSrc || 'empty'}" - Use hosted URLs only -->`;
                        }
                        return `<img src="${imageSrc}" 
                            alt="${element.alt || ''}" 
                            style="${baseStyle} 
                                max-width: 100%;
                                height: auto;
                                border: 0;
                                outline: none;
                                text-decoration: none;
                            " />`;
                            
                    case 'button':
                        return `<table cellpadding="0" cellspacing="0" border="0" style="margin: ${element.y}px 0 0 ${element.x}px;">
                            <tr>
                                <td style="
                                    background-color: ${element.backgroundColor || '#007bff'}; 
                                    border-radius: ${element.borderRadius || 4}px;
                                    ${element.borderWidth ? `border: ${element.borderWidth}px solid ${element.borderColor || '#ccc'};` : 'border: none;'}
                                ">
                                    <a href="${element.href || '#'}" 
                                        style="
                                            color: ${element.textColor || '#fff'}; 
                                            text-decoration: none; 
                                            display: inline-block;
                                            padding: 12px 24px;
                                            font-size: ${element.fontSize || 14}px;
                                            font-weight: ${element.fontWeight || 'bold'};
                                            font-family: ${element.fontFamily || 'Arial, sans-serif'};
                                            width: ${element.width - 48}px;
                                            text-align: center;
                                        ">${element.content || 'Button'}</a>
                                </td>
                            </tr>
                        </table>`;
                            
                    case 'shape':
                        return `<div style="${baseStyle}
                            background-color: ${element.backgroundColor || '#f0f0f0'};
                            ${element.shapeType === 'circle' ? 'border-radius: 50%;' : ''}
                            ${element.borderWidth ? `border: ${element.borderWidth}px solid ${element.borderColor || '#ccc'};` : ''}
                        "></div>`;
                        
                    default:
                        return '';
                }
            }).join('');

        // Email-compatible HTML structure using tables
        return `
            <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
            <html xmlns="http://www.w3.org/1999/xhtml">
            <head>
                <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Email Template</title>
                <style type="text/css">
                    /* Email client reset */
                    body, table, td, p, a, li, blockquote { 
                        -webkit-text-size-adjust: 100%; 
                        -ms-text-size-adjust: 100%; 
                    }
                    table, td { 
                        mso-table-lspace: 0pt; 
                        mso-table-rspace: 0pt; 
                    }
                    img { 
                        -ms-interpolation-mode: bicubic; 
                        border: 0; 
                        outline: none; 
                        text-decoration: none; 
                        display: block; 
                    }
                    
                    /* Outlook specific */
                    .ReadMsgBody { width: 100%; }
                    .ExternalClass { width: 100%; }
                    .ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div {
                        line-height: 100%;
                    }
                    
                    /* Mobile responsive */
                    @media only screen and (max-width: 600px) {
                        .email-container { 
                            width: 100% !important; 
                            max-width: 100% !important; 
                        }
                    }
                </style>
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5;">
                    <tr>
                        <td align="center" style="padding: 20px;">
                            <table class="email-container" cellpadding="0" cellspacing="0" border="0" 
                                   style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                                <tr>
                                    <td style="padding: 20px;">
                                        ${canvasHTML}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `;
    };

    // Add element to advanced canvas
    const addCanvasElement = (type) => {
        const elementDefaults = {
            text: { width: 200, height: 40, content: 'Hello {{name}}', fontSize: 16, color: '#000' },
            image: { width: 150, height: 100, src: '' }, // Start with empty URL to force user input
            button: { width: 120, height: 40, content: 'Click Here', backgroundColor: '#007bff', textColor: '#fff' },
            shape: { width: 100, height: 100, backgroundColor: '#f0f0f0' }
        };

        const newElement = {
            id: Date.now(),
            type,
            x: 50 + (canvasElements.length * 20), // Offset new elements
            y: 50 + (canvasElements.length * 20),
            zIndex: canvasElements.length + 1,
            ...elementDefaults[type]
        };
        
        setCanvasElements([...canvasElements, newElement]);
        setSelectedElement(newElement);
        
        // Show helpful message for images
        if (type === 'image') {
            message.info('Add a hosted image URL in the properties panel (https://...)');
        }
    };

    // Update canvas element
    const updateCanvasElement = (id, updates) => {
        setCanvasElements(canvasElements.map(el => 
            el.id === id ? { ...el, ...updates } : el
        ));
        
        // Update selected element if it's the one being updated
        if (selectedElement?.id === id) {
            setSelectedElement({ ...selectedElement, ...updates });
        }
    };

    // Delete canvas element
    const deleteCanvasElement = (id) => {
        setCanvasElements(canvasElements.filter(el => el.id !== id));
        if (selectedElement?.id === id) {
            setSelectedElement(null);
        }
    };

    const saveTemplate = async (values, html, designJson) => {
        try {
            const payload = {
                name: values.name,
                subject: values.subject,
                category: values.category,
                html_body: html,
                ...(designJson ? { design_json: designJson } : {}),
            };
            if (editId) {
                await updateTemplate(editId, payload);
                message.success('Template updated');
            } else {
                await createTemplate(payload);
                message.success('Template created');
            }
            navigate('/marketing');
        } catch (err) {
            message.error(err.response?.data?.message || 'Save failed');
        }
    };

    return (
        <div className="fade-in">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/marketing')}>Back</Button>
                    <div>
                        <Title level={4} style={{ margin: 0 }}>{editId ? 'Edit Template' : 'New Template'}</Title>
                        <Text type="secondary">Design your email template</Text>
                    </div>
                </div>
                <Space>
                    <Segmented
                        value={mode}
                        onChange={setMode}
                        options={[
                            { value: 'advanced', label: <Space><EditOutlined /> Advanced Designer</Space> },
                            { value: 'html', label: <Space><CodeOutlined /> HTML Code</Space> },
                        ]}
                    />
                    <Button type="primary" icon={<SaveOutlined />} loading={saving}
                        onClick={() => form.submit()} size="large">
                        Save Template
                    </Button>
                </Space>
            </div>

            {/* Meta fields */}
            <Card className="glass-card" style={{ border: 'none', marginBottom: 16 }}>
                <Form form={form} layout="inline" onFinish={handleSave}>
                    <Form.Item name="name" label="Name" rules={[{ required: true }]} style={{ minWidth: 220 }}>
                        <Input placeholder="e.g. Graduation Cap Promo" />
                    </Form.Item>
                    <Form.Item name="subject" label="Subject" rules={[{ required: true }]} style={{ minWidth: 300 }}>
                        <Input placeholder="e.g. 🎓 Your graduation cap awaits!" />
                    </Form.Item>
                    <Form.Item name="category" label="Category" initialValue="marketing" rules={[{ required: true }]}>
                        <Select options={CATEGORIES} style={{ width: 180 }} />
                    </Form.Item>
                </Form>
            </Card>

            {/* Editor */}
            {mode === 'advanced' ? (
                <DndProvider backend={HTML5Backend}>
                    <div style={{ display: 'flex', gap: 16 }}>
                        {/* Toolbar */}
                        <Card className="glass-card" style={{ border: 'none', width: 250, height: 'fit-content' }}>
                            <Typography.Title level={5} style={{ margin: '0 0 16px 0' }}>Add Elements</Typography.Title>
                            <Space direction="vertical" style={{ width: '100%' }}>
                                <Button block onClick={() => addCanvasElement('text')} icon={<EditOutlined />}>
                                    Add Text
                                </Button>
                                <Button block onClick={() => addCanvasElement('image')} icon={<BgColorsOutlined />}>
                                    Add Image
                                </Button>
                                <Button block onClick={() => addCanvasElement('button')} icon={<PlusOutlined />}>
                                    Add Button
                                </Button>
                                <Button block onClick={() => addCanvasElement('shape')} icon={<BgColorsOutlined />}>
                                    Add Shape
                                </Button>
                            </Space>
                        </Card>

                        {/* Canvas */}
                        <Card className="glass-card" style={{ border: 'none', flex: 1 }}>
                            {/* Email Compatibility Warning */}
                            <div style={{ 
                                background: '#fff7e6', 
                                border: '1px solid #ffd591', 
                                borderRadius: 6, 
                                padding: 12, 
                                marginBottom: 16,
                                fontSize: 12
                            }}>
                                <Text style={{ color: '#d46b08', fontWeight: 'bold' }}>📧 Email Compatibility Note:</Text>
                                <div style={{ color: '#ad6800', marginTop: 4 }}>
                                    • Elements are converted to email-friendly HTML (no absolute positioning)
                                    <br />• Use hosted image URLs only (https://...) - no base64 images
                                    <br />• Complex layouts may appear differently in email clients
                                </div>
                            </div>
                            
                            <AdvancedCanvas
                                elements={canvasElements}
                                onElementUpdate={updateCanvasElement}
                                onElementDelete={deleteCanvasElement}
                                selectedElement={selectedElement}
                                onElementSelect={setSelectedElement}
                                onAddElement={(element) => setCanvasElements([...canvasElements, element])}
                            />
                            
                            {/* Live Preview */}
                            <div style={{ marginTop: 16 }}>
                                <Text strong style={{ display: 'block', marginBottom: 8 }}>Email Preview:</Text>
                                <Text style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 8 }}>
                                    This shows how your template will appear in email clients (simplified layout)
                                </Text>
                                <div style={{ 
                                    border: '1px solid #f0f0f0', 
                                    borderRadius: 8, 
                                    padding: 16, 
                                    background: '#fff', 
                                    minHeight: 100,
                                    maxHeight: 300,
                                    overflow: 'auto'
                                }}
                                    dangerouslySetInnerHTML={{ __html: generateAdvancedHTML() }} 
                                />
                            </div>
                        </Card>

                        {/* Properties Panel */}
                        <Card className="glass-card" style={{ border: 'none', width: 280, maxHeight: '80vh', overflow: 'auto' }}>
                            <PropertiesPanel
                                selectedElement={selectedElement}
                                onUpdate={updateCanvasElement}
                                onDelete={deleteCanvasElement}
                            />
                        </Card>
                    </div>
                </DndProvider>
            ) : (
                <Card className="glass-card" style={{ border: 'none' }}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
                        Write HTML directly. Use <code>{'{{name}}'}</code>, <code>{'{{email}}'}</code>, <code>{'{{class}}'}</code> as placeholders.
                    </Text>
                    <TextArea
                        value={htmlBody}
                        onChange={e => setHtmlBody(e.target.value)}
                        rows={25}
                        style={{ fontFamily: 'monospace', fontSize: 13 }}
                        placeholder={`<html>\n<body>\n  <h1>Hello {{name}},</h1>\n  <p>Your graduation cap is ready!</p>\n</body>\n</html>`}
                    />
                    {/* Live Preview */}
                    {htmlBody && (
                        <div style={{ marginTop: 16 }}>
                            <Text strong style={{ display: 'block', marginBottom: 8 }}>Live Preview:</Text>
                            <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 16, background: '#fff', minHeight: 100 }}
                                dangerouslySetInnerHTML={{ __html: htmlBody }} />
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
};

export default TemplateEditorPage;
