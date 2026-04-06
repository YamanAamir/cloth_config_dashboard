import React, { useEffect, useRef, useState } from 'react';
import { EyeOutlined, InboxOutlined, WarningOutlined } from '@ant-design/icons';
import { Button, Typography } from 'antd';

const getTextColor = (garmentColor) => (garmentColor === 'black' ? '#ffffff' : '#000000');
const HANDLE_SIZE = 12;

const DesignCanvas = ({
    setPreviewOpen, imagePreview, textElements, designColor,
    isDragging, setIsDragging,
    selectedTextId, setSelectedTextId,
    dragOffset, setDragOffset,
    setTextElements, canvasRef,
    onCanvasUpdate,
    imageLayout, setImageLayout
}) => {
    const [hasOutOfBounds, setHasOutOfBounds] = useState(false);
    const [imgDragging, setImgDragging] = useState(false);
    const [imgDragOffset, setImgDragOffset] = useState({ x: 0, y: 0 });
    const [resizing, setResizing] = useState(false);
    const [resizeStart, setResizeStart] = useState(null);
    const [imgSelected, setImgSelected] = useState(false);
    const imgRef = useRef(null);

    const layout = imageLayout || { x: 0, y: 0, w: 800, h: 800 };

    // Load image once
    useEffect(() => {
        if (!imagePreview) { imgRef.current = null; return; }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => { imgRef.current = img; redraw(); };
        img.src = imagePreview;
    }, [imagePreview]);

    const redraw = () => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = 800;
        canvas.height = 800;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 800, 800);

        if (imgRef.current) {
            ctx.drawImage(imgRef.current, layout.x, layout.y, layout.w, layout.h);
        }

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

        // Draw selection handles on image
        if (imgSelected && imgRef.current) {
            ctx.strokeStyle = '#00b96b';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 3]);
            ctx.strokeRect(layout.x, layout.y, layout.w, layout.h);
            ctx.setLineDash([]);
            // Corner handles
            const corners = getCorners(layout);
            corners.forEach(([cx, cy]) => {
                ctx.fillStyle = '#00b96b';
                ctx.fillRect(cx - HANDLE_SIZE / 2, cy - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
            });
        }

        if (onCanvasUpdate) setTimeout(() => onCanvasUpdate(canvas), 50);
        setHasOutOfBounds(checkBounds(textElements, canvas));
    };

    useEffect(() => { redraw(); }, [imagePreview, textElements, designColor, imageLayout, imgSelected]);

    const getCorners = (l) => [
        [l.x, l.y],                    // top-left
        [l.x + l.w, l.y],              // top-right
        [l.x, l.y + l.h],              // bottom-left
        [l.x + l.w, l.y + l.h],        // bottom-right
    ];

    const hitHandle = (mx, my, l) => {
        const corners = getCorners(l);
        for (let i = 0; i < corners.length; i++) {
            const [cx, cy] = corners[i];
            if (Math.abs(mx - cx) <= HANDLE_SIZE && Math.abs(my - cy) <= HANDLE_SIZE) return i;
        }
        return -1;
    };

    const hitImage = (mx, my, l) =>
        mx >= l.x && mx <= l.x + l.w && my >= l.y && my <= l.y + l.h;

    const checkBounds = (elements, canvas) => {
        if (!canvas) return false;
        const ctx = canvas.getContext('2d');
        return elements.some(el => {
            ctx.font = `${el.fontSize}px ${el.fontFamily}`;
            const tw = ctx.measureText(el.text).width / 2;
            const th = el.fontSize / 2;
            return el.x - tw < 0 || el.x + tw > canvas.width || el.y - th < 0 || el.y + th > canvas.height;
        });
    };

    useEffect(() => {
        if (!canvasRef.current || textElements.length === 0) { setHasOutOfBounds(false); return; }
        setHasOutOfBounds(checkBounds(textElements, canvasRef.current));
    }, [textElements]);

    const getCanvasPos = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        return {
            mx: (e.clientX - rect.left) * (canvas.width / rect.width),
            my: (e.clientY - rect.top) * (canvas.height / rect.height),
        };
    };

    const handleMouseDown = (e) => {
        if (!canvasRef.current) return;
        const { mx, my } = getCanvasPos(e);

        // Check resize handles first
        if (imgSelected && imgRef.current) {
            const handleIdx = hitHandle(mx, my, layout);
            if (handleIdx >= 0) {
                setResizing(true);
                setResizeStart({ mx, my, layout: { ...layout }, handleIdx });
                return;
            }
        }

        // Check image drag
        if (imgRef.current && hitImage(mx, my, layout)) {
            setImgSelected(true);
            setImgDragging(true);
            setImgDragOffset({ x: mx - layout.x, y: my - layout.y });
            setSelectedTextId(null);
            return;
        }

        // Check text elements
        const PADDING = 12;
        for (let i = textElements.length - 1; i >= 0; i--) {
            const el = textElements[i];
            if (el.locked) continue;
            const ctx = canvasRef.current.getContext('2d');
            ctx.font = `${el.fontSize}px ${el.fontFamily}`;
            const tw = ctx.measureText(el.text).width / 2 + PADDING;
            const th = el.fontSize / 2 + PADDING;
            if (mx >= el.x - tw && mx <= el.x + tw && my >= el.y - th && my <= el.y + th) {
                setSelectedTextId(el.id);
                setIsDragging(true);
                setDragOffset({ x: mx - el.x, y: my - el.y });
                setImgSelected(false);
                return;
            }
        }

        setSelectedTextId(null);
        setImgSelected(false);
    };

    const handleMouseMove = (e) => {
        if (!canvasRef.current) return;
        const { mx, my } = getCanvasPos(e);

        if (resizing && resizeStart) {
            const { layout: orig, handleIdx, mx: sx, my: sy } = resizeStart;
            const dx = mx - sx;
            const dy = my - sy;
            let newLayout = { ...orig };

            if (handleIdx === 0) { // top-left
                newLayout.x = orig.x + dx;
                newLayout.y = orig.y + dy;
                newLayout.w = orig.w - dx;
                newLayout.h = orig.h - dy;
            } else if (handleIdx === 1) { // top-right
                newLayout.y = orig.y + dy;
                newLayout.w = orig.w + dx;
                newLayout.h = orig.h - dy;
            } else if (handleIdx === 2) { // bottom-left
                newLayout.x = orig.x + dx;
                newLayout.w = orig.w - dx;
                newLayout.h = orig.h + dy;
            } else { // bottom-right
                newLayout.w = orig.w + dx;
                newLayout.h = orig.h + dy;
            }

            // Min size
            if (newLayout.w > 50 && newLayout.h > 50) {
                requestAnimationFrame(() => setImageLayout(newLayout));
            }
            return;
        }

        if (imgDragging) {
            requestAnimationFrame(() => setImageLayout(prev => ({
                ...prev,
                x: mx - imgDragOffset.x,
                y: my - imgDragOffset.y,
            })));
            return;
        }

        if (isDragging && selectedTextId) {
            requestAnimationFrame(() => {
                setTextElements(prev => prev.map(el =>
                    el.id === selectedTextId ? { ...el, x: mx - dragOffset.x, y: my - dragOffset.y } : el
                ));
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setImgDragging(false);
        setResizing(false);
        setResizeStart(null);
    };

    const getCursor = () => {
        if (resizing) return 'nwse-resize';
        if (imgDragging || isDragging) return 'grabbing';
        return 'default';
    };

    if (!imagePreview) return (
        <div style={{ textAlign: 'center', padding: 60, color: '#bbb' }}>
            <InboxOutlined style={{ fontSize: 48, marginBottom: 12 }} />
            <div>Select a design from the left to start</div>
        </div>
    );

    return (
        <div style={{ background: '#f5f5f5', borderRadius: 8, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingLeft: 10 }}>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                    Click design to select · Drag to move · Corner handles to resize · Drag names to reposition
                </Typography.Text>
                {hasOutOfBounds && (
                    <Typography.Text type="danger" style={{ fontSize: 11 }}>
                        <WarningOutlined /> Name outside print area
                    </Typography.Text>
                )}
                <Button
                    type="default"
                    icon={<EyeOutlined />}
                    disabled={!imagePreview}
                    onClick={() => setPreviewOpen(true)}
                >
                    Preview in 3D
                </Button>
            </div>
            <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{
                    maxWidth: '100%', borderRadius: 4,
                    border: hasOutOfBounds ? '2px solid #ff4d4f' : '1px solid #d9d9d9',
                    cursor: getCursor(),
                    display: 'block', margin: '0 auto',
                    transition: 'border-color 0.2s'
                }}
            />
        </div>
    );
};

export default DesignCanvas;
