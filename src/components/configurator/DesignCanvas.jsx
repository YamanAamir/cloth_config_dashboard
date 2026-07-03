import { useEffect, useRef, useState, useCallback, memo } from 'react';
import { EyeOutlined, InboxOutlined, WarningOutlined } from '@ant-design/icons';
import { Button, Typography } from 'antd';

const getTextColor = (garmentColor) => (garmentColor === 'black' ? '#ffffff' : '#000000');
const HANDLE_SIZE = 14;
const CANVAS_W = 3508;
const CANVAS_H = 4961;

// ─── helpers (pure, no state) ────────────────────────────────────────────────

const getCorners = (l) => [
    [l.x, l.y],
    [l.x + l.w, l.y],
    [l.x, l.y + l.h],
    [l.x + l.w, l.y + l.h],
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

const VIRGIN_LAYOUT = { x: 0, y: 0, w: 3508, h: 4961 };

const isVirginLayout = (l) =>
    l.x === 0 && l.y === 0 && l.w >= 3508 - 1 && l.h >= 4961 - 1;

// ─── component ───────────────────────────────────────────────────────────────

const DesignCanvas = ({
    setPreviewOpen, imagePreviewWhite, imagePreviewBlack, textElements, designColor,
    isDragging, loading, setIsDragging,
    selectedTextId, setSelectedTextId,
    dragOffset, setDragOffset,
    setTextElements, canvasRef,
    onCanvasUpdate,
    imageLayout, setImageLayout,
    imageLayouts,               // full { white, black } — used for auto-fit decisions
    setImageLayoutForColor,     // (color, layout) => void — sets a specific color's layout from parent
    isLocked = false,
    colorToggle = null,
}) => {
    const [hasOutOfBounds, setHasOutOfBounds] = useState(false);

    // Interaction state — kept in refs to avoid triggering re-renders during drag/resize
    const imgRef = useRef(null);
    const imgSelectedRef = useRef(false);
    const imgDraggingRef = useRef(false);
    const resizingRef = useRef(false);
    const imgDragOffset = useRef({ x: 0, y: 0 });
    const resizeStart = useRef(null);

    // Cache: one processed HTMLImageElement per color, keyed by URL
    // { white: { url, img }, black: { url, img } }
    const processedCacheRef = useRef({ white: null, black: null });

    // ─── process image for garment color ─────────────────────────────────────

    const processImageForColor = useCallback((img, mode) => {
        // Black mode: file_path_2 is already the dark-garment version — return as-is
        if (mode === 'black') return img;

        const offscreen = document.createElement('canvas');
        offscreen.width = img.naturalWidth;
        offscreen.height = img.naturalHeight;
        const ctx = offscreen.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const { width, height } = offscreen;
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        if (mode === 'white') {
            // Remove near-white background pixels so design floats on light garment
            const tol = 60;
            for (let i = 0; i < data.length; i += 4) {
                if (
                    data[i] > 255 - tol &&
                    data[i + 1] > 255 - tol &&
                    data[i + 2] > 255 - tol
                ) {
                    data[i + 3] = 0;
                }
            }
        }

        ctx.putImageData(imageData, 0, 0);
        const result = new Image();
        result.src = offscreen.toDataURL('image/png');
        return result;
    }, []);

    // ─── Load a single color's image into cache ───────────────────────────────

    const loadColorImage = useCallback((url, colorKey, onReady) => {
        if (!url) {
            processedCacheRef.current[colorKey] = null;
            onReady?.();
            return;
        }
        // Already cached for this exact URL — skip fetch
        if (processedCacheRef.current[colorKey]?.url === url) {
            onReady?.();
            return;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const processed = processImageForColor(img, colorKey);

            const store = (finalImg) => {
                processedCacheRef.current[colorKey] = { url, img: finalImg, naturalW: img.naturalWidth, naturalH: img.naturalHeight };
                onReady?.(img); // pass original for dimension/auto-fit
            };

            if (processed === img) {
                // black mode — returned as-is, already loaded
                store(img);
            } else {
                processed.onload = () => store(processed);
            }
        };
        img.onerror = () => {
            processedCacheRef.current[colorKey] = null;
            onReady?.();
        };
        img.src = url;
    }, [processImageForColor]);

    // ─── Load white image when its URL changes ────────────────────────────────

    useEffect(() => {
        if (!imagePreviewWhite) {
            processedCacheRef.current.white = null;
            if (designColor === 'white') {
                imgRef.current = null;
                setImageLayout(prev => ({ ...prev }));
            }
            return;
        }
        loadColorImage(imagePreviewWhite, 'white', (originalImg) => {
            if (designColor === 'white') {
                imgRef.current = processedCacheRef.current.white?.img || null;
            }
            // Auto-fit white's slot if virgin — use color-specific setter
            const currentLayout = imageLayouts?.white || imageLayout;
            if (originalImg && isVirginLayout(currentLayout)) {
                const targetW = CANVAS_W * 0.95;
                const ratio = targetW / originalImg.naturalWidth;
                const fitted = {
                    x: Math.round((CANVAS_W - targetW) / 2),
                    y: Math.round((CANVAS_H - originalImg.naturalHeight * ratio) / 2),
                    w: Math.round(targetW),
                    h: Math.round(originalImg.naturalHeight * ratio),
                };
                // setImageLayout sets current designColor's layout — only call if white is active
                // Otherwise call setImageLayoutForColor to set white's slot directly
                if (designColor === 'white') {
                    setImageLayout(fitted);
                } else {
                    setImageLayoutForColor?.('white', fitted);
                }
            } else if (designColor === 'white') {
                setImageLayout(prev => ({ ...prev }));
            }
        });
    }, [imagePreviewWhite]); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Load black image when its URL changes ────────────────────────────────

    useEffect(() => {
        if (!imagePreviewBlack) {
            processedCacheRef.current.black = null;
            if (designColor === 'black') {
                imgRef.current = null;
                setImageLayout(prev => ({ ...prev }));
            }
            return;
        }
        loadColorImage(imagePreviewBlack, 'black', (originalImg) => {
            if (designColor === 'black') {
                imgRef.current = processedCacheRef.current.black?.img || null;
            }
            // Auto-fit black's slot if virgin
            const currentLayout = imageLayouts?.black || imageLayout;
            if (originalImg && isVirginLayout(currentLayout)) {
                const targetW = CANVAS_W * 0.95;
                const ratio = targetW / originalImg.naturalWidth;
                const fitted = {
                    x: Math.round((CANVAS_W - targetW) / 2),
                    y: Math.round((CANVAS_H - originalImg.naturalHeight * ratio) / 2),
                    w: Math.round(targetW),
                    h: Math.round(originalImg.naturalHeight * ratio),
                };
                if (designColor === 'black') {
                    setImageLayout(fitted);
                } else {
                    setImageLayoutForColor?.('black', fitted);
                }
            } else if (designColor === 'black') {
                setImageLayout(prev => ({ ...prev }));
            }
        });
    }, [imagePreviewBlack]); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Switch active image instantly when color changes ────────────────────

    useEffect(() => {
        const cached = processedCacheRef.current[designColor];
        imgRef.current = cached?.img || null;
        setImageLayout(prev => ({ ...prev })); // trigger redraw — layout already correct for this color
    }, [designColor]); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── SINGLE redraw effect (only source of truth) ──────────────────────────

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        canvas.width = CANVAS_W;
        canvas.height = CANVAS_H;

        // Background
        ctx.fillStyle = designColor === 'black' ? '#000000' : '#ffffff';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Image
        const l = imageLayout;
        if (imgRef.current && l) {
            ctx.drawImage(imgRef.current, l.x, l.y, l.w, l.h);

            // Always-visible boundary box around image
            ctx.save();
            ctx.strokeStyle = designColor === 'black' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)';
            ctx.lineWidth = Math.max(2, CANVAS_W * 0.0006);
            ctx.setLineDash([Math.round(CANVAS_W * 0.006), Math.round(CANVAS_W * 0.003)]);
            ctx.strokeRect(l.x, l.y, l.w, l.h);
            ctx.setLineDash([]);
            ctx.restore();
        }

        // Text (centered horizontally on export)
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

        // Selection overlay
        if (imgSelectedRef.current && imgRef.current && l) {
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
        }

        // Out-of-bounds check
        const oob = textElements.some(el => {
            ctx.font = `${el.fontSize}px ${el.fontFamily}`;
            const tw = ctx.measureText(el.text).width / 2;
            const th = el.fontSize / 2;
            return el.x - tw < 0 || el.x + tw > CANVAS_W || el.y - th < 0 || el.y + th > CANVAS_H;
        });
        setHasOutOfBounds(oob);

        if (onCanvasUpdate) setTimeout(() => onCanvasUpdate(canvas), 50);

    }, [imageLayout, textElements, designColor, onCanvasUpdate]);

    // ─── Export canvas ────────────────────────────────────────────────────────

    const getExportCanvas = useCallback(() => {
        if (!canvasRef.current) return null;

        // ── Diffuse canvas: full design with background ──
        const exp = document.createElement('canvas');
        exp.width = CANVAS_W;
        exp.height = CANVAS_H;
        const ctx = exp.getContext('2d');

        ctx.fillStyle = designColor === 'black' ? '#000000' : '#ffffff';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        if (imgRef.current && imageLayout) {
            ctx.drawImage(imgRef.current, imageLayout.x, imageLayout.y, imageLayout.w, imageLayout.h);
        }

        textElements.forEach(el => {
            ctx.save();
            ctx.translate(CANVAS_W / 2, el.y);
            ctx.rotate((el.rotation * Math.PI) / 180);
            ctx.font = `${el.fontSize}px ${el.fontFamily}`;
            ctx.fillStyle = getTextColor(designColor);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(el.text, 0, 0);
            ctx.restore();
        });

        // ── Opacity canvas: white = print area, black = transparent ──
        const opacityCanvas = document.createElement('canvas');
        opacityCanvas.width = CANVAS_W * 2;
        opacityCanvas.height = CANVAS_H * 2;
        const octx = opacityCanvas.getContext('2d');
        octx.clearRect(0, 0, CANVAS_W * 2, CANVAS_H * 2);

        if (imgRef.current && imageLayout) {
            octx.drawImage(imgRef.current, imageLayout.x, imageLayout.y, imageLayout.w, imageLayout.h);
        }

        textElements.forEach(el => {
            octx.save();
            octx.translate(CANVAS_W / 2, el.y);
            octx.rotate((el.rotation * Math.PI) / 180);
            octx.font = `${el.fontSize}px ${el.fontFamily}`;
            octx.fillStyle = '#ffffff';
            octx.textAlign = 'center';
            octx.textBaseline = 'middle';
            octx.fillText(el.text, 0, 0);
            octx.restore();
        });

        // Convert to black/white mask (white = visible, black = transparent)
        const imgData = octx.getImageData(0, 0, CANVAS_W * 2, CANVAS_H * 2);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
            const a = d[i + 3];
            const brightness = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            const bw = (a > 10 && brightness < 240) ? 255 : 0;
            d[i] = d[i + 1] = d[i + 2] = bw;
            d[i + 3] = 255;
        }
        octx.putImageData(imgData, 0, 0);

        // Attach opacityCanvas so PreviewModal can access both
        exp.opacityCanvas = opacityCanvas;

        return exp;
    }, [textElements, designColor, imageLayout]);

    useEffect(() => {
        if (canvasRef.current) canvasRef.current.getExportCanvas = getExportCanvas;
    }, [getExportCanvas]);

    // ─── Canvas position helper ───────────────────────────────────────────────

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
        const dx = mx - el.x, dy = my - el.y;
        const rx = dx * Math.cos(angle) - dy * Math.sin(angle);
        const ry = dx * Math.sin(angle) + dy * Math.cos(angle);
        const ctx = canvasRef.current.getContext('2d');
        ctx.font = `${el.fontSize}px ${el.fontFamily}`;
        const tw = ctx.measureText(el.text).width / 2;
        const th = el.fontSize / 2;
        return rx >= -tw && rx <= tw && ry >= -th && ry <= th;
    };

    // ─── Mouse handlers ───────────────────────────────────────────────────────
    // All state updates go through setImageLayout / setTextElements / setSelectedTextId.
    // The redraw useEffect reacts automatically — NO manual redraw() calls here.

    const handleMouseDown = (e) => {
        if (isLocked || !canvasRef.current) return;
        const { mx, my } = getCanvasPos(e);

        // 1. Resize handles
        if (imgSelectedRef.current && imgRef.current && imageLayout) {
            const idx = hitHandle(mx, my, imageLayout);
            if (idx >= 0) {
                resizingRef.current = true;
                resizeStart.current = { mx, my, layout: { ...imageLayout }, handleIdx: idx };
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
                imgSelectedRef.current = false;
                setImageLayout({ ...imageLayout }); // trigger redraw
                return;
            }
        }

        // 3. Image body
        if (imgRef.current && imageLayout && hitImage(mx, my, imageLayout)) {
            imgSelectedRef.current = true;
            imgDraggingRef.current = true;
            imgDragOffset.current = { x: mx - imageLayout.x, y: my - imageLayout.y };
            setSelectedTextId(null);
            setImageLayout({ ...imageLayout }); // trigger redraw to show selection
            return;
        }

        // 4. Deselect all
        imgSelectedRef.current = false;
        setSelectedTextId(null);
        setImageLayout({ ...imageLayout }); // trigger redraw
    };

    const handleMouseMove = (e) => {
        if (isLocked || !canvasRef.current) return;
        const { mx, my } = getCanvasPos(e);

        if (resizingRef.current && resizeStart.current) {
            const { layout: orig, handleIdx, mx: sx, my: sy } = resizeStart.current;
            const dx = mx - sx, dy = my - sy;
            let nl = { ...orig };
            if (handleIdx === 0) { nl.x = orig.x + dx; nl.y = orig.y + dy; nl.w = orig.w - dx; nl.h = orig.h - dy; }
            else if (handleIdx === 1) { nl.y = orig.y + dy; nl.w = orig.w + dx; nl.h = orig.h - dy; }
            else if (handleIdx === 2) { nl.x = orig.x + dx; nl.w = orig.w - dx; nl.h = orig.h + dy; }
            else { nl.w = orig.w + dx; nl.h = orig.h + dy; }
            if (nl.w > 30 && nl.h > 30) setImageLayout(nl); // → triggers redraw
            return;
        }

        if (imgDraggingRef.current) {
            setImageLayout({
                ...imageLayout,
                x: mx - imgDragOffset.current.x,
                y: my - imgDragOffset.current.y,
            });
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
        resizingRef.current = false;
        imgDraggingRef.current = false;
        resizeStart.current = null;
        setIsDragging(false);
    };

    const getCursor = () => {
        if (isLocked) return 'not-allowed';
        if (resizingRef.current) return 'nwse-resize';
        if (imgDraggingRef.current || isDragging) return 'grabbing';
        return 'default';
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    if (!imagePreviewWhite && !imagePreviewBlack) return (
        <div style={{ textAlign: 'center', padding: 60, color: '#bbb' }}>
            <InboxOutlined style={{ fontSize: 48, marginBottom: 12 }} />
            <div>Select a design from the left to start</div>
        </div>
    );

    return (
        <div style={{ background: '#f5f5f5', borderRadius: 8, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingLeft: 10 }}>
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
                <Button type="default" icon={<EyeOutlined />} disabled={!imagePreviewWhite && !imagePreviewBlack} onClick={() => setPreviewOpen(true)}>
                    {loading ? "Gemmer..." : "Preview in 3D"}
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
                    border: hasOutOfBounds ? '2px solid #ff4d4f' : isLocked ? '2px solid #faad14' : '1px solid #d9d9d9',
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
