import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Transformer, Rect, Text } from 'react-konva';
import { Button, Space, Typography, Upload, Slider, Card, Alert } from 'antd';
import { InboxOutlined, ZoomInOutlined, ZoomOutOutlined, ReloadOutlined } from '@ant-design/icons';
import useImage from 'use-image';

const { Text: AntText } = Typography;

// Back area dimensions (A3 proportions)
const CANVAS_W = 560;
const CANVAS_H = 650;

// Draggable resizable logo
const LogoImage = ({ src, isSelected, onSelect, onChange, x, y, width, height }) => {
    const [image] = useImage(src, 'anonymous');
    const imgRef = useRef();
    const trRef = useRef();

    useEffect(() => {
        if (isSelected && trRef.current && imgRef.current) {
            trRef.current.nodes([imgRef.current]);
            trRef.current.getLayer().batchDraw();
        }
    }, [isSelected]);

    return (
        <>
            <KonvaImage
                ref={imgRef}
                image={image}
                x={x} y={y}
                width={width} height={height}
                draggable
                onClick={onSelect}
                onTap={onSelect}
                onDragEnd={e => onChange({ x: e.target.x(), y: e.target.y() })}
                onTransformEnd={() => {
                    const node = imgRef.current;
                    onChange({
                        x: node.x(), y: node.y(),
                        width: Math.max(20, node.width() * node.scaleX()),
                        height: Math.max(20, node.height() * node.scaleY()),
                    });
                    node.scaleX(1);
                    node.scaleY(1);
                }}
            />
            {isSelected && (
                <Transformer
                    ref={trRef}
                    boundBoxFunc={(oldBox, newBox) =>
                        newBox.width < 20 || newBox.height < 20 ? oldBox : newBox
                    }
                    keepRatio={true}
                />
            )}
        </>
    );
};

