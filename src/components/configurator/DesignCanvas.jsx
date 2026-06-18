import React, { useEffect, useRef, useState, useCallback } from 'react';
import { EyeOutlined, InboxOutlined, WarningOutlined } from '@ant-design/icons';
import { Button, Typography } from 'antd';

const getTextColor = (garmentColor) => (garmentColor === 'black' ? '#ffffff' : '#000000');
const HANDLE_SIZE = 14;
// A3 at 300 DPI: 3508 × 4961 px (portrait)
const CANVAS_W = 3508;
const CANVAS_H = 4961;
// Image loads at max this fraction of canvas so it fits nicely
const DEFAULT_IMG_MAX = 0.5; // 50% of shorter side

const DesignCanvas = ({
    setPreviewOpen, imagePreview, textElements, designColor,
    isDragging, setIsDragging,
    selectedTextId, setSelectedTextId,
    dragOffset, setDragOffset,
    setTextElements, canvasRef,
    onCanvasUpdate,
    imageLayout, setImageLayout,
    isLocked = false,
    colorToggle = null,  // optional JSX rendered left of Preview button
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
        [l.x, l.y],   // 0: top-left
        [l.x + l.w, l.y],   // 1: top-right
        [l.x, l.y + l.h],   // 2: bottom-left
        [l.x + l.w, l.y + l.h],   // 3: bottom-right
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
        canvas.width = CANVAS_W;
        canvas.height = CANVAS_H;

        ctx.fillStyle = designColor === 'black' ? '#000000' : '#ffffff';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

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

    // ─── Image color processing ──────────────────────────────────────────────────
    // white garment → remove white pixels from design (dark/colored content stays)
    // black garment → auto-detect background from corners, flood-fill remove it
    //                 (keeps logo/text regardless of color)
    // normal/null   → no processing, original image as-is
    const processImageForColor = useCallback((img, mode) => {
        if (!mode) return img;

        const offscreen = document.createElement('canvas');
        offscreen.width = img.naturalWidth;
        offscreen.height = img.naturalHeight;
        const ctx = offscreen.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const { width, height } = offscreen;
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        if (mode === 'white') {
            // White garment: remove near-white pixels so dark/colored design shows
            const tolerance = 60;
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2];
                if (r > 255 - tolerance && g > 255 - tolerance && b > 255 - tolerance) {
                    data[i + 3] = 0;
                }
            }

        } else if (mode === 'black') {
            // Black garment: auto-detect background from corners, flood-fill remove it
            // Uses tight squared-distance so near-identical pixels are removed
            // but logo/text (even slightly brighter) stays intact

            const bgTolerance = 64; // squared distance = 8 per channel (very tight)

            // Sample background color from 4 corners and average
            const cornerPositions = [
                0,
                (width - 1) * 4,
                (height - 1) * width * 4,
                ((height - 1) * width + (width - 1)) * 4,
            ];
            let br = 0, bg2 = 0, bb = 0;
            cornerPositions.forEach(p => { br += data[p]; bg2 += data[p + 1]; bb += data[p + 2]; });
            const bgR = br / 4, bgG = bg2 / 4, bgB = bb / 4;

            const colorDistSq = (idx) => {
                const dr = data[idx] - bgR;
                const dg = data[idx + 1] - bgG;
                const db = data[idx + 2] - bgB;
                return dr * dr + dg * dg + db * db;
            };

            // Flood-fill from all 4 corners
            const visited = new Uint8Array(width * height);
            const stack = [
                [0, 0],
                [width - 1, 0],
                [0, height - 1],
                [width - 1, height - 1],
            ];

            while (stack.length > 0) {
                const [x, y] = stack.pop();
                if (x < 0 || x >= width || y < 0 || y >= height) continue;
                const pos = y * width + x;
                if (visited[pos]) continue;
                visited[pos] = 1;
                const idx = pos * 4;
                if (data[idx + 3] < 10) continue; // already transparent
                if (colorDistSq(idx) > bgTolerance) continue; // different from bg — stop
                data[idx + 3] = 0;
                stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
            }
        }

        ctx.putImageData(imageData, 0, 0);
        const result = new Image();
        result.src = offscreen.toDataURL('image/png');
        return result;
    }, []);

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
            const mode = designColor === 'white' ? 'white'
                : designColor === 'black' ? 'black'
                    : null; // normal — no pixel processing, use image as-is

            const processed = mode ? processImageForColor(img, mode) : img;

            const applyProcessed = (processedImg) => {
                imgRef.current = processedImg;
                // Only auto-fit when layout is at the default placeholder (full canvas, x=0, y=0).
                // If the layout was already customised by the user, or restored from saved
                // configurator_state, preserve it — do NOT override with auto-fit.
                const isDefaultLayout = (
                    imageLayout.x === 0 && imageLayout.y === 0 &&
                    imageLayout.w === CANVAS_W && imageLayout.h === CANVAS_H
                );
                if (isDefaultLayout) {
                    // First-time load — auto-fit to 50% of shorter canvas side, centered
                    const maxPx = Math.min(CANVAS_W, CANVAS_H) * DEFAULT_IMG_MAX;
                    let w = img.naturalWidth;
                    let h = img.naturalHeight;
                    const ratio = Math.min(maxPx / w, maxPx / h, 1);
                    w = Math.round(w * ratio);
                    h = Math.round(h * ratio);
                    const newLayout = {
                        x: Math.round((CANVAS_W - w) / 2),
                        y: Math.round((CANVAS_H - h) / 2),
                        w,
                        h,
                    };
                    setImageLayout(newLayout);
                } else {
                    // Layout already customised or restored from state — preserve it.
                    // Redraw directly using the current (preserved) layout from the closure.
                    redraw(layout);
                }
            };

            if (!mode) {
                // normal — image is original, no processing, apply directly
                applyProcessed(processed);
            } else {
                // white/black — processImageForColor returns a new Image, wait for it to load
                processed.onload = () => applyProcessed(processed);
            }
        };
        img.onerror = () => { imgRef.current = null; };
        img.src = imagePreview;
    }, [imagePreview, designColor]);

    // Main redraw trigger
    useEffect(() => {
        redraw();
    }, [imagePreview, textElements, designColor, imageLayout]);

    // ─── Export canvas (no selection border) ─────────────────────────────────────

    const getExportCanvas = useCallback(() => {
        if (!canvasRef.current) return null;
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = CANVAS_W;
        exportCanvas.height = CANVAS_H;
        const ctx = exportCanvas.getContext('2d');

        // Preserve selected tab background color in saved image
        ctx.fillStyle = designColor === 'black' ? '#000000' : '#ffffff';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // No background fill — transparent so garment color shows through in 3D preview
        // Canvas editing background (#2a2a2a or #fff) is display only, not exported

        if (imgRef.current) {
            ctx.drawImage(imgRef.current, layout.x, layout.y, layout.w, layout.h);
        }

        textElements.forEach(el => {
            ctx.save();
            // Center text horizontally for export
            ctx.translate(CANVAS_W / 2, el.y);
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
        if (isLocked) return;
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
        if (isLocked) return;
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
        if (isLocked) return 'not-allowed';
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
                {isLocked ? (
                    <Typography.Text type="warning" style={{ fontSize: 12 }}>
                        🔒 This design is locked. Preview is available but editing is disabled.
                    </Typography.Text>
                ) : (
                    <span>{colorToggle}</span>
                )}
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
                    border: hasOutOfBounds
                        ? '2px solid #ff4d4f'
                        : isLocked
                            ? '2px solid #faad14'
                            : '1px solid #d9d9d9',
                    cursor: getCursor(),
                    display: 'block',
                    margin: '0 auto',
                    transition: 'border-color 0.2s',
                    opacity: isLocked ? 0.85 : 1,
                }}
            />
        </div>
    );
};

export default DesignCanvas;
