import React, { useEffect, useRef, useState, useCallback } from 'react';
import { EyeOutlined, InboxOutlined, WarningOutlined } from '@ant-design/icons';
import { Button, Typography } from 'antd';

const getTextColor = (garmentColor) => (garmentColor === 'black' ? '#ffffff' : '#000000');
const HANDLE_SIZE = 14;
const CANVAS_SIZE = 800;
// Image loads at max this fraction of canvas so it fits nicely
const DEFAULT_IMG_MAX = 0.5; // 50% of 800 = 400px max

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

    // Use ref for imgSelected so redraw() always reads latest value without stale closure
    const imgSelectedRef = useRef(false);
    const [imgSelected, setImgSelected] = useState(false); // only for re-render trigger

    const imgRef = useRef(null);

    const setImgSelectedSafe = useCallback((val) => {
        imgSelectedRef.current = val;
        setImgSelected(val);
    }, []);

    const layout = imageLayout || { x: 200, y: 200, w: 400, h: 400 };

    // ─── Helpers ────────────────────────────────────────────────────────────────

    const getCorners = (l) => [
        [l.x,        l.y       ],   // 0: top-left
        [l.x + l.w,  l.y       ],   // 1: top-right
        [l.x,        l.y + l.h ],   // 2: bottom-left
        [l.x + l.w,  l.y + l.h],   // 3: bottom-right
    ];

    const hitHandle = (mx, my, l) => {
        const corners = getCorners(l);
        for (let i = 0; i < corners.length; i++) {
            const [cx, cy] = corners[i];
            if (Math.abs(mx - cx) <= HANDLE_SIZE + 4 && Math.abs(my - cy) <= HANDLE_SIZE + 4) return i;
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

    const getCanvasPos = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        return {
            mx: (e.clientX - rect.left) * (canvas.width / rect.width),
            my: (e.clientY - rect.top) * (canvas.height / rect.height),
        };
    };

    const isPointInRotatedText = (mx, my, el) => {
        const angle = -((el.rotation || 0) * Math.PI / 180);
        const dx = mx - el.x;
        const dy = my - el.y;
        const rx = dx * Math.cos(angle) - dy * Math.sin(angle);
        const ry = dx * Math.sin(angle) + dy * Math.cos(angle);
        const ctx = canvasRef.current.getContext('2d');
        ctx.font = `${el.fontSize}px ${el.fontFamily}`;
        const tw = ctx.measureText(el.text).width / 2;
        const th = el.fontSize / 2;
        return rx >= -tw && rx <= tw && ry >= -th && ry <= th;
    };

    // ─── Draw ────────────────────────────────────────────────────────────────────

    const drawSelectionOverlay = useCallback((ctx, l) => {
        ctx.strokeStyle = '#00b96b';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        ctx.strokeRect(l.x, l.y, l.w, l.h);
        ctx.setLineDash([]);
        getCorners(l).forEach(([cx, cy]) => {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx - HANDLE_SIZE / 2, cy - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
            ctx.strokeStyle = '#00b96b';
            ctx.lineWidth = 2;
            ctx.strokeRect(cx - HANDLE_SIZE / 2, cy - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
        });
    }, []);

    const redraw = useCallback((currentLayout) => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = CANVAS_SIZE;
        canvas.height = CANVAS_SIZE;

        ctx.fillStyle = designColor === 'black' ? '#e8e8e8' : '#ffffff';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        const l = currentLayout || layout;

        if (imgRef.current) {
            ctx.drawImage(imgRef.current, l.x, l.y, l.w, l.h);
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

        // Draw selection border using ref (always latest, no stale closure)
        if (imgSelectedRef.current && imgRef.current) {
            drawSelectionOverlay(ctx, l);
        }

        if (onCanvasUpdate) setTimeout(() => onCanvasUpdate(canvas), 50);
        setHasOutOfBounds(checkBounds(textElements, canvas));
    }, [textElements, designColor, imageLayout, onCanvasUpdate, drawSelectionOverlay]);

    // ─── Image load ──────────────────────────────────────────────────────────────

    useEffect(() => {
        if (!imagePreview) {
            imgRef.current = null;
            setImgSelectedSafe(false);
            redraw();
            return;
        }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            imgRef.current = img;

            // Always reset layout when a new image loads so it fits canvas properly
            const maxPx = CANVAS_SIZE * DEFAULT_IMG_MAX; // 400px
            let w = img.naturalWidth;
            let h = img.naturalHeight;
            const ratio = Math.min(maxPx / w, maxPx / h, 1);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
            const newLayout = {
                x: Math.round((CANVAS_SIZE - w) / 2),
                y: Math.round((CANVAS_SIZE - h) / 2),
                w,
                h,
            };
            setImageLayout(newLayout);
            // redraw will fire from imageLayout useEffect after setImageLayout
        };
        img.onerror = () => { imgRef.current = null; };
        img.src = imagePreview;
    }, [imagePreview]);

    // Main redraw trigger
    useEffect(() => {
        redraw();
    }, [imagePreview, textElements, designColor, imageLayout]);

    // ─── Export canvas (no selection border) ─────────────────────────────────────

    const getExportCanvas = useCallback(() => {
        if (!canvasRef.current) return null;
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = CANVAS_SIZE;
        exportCanvas.height = CANVAS_SIZE;
        const ctx = exportCanvas.getContext('2d');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

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

        return exportCanvas;
    }, [textElements, designColor, imageLayout]);

    React.useEffect(() => {
        if (canvasRef.current) {
            canvasRef.current.getExportCanvas = getExportCanvas;
        }
    }, [getExportCanvas]);

    // ─── Mouse handlers ──────────────────────────────────────────────────────────

    const handleMouseDown = (e) => {
        if (!canvasRef.current) return;
        const { mx, my } = getCanvasPos(e);

        // 1. Check resize handles FIRST (uses ref so always accurate)
        if (imgSelectedRef.current && imgRef.current) {
            const handleIdx = hitHandle(mx, my, layout);
            if (handleIdx >= 0) {
                setResizing(true);
                setResizeStart({ mx, my, layout: { ...layout }, handleIdx });
                return;
            }
        }

        // 2. Text elements
        for (let i = textElements.length - 1; i >= 0; i--) {
            const el = textElements[i];
            if (el.locked) continue;
            if (isPointInRotatedText(mx, my, el)) {
                setSelectedTextId(el.id);
                setIsDragging(true);
                setDragOffset({ x: mx - el.x, y: my - el.y });
                setImgSelectedSafe(false);
                redraw();
                return;
            }
        }

        // 3. Image body
        if (imgRef.current && hitImage(mx, my, layout)) {
            setImgSelectedSafe(true);
            setImgDragging(true);
            setImgDragOffset({ x: mx - layout.x, y: my - layout.y });
            setSelectedTextId(null);
            // Draw selection immediately (ref is already true)
            redraw();
            return;
        }

        // 4. Clicked empty area — deselect all
        setSelectedTextId(null);
        setImgSelectedSafe(false);
        redraw();
    };

    const handleMouseMove = (e) => {
        if (!canvasRef.current) return;
        const { mx, my } = getCanvasPos(e);

        if (resizing && resizeStart) {
            const { layout: orig, handleIdx, mx: sx, my: sy } = resizeStart;
            const dx = mx - sx;
            const dy = my - sy;
            let nl = { ...orig };

            if (handleIdx === 0) {        // top-left
                nl.x = orig.x + dx; nl.y = orig.y + dy;
                nl.w = orig.w - dx; nl.h = orig.h - dy;
            } else if (handleIdx === 1) { // top-right
                nl.y = orig.y + dy;
                nl.w = orig.w + dx; nl.h = orig.h - dy;
            } else if (handleIdx === 2) { // bottom-left
                nl.x = orig.x + dx;
                nl.w = orig.w - dx; nl.h = orig.h + dy;
            } else {                      // bottom-right
                nl.w = orig.w + dx; nl.h = orig.h + dy;
            }

            if (nl.w > 30 && nl.h > 30) {
                setImageLayout(nl);
                // Redraw immediately with new layout so handles follow cursor
                redraw(nl);
            }
            return;
        }

        if (imgDragging) {
            const nl = {
                ...layout,
                x: mx - imgDragOffset.x,
                y: my - imgDragOffset.y,
            };
            setImageLayout(nl);
            redraw(nl);
            return;
        }

        if (isDragging && selectedTextId) {
            requestAnimationFrame(() => {
                setTextElements(prev => prev.map(el =>
                    el.id === selectedTextId
                        ? { ...el, x: mx - dragOffset.x, y: my - dragOffset.y }
                        : el
                ));
            });
        }
    };

    const handleMouseUp = () => {
        const wasResizing = resizing;
        const wasDragging = imgDragging;

        setIsDragging(false);
        setImgDragging(false);
        setResizing(false);
        setResizeStart(null);

        // Keep selection visible after resize/drag so user can do more operations
        // Only deselect if it was a plain click (no drag/resize happened)
        if (!wasResizing && !wasDragging) {
            setImgSelectedSafe(false);
            redraw();
        } else {
            // Keep selected, redraw to show updated handles position
            redraw();
        }
    };

    const getCursor = () => {
        if (resizing) return 'nwse-resize';
        if (imgDragging || isDragging) return 'grabbing';
        return 'default';
    };

    // ─── Render ──────────────────────────────────────────────────────────────────

    if (!imagePreview) return (
        <div style={{ textAlign: 'center', padding: 60, color: '#bbb' }}>
            <InboxOutlined style={{ fontSize: 48, marginBottom: 12 }} />
            <div>Select a design from the left to start</div>
        </div>
    );

    return (
        <div style={{ background: '#f5f5f5', borderRadius: 8, padding: 12 }}>
            <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: 8, paddingLeft: 10
            }}>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                    Click image to select · Drag to move · Corner handles to resize · Click empty area to deselect
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
                    maxWidth: '100%',
                    borderRadius: 4,
                    border: hasOutOfBounds ? '2px solid #ff4d4f' : '1px solid #d9d9d9',
                    cursor: getCursor(),
                    display: 'block',
                    margin: '0 auto',
                    transition: 'border-color 0.2s',
                }}
            />
        </div>
    );
};

export default DesignCanvas;