const AdminDesignEditor = ({ onExport }) => {
    const [logoSrc, setLogoSrc] = useState(null);
    const [logoProps, setLogoProps] = useState({ x: 60, y: 60, width: 300, height: 300 });
    const [naturalSize, setNaturalSize] = useState({ w: 300, h: 300 });
    const [selected, setSelected] = useState(false);
    const stageRef = useRef();

    const handleFileSelect = (file) => {
        const url = URL.createObjectURL(file);
        // Load image to get natural dimensions, then fit to canvas at 100%
        const img = new window.Image();
        img.onload = () => {
            const scale = Math.min(CANVAS_W / img.width, CANVAS_H / img.height);
            const w = Math.round(img.width * scale);
            const h = Math.round(img.height * scale);
            setNaturalSize({ w, h });
            setLogoProps({
                x: Math.round((CANVAS_W - w) / 2),
                y: Math.round((CANVAS_H - h) / 2),
                width: w,
                height: h,
            });
        };
        img.src = url;
        setLogoSrc(url);
        setSelected(true);
        return false;
    };

    const handleSizeSlider = (pct) => {
        const w = Math.round(naturalSize.w * pct / 100);
        const h = Math.round(naturalSize.h * pct / 100);
        setLogoProps(prev => ({
            ...prev,
            width: w, height: h,
            x: Math.round((CANVAS_W - w) / 2),
            y: Math.round((CANVAS_H - h) / 2),
        }));
    };

    const currentPct = naturalSize.w > 0
        ? Math.round((logoProps.width / naturalSize.w) * 100)
        : 100;

    const handleExport = () => {
        if (!stageRef.current) return;
        setSelected(false);
        setTimeout(() => {
            // Export only the image area, hide guide rects temporarily
            const stage = stageRef.current;
            // Get all rects and hide them
            const layer = stage.getLayers()[0];
            const rects = layer.find('Rect');
            const texts = layer.find('Text');
            rects.forEach(r => r.hide());
            texts.forEach(t => t.hide());
            layer.batchDraw();

            const dataUrl = stage.toDataURL({ pixelRatio: 2 });

            // Restore
            rects.forEach(r => r.show());
            texts.forEach(t => t.show());
            layer.batchDraw();

            if (onExport) onExport(dataUrl, logoProps);
        }, 50);
    };

    return (
        <div>
            <Alert
                message="Drag to reposition · Use handles to resize · Slider for quick size adjustment"
                type="info" showIcon banner style={{ marginBottom: 12, fontSize: 12 }}
            />

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {/* Canvas */}
                <div>
                    <div style={{ border: '2px dashed #d9d9d9', borderRadius: 8, overflow: 'hidden', display: 'inline-block' }}>
                        <Stage
                            ref={stageRef}
                            width={CANVAS_W}
                            height={CANVAS_H}
                            style={{ background: '#f5f5f5' }}
                            onMouseDown={e => { if (e.target === e.target.getStage()) setSelected(false); }}
                        >
                            <Layer>
                                {/* Back area guide */}
                                <Rect
                                    x={0} y={0}
                                    width={CANVAS_W} height={CANVAS_H}
                                    fill="white"
                                />
                                {/* Safe zone border */}
                                <Rect
                                    x={10} y={10}
                                    width={CANVAS_W - 20} height={CANVAS_H - 20}
                                    stroke="#e0e0e0" strokeWidth={1} dash={[6, 4]}
                                    fill="transparent"
                                />
                                <Text
                                    x={0} y={CANVAS_H / 2 - 10}
                                    width={CANVAS_W}
                                    text={logoSrc ? '' : 'Upload a design to preview'}
                                    align="center"
                                    fill="#bbb" fontSize={14}
                                />
                                {logoSrc && (
                                    <LogoImage
                                        src={logoSrc}
                                        isSelected={selected}
                                        onSelect={() => setSelected(true)}
                                        onChange={newProps => setLogoProps(prev => ({ ...prev, ...newProps }))}
                                        x={logoProps.x}
                                        y={logoProps.y}
                                        width={logoProps.width}
                                        height={logoProps.height}
                                    />
                                )}
                            </Layer>
                        </Stage>
                    </div>
                    <AntText type="secondary" style={{ fontSize: 11, display: 'block', textAlign: 'center', marginTop: 4 }}>
                        Back print area preview
                    </AntText>
                </div>

                {/* Controls */}
                <div style={{ flex: 1, minWidth: 200 }}>
                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                        <div>
                            <AntText strong style={{ display: 'block', marginBottom: 8 }}>Upload Design</AntText>
                            <Upload beforeUpload={handleFileSelect} showUploadList={false} accept="image/*">
                                <Button icon={<InboxOutlined />} block type="dashed">
                                    {logoSrc ? 'Change Design' : 'Click to Upload'}
                                </Button>
                            </Upload>
                        </div>

                        {logoSrc && (
                            <>
                                <div>
                                    <AntText strong style={{ display: 'block', marginBottom: 8 }}>
                                        Size: {currentPct}% of back area
                                    </AntText>
                                    <Slider
                                        min={10} max={100} value={currentPct}
                                        onChange={handleSizeSlider}
                                        marks={{ 25: '25%', 50: '50%', 75: '75%', 100: '100%' }}
                                    />
                                </div>

                                <Space>
                                    <Button
                                        icon={<ZoomInOutlined />}
                                        onClick={() => handleSizeSlider(Math.min(100, currentPct + 10))}
                                    >Larger</Button>
                                    <Button
                                        icon={<ZoomOutOutlined />}
                                        onClick={() => handleSizeSlider(Math.max(10, currentPct - 10))}
                                    >Smaller</Button>
                                    <Button
                                        icon={<ReloadOutlined />}
                                        onClick={() => handleSizeSlider(100)}
                                    >Reset</Button>
                                </Space>

                                <Button type="primary" block onClick={handleExport}>
                                    Use This Design
                                </Button>
                            </>
                        )}
                    </Space>
                </div>
            </div>
        </div>
    );
};

export default AdminDesignEditor;
